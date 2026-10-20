import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckInToken, getCheckInWindow, hashCheckInToken, isWithinCheckInWindow } from '../src/utils/checkIn.js';

test('check-in tokens are random, opaque, and stored as a hash', () => {
  const first = createCheckInToken();
  const second = createCheckInToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(first.tokenHash, hashCheckInToken(first.token));
  assert.equal(hashCheckInToken(first.token.toUpperCase()), first.tokenHash);
  assert.equal(hashCheckInToken('invalid'), null);
});

test('check-in window defaults to the event start and end', () => {
  const startsAt = new Date('2027-01-01T10:00:00Z');
  const endsAt = new Date('2027-01-01T12:00:00Z');
  const event = { startsAt, endsAt, checkInOpensAt: null, checkInClosesAt: null };

  assert.deepEqual(getCheckInWindow(event), { opensAt: startsAt, closesAt: endsAt });
  assert.equal(isWithinCheckInWindow(event, new Date('2027-01-01T09:59:59Z')), false);
  assert.equal(isWithinCheckInWindow(event, startsAt), true);
  assert.equal(isWithinCheckInWindow(event, endsAt), true);
  assert.equal(isWithinCheckInWindow(event, new Date('2027-01-01T12:00:01Z')), false);
});

test('check-in window uses configured event-specific bounds', () => {
  const event = {
    startsAt: new Date('2027-01-01T10:00:00Z'),
    endsAt: new Date('2027-01-01T12:00:00Z'),
    checkInOpensAt: new Date('2027-01-01T09:30:00Z'),
    checkInClosesAt: new Date('2027-01-01T10:30:00Z'),
  };

  assert.equal(isWithinCheckInWindow(event, new Date('2027-01-01T09:45:00Z')), true);
  assert.equal(isWithinCheckInWindow(event, new Date('2027-01-01T11:00:00Z')), false);
});
