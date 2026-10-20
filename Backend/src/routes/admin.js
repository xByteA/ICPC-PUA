import { Router } from 'express';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { createCheckInToken } from '../utils/checkIn.js';
import { slugify, validateEventInput } from '../utils/validation.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/events', async (req, res) => {
  const events = await Event.find().sort({ startsAt: -1 });
  const stats = await Registration.aggregate([
    { $match: { event: { $in: events.map((event) => event._id) } } },
    {
      $group: {
        _id: '$event',
        attendanceCount: { $sum: { $cond: [{ $eq: [{ $type: '$checkedInAt' }, 'date'] }, 1, 0] } },
        totalPointsAwarded: { $sum: { $ifNull: ['$pointsAwarded', 0] } },
      },
    },
  ]);
  const statsByEvent = new Map(stats.map((item) => [item._id.toString(), item]));
  return res.json({
    events: events.map((event) => {
      const eventStats = statsByEvent.get(event.id);
      return {
        ...event.toJSON(),
        attendanceCount: eventStats?.attendanceCount || 0,
        totalPointsAwarded: eventStats?.totalPointsAwarded || 0,
      };
    }),
  });
});

router.post('/events', async (req, res) => {
  const data = validateEventInput(req.body);
  if (data.status === undefined) data.status = 'draft';
  data.slug = `${slugify(data.title) || 'event'}-${randomBytes(3).toString('hex')}`;
  data.createdBy = req.user.id;
  const event = await Event.create(data);
  return res.status(201).json({ event });
});

router.put('/events/:eventId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(404).json({ error: { message: 'Event not found.' } });
  const existing = await Event.findById(req.params.eventId);
  if (!existing) return res.status(404).json({ error: { message: 'Event not found.' } });
  if (existing.status === 'deleted') return res.status(409).json({ error: { message: 'Deleted events cannot be edited.' } });
  const data = validateEventInput(req.body, { partial: true });
  const startsAt = data.startsAt ?? existing.startsAt;
  const endsAt = data.endsAt ?? existing.endsAt;
  const opensAt = 'checkInOpensAt' in data
    ? data.checkInOpensAt ?? startsAt
    : existing.checkInOpensAt ?? startsAt;
  const closesAt = 'checkInClosesAt' in data
    ? data.checkInClosesAt ?? endsAt
    : existing.checkInClosesAt ?? endsAt;
  if (closesAt <= opensAt) {
    return res.status(400).json({ error: { message: 'Check-in must close after it opens.' } });
  }
  if ('title' in data) data.slug = `${slugify(data.title) || 'event'}-${randomBytes(3).toString('hex')}`;
  const event = await Event.findOneAndUpdate(
    { _id: req.params.eventId, status: { $ne: 'deleted' } },
    data,
    { new: true, runValidators: true },
  );
  if (!event) return res.status(409).json({ error: { message: 'Deleted events cannot be edited.' } });
  return res.json({ event });
});

router.delete('/events/:eventId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(404).json({ error: { message: 'Event not found.' } });
  const confirmationName = req.body?.confirmationName;
  if (typeof confirmationName !== 'string' || !confirmationName) {
    return res.status(400).json({ error: { message: 'Type the exact event name to confirm deletion.' } });
  }
  const event = await Event.findById(req.params.eventId).select('title status');
  if (!event) return res.status(404).json({ error: { message: 'Event not found.' } });
  if (event.status === 'deleted') return res.status(409).json({ error: { message: 'This event has already been deleted.' } });
  if (confirmationName !== event.title) {
    return res.status(400).json({ error: { message: 'The event name does not match.' } });
  }

  const archived = await Event.findOneAndUpdate(
    { _id: event.id, title: confirmationName, status: { $ne: 'deleted' } },
    { $set: { status: 'deleted', deletedAt: new Date(), checkInTokenHash: null } },
    { new: true },
  );
  if (!archived) return res.status(409).json({ error: { message: 'The event changed before it could be deleted. Refresh and try again.' } });
  return res.json({ message: 'Event deleted. Attendance and points history have been preserved.' });
});

router.post('/events/:eventId/check-in-qr', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(404).json({ error: { message: 'Event not found.' } });
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ error: { message: 'Event not found.' } });
  if (event.status !== 'published') {
    return res.status(409).json({ error: { message: 'Publish the event before generating a check-in QR code.' } });
  }

  const { token, tokenHash } = createCheckInToken();
  const updated = await Event.updateOne(
    { _id: event.id, status: 'published' },
    { $set: { checkInTokenHash: tokenHash } },
  );
  if (!updated.modifiedCount) {
    return res.status(409).json({ error: { message: 'The event must be published to generate a check-in QR code.' } });
  }
  const checkInUrl = new URL(`/check-in/${event.id}`, config.clientOrigin);
  checkInUrl.searchParams.set('token', token);
  const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl.toString(), {
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 1024,
  });
  res.set('Cache-Control', 'no-store');
  return res.json({
    checkInUrl: checkInUrl.toString(),
    qrCodeDataUrl,
    event: { id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt },
    checkInWindow: {
      opensAt: event.checkInOpensAt || event.startsAt,
      closesAt: event.checkInClosesAt || event.endsAt,
    },
  });
});

router.get('/events/:eventId/registrations', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(404).json({ error: { message: 'Event not found.' } });
  const event = await Event.findById(req.params.eventId).select('title');
  if (!event) return res.status(404).json({ error: { message: 'Event not found.' } });
  const registrations = await Registration.find({ event: event.id }).populate('user', 'name email').sort({ createdAt: 1 });
  return res.json({
    registrations: registrations.map((item) => ({
      id: item.id,
      user: item.user,
      registeredAt: item.createdAt,
      checkedInAt: item.checkedInAt,
      pointsAwarded: item.pointsAwarded,
    })),
  });
});

export default router;
