import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validatePasswordChangeInput, validateStudentId } from '../utils/validation.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const passwordChangeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

function issueToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '7d' });
}

function presentUser(user) {
  return { id: user.id, name: user.name, email: user.email, studentId: user.studentId || null, role: user.role };
}

router.post('/register', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: { message: 'Provide account details as a JSON object.' } });
  }
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    return res.status(400).json({ error: { message: 'Enter a name of 1–80 characters.' } });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: { message: 'Enter a valid email address.' } });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: { message: 'Password must be at least 8 characters.' } });
  }
  let studentId;
  try {
    studentId = validateStudentId(req.body.studentId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: { message: error.message } });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), studentId, passwordHash });
    return res.status(201).json({ token: issueToken(user), user: presentUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      const message = error.keyPattern?.studentId
        ? 'An account with this student ID already exists.'
        : 'An account with this email already exists.';
      return res.status(409).json({ error: { message } });
    }
    throw error;
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: { message: 'Email or password is incorrect.' } });
  }
  return res.json({ token: issueToken(user), user: presentUser(user) });
});

router.put('/password', requireAuth, passwordChangeLimiter, async (req, res) => {
  const { currentPassword, newPassword } = validatePasswordChangeInput(req.body);
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: { message: 'Your current password is incorrect.' } });
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return res.status(400).json({ error: { message: 'Choose a new password different from your current password.' } });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await User.findOneAndUpdate(
    { _id: user.id, passwordHash: user.passwordHash },
    { $set: { passwordHash } },
    { new: true },
  );
  if (!updated) {
    return res.status(409).json({ error: { message: 'Your password changed before this request completed. Sign in again and retry.' } });
  }
  return res.json({ message: 'Your password has been updated.' });
});

router.put('/student-id', requireAuth, async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some((key) => key !== 'studentId')) {
    return res.status(400).json({ error: { message: 'Provide only a student ID.' } });
  }

  let studentId;
  try {
    studentId = validateStudentId(req.body.studentId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: { message: error.message } });
  }

  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, studentId: { $exists: false } },
      { $set: { studentId } },
      { new: true, runValidators: true },
    );
    if (!user) {
      return res.status(409).json({ error: { message: 'A student ID is already set for this account.' } });
    }
    return res.json({ user: presentUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: { message: 'An account with this student ID already exists.' } });
    }
    throw error;
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: presentUser(req.user) }));

export default router;
