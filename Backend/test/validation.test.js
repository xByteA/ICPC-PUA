import test from 'node:test';
import assert from 'node:assert/strict';
import Event from '../src/models/Event.js';
import { slugify, validateEventInput, validatePasswordChangeInput, validateStudentId } from '../src/utils/validation.js';

test('event attendance points default to zero', () => {
  const event = new Event();
  assert.equal(event.attendancePoints, 0);
});

test('event input accepts valid event fields and normalizes them', () => {
  const result = validateEventInput({
    title: '  Contest Night ',
    description: 'Solve problems together.',
    category: 'Contest',
    startsAt: '2027-01-01T10:00:00.000Z',
    endsAt: '2027-01-01T12:00:00.000Z',
    mode: 'offline',
    location: 'Room 12',
    capacity: '30',
  });
  assert.equal(result.title, 'Contest Night');
  assert.equal(result.capacity, 30);
  assert.equal(result.startsAt instanceof Date, true);
});

test('event input rejects invalid date ranges, event mode, and unknown fields', () => {
  const valid = {
    title: 'Contest Night',
    description: 'Details',
    category: 'Contest',
    startsAt: '2027-01-01T12:00:00Z',
    endsAt: '2027-01-01T10:00:00Z',
    mode: 'online',
  };
  assert.throws(() => validateEventInput(valid), /endsAt must be after startsAt/);
  assert.throws(() => validateEventInput({ ...valid, endsAt: '2027-01-01T14:00:00Z', mode: 'unknown' }), /mode must be online or offline/);
  assert.throws(() => validateEventInput({ ...valid, endsAt: '2027-01-01T14:00:00Z', isAdmin: true }), /Unexpected field/);
});

test('offline events require a location', () => {
  assert.throws(() => validateEventInput({
    title: 'Contest Night',
    description: 'Details',
    category: 'Contest',
    startsAt: '2027-01-01T10:00:00Z',
    endsAt: '2027-01-01T12:00:00Z',
    mode: 'offline',
  }), /location is required/);
});

test('event input rejects malformed bodies and registration deadlines after the start', () => {
  assert.throws(() => validateEventInput(null), /must be a JSON object/);
  assert.throws(() => validateEventInput([]), /must be a JSON object/);
  assert.throws(() => validateEventInput({
    title: 'Contest Night',
    description: 'Details',
    category: 'Contest',
    startsAt: '2027-01-01T10:00:00Z',
    endsAt: '2027-01-01T12:00:00Z',
    registrationDeadline: '2027-01-01T10:00:00Z',
    mode: 'online',
  }), /registrationDeadline must be before startsAt/);
});

test('event input allows an optional registration deadline and default check-in window', () => {
  const result = validateEventInput({
    title: 'Contest Night',
    description: 'Details',
    category: 'Contest',
    startsAt: '2027-01-01T10:00:00Z',
    endsAt: '2027-01-01T12:00:00Z',
    mode: 'online',
  });
  assert.equal('registrationDeadline' in result, false);
  assert.equal('checkInOpensAt' in result, false);
  assert.equal('checkInClosesAt' in result, false);
});

test('event input accepts attendance points and custom check-in windows', () => {
  const result = validateEventInput({
    title: 'Contest Night',
    description: 'Details',
    category: 'Contest',
    startsAt: '2027-01-01T10:00:00Z',
    endsAt: '2027-01-01T12:00:00Z',
    checkInOpensAt: '2027-01-01T09:30:00Z',
    checkInClosesAt: '2027-01-01T10:30:00Z',
    attendancePoints: '25.5',
    mode: 'offline',
    location: 'Room 12',
  });
  assert.equal(result.attendancePoints, 25.5);
  assert.equal(result.checkInOpensAt.toISOString(), '2027-01-01T09:30:00.000Z');
  assert.equal(result.checkInClosesAt.toISOString(), '2027-01-01T10:30:00.000Z');
});

test('event input rejects invalid attendance points and check-in windows', () => {
  const event = {
    title: 'Contest Night',
    description: 'Details',
    category: 'Contest',
    startsAt: '2027-01-01T10:00:00Z',
    endsAt: '2027-01-01T12:00:00Z',
    mode: 'online',
  };
  assert.throws(() => validateEventInput({ ...event, attendancePoints: -1 }), /attendancePoints must be/);
  assert.throws(() => validateEventInput({
    ...event,
    checkInOpensAt: '2027-01-01T11:00:00Z',
    checkInClosesAt: '2027-01-01T10:00:00Z',
  }), /checkInClosesAt must be after checkInOpensAt/);
});

test('student IDs are trimmed and restricted to 4–20 digits', () => {
  assert.equal(validateStudentId(' 20251234 '), '20251234');
  assert.throws(() => validateStudentId('123'), /4–20 digits/);
  assert.throws(() => validateStudentId('2024-1234'), /4–20 digits/);
  assert.throws(() => validateStudentId(null), /4–20 digits/);
});

test('slugify creates a URL-safe event slug', () => {
  assert.equal(slugify('PUA ICPC: Contest Night!'), 'pua-icpc-contest-night');
});

test('password change input accepts current and new passwords', () => {
  assert.deepEqual(validatePasswordChangeInput({ currentPassword: 'current-password', newPassword: 'new-password' }), {
    currentPassword: 'current-password',
    newPassword: 'new-password',
  });
});

test('password change input rejects malformed or incomplete details', () => {
  assert.throws(() => validatePasswordChangeInput(null), /must be a JSON object/);
  assert.throws(() => validatePasswordChangeInput({ newPassword: 'new-password' }), /Enter your current password/);
  assert.throws(() => validatePasswordChangeInput({ currentPassword: 'current-password', newPassword: 'short' }), /at least 8 characters/);
  assert.throws(() => validatePasswordChangeInput({ currentPassword: 'current-password', newPassword: 'new-password', role: 'admin' }), /Unexpected field/);
});
