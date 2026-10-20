import { Router } from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { hashCheckInToken, getCheckInWindow, isWithinCheckInWindow } from '../utils/checkIn.js';
import { rankLeaderboard } from '../utils/leaderboard.js';

const router = Router();

async function getLeaderboard() {
  const entries = await Registration.aggregate([
    { $match: { checkedInAt: { $type: 'date' } } },
    {
      $group: {
        _id: '$user',
        points: { $sum: '$pointsAwarded' },
        eventsAttended: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.role': 'user' } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        name: '$user.name',
        points: 1,
        eventsAttended: 1,
      },
    },
    { $sort: { points: -1, eventsAttended: -1, name: 1, userId: 1 } },
  ]);
  return rankLeaderboard(entries);
}

router.get('/', async (req, res) => {
  const now = new Date();
  const query = { status: 'published' };
  if (req.query.status === 'past') query.endsAt = { $lt: now };
  else query.endsAt = { $gte: now };
  if (typeof req.query.category === 'string' && req.query.category.trim()) {
    query.category = req.query.category.trim();
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const escaped = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [{ title: new RegExp(escaped, 'i') }, { description: new RegExp(escaped, 'i') }, { category: new RegExp(escaped, 'i') }];
  }
  const events = await Event.find(query).sort({ startsAt: req.query.status === 'past' ? -1 : 1 }).limit(100);
  return res.json({ events });
});

router.get('/leaderboard', async (req, res) => {
  const leaderboard = (await getLeaderboard()).slice(0, 100);
  return res.json({ leaderboard });
});

router.get('/leaderboard/me', requireAuth, async (req, res) => {
  const leaderboard = await getLeaderboard();
  const current = leaderboard.find((entry) => entry.userId.toString() === req.user.id);
  const history = await Registration.find({ user: req.user.id, checkedInAt: { $ne: null } })
    .populate('event', 'title slug category startsAt location')
    .sort({ checkedInAt: -1 });

  return res.json({
    standing: current
      ? { rank: current.rank, points: current.points, eventsAttended: current.eventsAttended }
      : { rank: null, points: 0, eventsAttended: 0 },
    attendanceHistory: history.filter((item) => item.event).map((item) => ({
      event: item.event,
      checkedInAt: item.checkedInAt,
      pointsAwarded: item.pointsAwarded,
    })),
  });
});

router.get('/:userId/profile', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(404).json({ error: { message: 'Member profile not found.' } });
  }
  const user = await User.findOne({ _id: req.params.userId, role: 'user' }).select('name createdAt');
  if (!user) return res.status(404).json({ error: { message: 'Member profile not found.' } });

  const leaderboard = await getLeaderboard();
  const standing = leaderboard.find((entry) => entry.userId.toString() === user.id);
  const history = await Registration.find({ user: user.id, checkedInAt: { $ne: null } })
    .populate('event', 'title slug category startsAt location')
    .sort({ checkedInAt: -1 });

  return res.json({
    profile: {
      id: user.id,
      name: user.name,
      joinedAt: user.createdAt,
      standing: standing
        ? { rank: standing.rank, points: standing.points, eventsAttended: standing.eventsAttended }
        : { rank: null, points: 0, eventsAttended: 0 },
      attendanceHistory: history.filter((item) => item.event).map((item) => ({
        event: item.event,
        checkedInAt: item.checkedInAt,
        pointsAwarded: item.pointsAwarded,
      })),
    },
  });
});

router.get('/my', requireAuth, async (req, res) => {
  const registrations = await Registration.find({ user: req.user.id })
    .populate('event')
    .sort({ createdAt: -1 });
  const events = registrations.filter((registration) => registration.event).map((registration) => ({
    registrationId: registration.id,
    event: registration.event,
    checkedInAt: registration.checkedInAt,
    pointsAwarded: registration.pointsAwarded,
  }));
  return res.json({ events });
});

router.get('/:eventId/check-in', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) {
    return res.status(404).json({ error: { message: 'This event check-in link is not valid.' } });
  }
  const tokenHash = hashCheckInToken(req.query.token);
  const event = tokenHash
    ? await Event.findOne({ _id: req.params.eventId, status: 'published', checkInTokenHash: tokenHash })
    : null;
  if (!event) return res.status(404).json({ error: { message: 'This event check-in link is invalid or has expired.' } });

  const registration = await Registration.findOne({ user: req.user.id, event: event.id });
  if (!registration) return res.status(403).json({ error: { message: 'You must register for this event before checking in.' } });

  const { opensAt, closesAt } = getCheckInWindow(event);
  res.set('Cache-Control', 'no-store');
  return res.json({
    event: { id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, location: event.location, category: event.category },
    attendance: { checkedInAt: registration.checkedInAt, pointsAwarded: registration.pointsAwarded },
    checkInWindow: { opensAt, closesAt, isOpen: isWithinCheckInWindow(event) },
  });
});

