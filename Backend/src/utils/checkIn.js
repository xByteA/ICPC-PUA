import { createHash, randomBytes } from 'node:crypto';

export function createCheckInToken() {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashCheckInToken(token) };
}

export function hashCheckInToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return null;
  return createHash('sha256').update(token.toLowerCase()).digest('hex');
}

export function getCheckInWindow(event) {
  return {
    opensAt: event.checkInOpensAt || event.startsAt,
    closesAt: event.checkInClosesAt || event.endsAt,
  };
}

export function isWithinCheckInWindow(event, now = new Date()) {
  const { opensAt, closesAt } = getCheckInWindow(event);
  return now >= opensAt && now <= closesAt;
}