router.post('/:eventId/check-in', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) {
    return res.status(404).json({ error: { message: 'This event check-in link is not valid.' } });
  }
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const tokenHash = hashCheckInToken(body.token);
  const event = tokenHash
    ? await Event.findOne({ _id: req.params.eventId, status: 'published', checkInTokenHash: tokenHash })
    : null;
  if (!event) return res.status(404).json({ error: { message: 'This event check-in link is invalid or has expired.' } });
  if (!isWithinCheckInWindow(event)) {
    return res.status(409).json({ error: { message: 'Check-in is outside this event’s check-in window.' } });
  }

  const registration = await Registration.findOneAndUpdate(
    { user: req.user.id, event: event.id, checkedInAt: null },
    { $set: { checkedInAt: new Date(), pointsAwarded: event.attendancePoints } },
    { new: true },
  );
  if (!registration) {
    const existing = await Registration.findOne({ user: req.user.id, event: event.id });
    if (!existing) return res.status(403).json({ error: { message: 'You must register for this event before checking in.' } });
    return res.status(409).json({
      error: { message: 'You have already checked in to this event.' },
      attendance: { checkedInAt: existing.checkedInAt, pointsAwarded: existing.pointsAwarded },
    });
  }
  return res.json({
    message: 'Check-in successful.',
    attendance: { checkedInAt: registration.checkedInAt, pointsAwarded: registration.pointsAwarded },
  });
});

router.get('/:eventId', async (req, res) => {
  const filter = mongoose.isValidObjectId(req.params.eventId)
    ? { _id: req.params.eventId, status: 'published' }
    : { slug: req.params.eventId, status: 'published' };
  const event = await Event.findOne(filter);
  if (!event) return res.status(404).json({ error: { message: 'Event not found.' } });
  return res.json({ event });
});

router.post('/:eventId/registrations', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) {
    return res.status(404).json({ error: { message: 'Event not found.' } });
  }
  const now = new Date();
  const event = await Event.findOne({
    _id: req.params.eventId,
    status: 'published',
    startsAt: { $gt: now },
    $or: [{ registrationDeadline: null }, { registrationDeadline: { $gt: now } }],
  });
  if (!event) return res.status(409).json({ error: { message: 'Registration is not available for this event.' } });
  if (await Registration.exists({ user: req.user.id, event: event.id })) {
    return res.status(409).json({ error: { message: 'You are already registered for this event.' } });
  }

  const availabilityFilter = { _id: event.id, status: 'published' };
  if (event.capacity !== null) availabilityFilter.$expr = { $lt: ['$registrationCount', '$capacity'] };
  const reserved = await Event.updateOne(availabilityFilter, { $inc: { registrationCount: 1 } });
  if (!reserved.modifiedCount) return res.status(409).json({ error: { message: 'This event is full or no longer available.' } });

  try {
    const registration = await Registration.create({
      user: req.user.id,
      event: event.id,
    });
    return res.status(201).json({ registration });
  } catch (error) {
    await Event.updateOne({ _id: event.id, registrationCount: { $gt: 0 } }, { $inc: { registrationCount: -1 } });
    if (error.code === 11000) return res.status(409).json({ error: { message: 'You are already registered for this event.' } });
    throw error;
  }
});

router.delete('/:eventId/registrations', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) {
    return res.status(404).json({ error: { message: 'Registration not found.' } });
  }
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ error: { message: 'Event not found.' } });
  if (event.startsAt <= new Date()) return res.status(409).json({ error: { message: 'Registration can no longer be cancelled.' } });
  const registration = await Registration.findOneAndDelete({ event: event.id, user: req.user.id, checkedInAt: null });
  if (!registration) {
    const existing = await Registration.exists({ event: event.id, user: req.user.id });
    if (existing) return res.status(409).json({ error: { message: 'A checked-in registration can no longer be cancelled.' } });
    return res.status(404).json({ error: { message: 'You are not registered for this event.' } });
  }
  await Event.updateOne({ _id: event.id, registrationCount: { $gt: 0 } }, { $inc: { registrationCount: -1 } });
  return res.json({ message: 'Registration cancelled.' });
});

export default router;
