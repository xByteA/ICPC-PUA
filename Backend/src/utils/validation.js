export function validateEventInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Event details must be a JSON object.'), { status: 400 });
  }
  const fields = ['title', 'description', 'category', 'startsAt', 'endsAt', 'registrationDeadline', 'checkInOpensAt', 'checkInClosesAt', 'attendancePoints', 'mode', 'location', 'capacity', 'status'];
  const allowed = new Set(fields);
  const unexpected = Object.keys(input).find((key) => !allowed.has(key));
  if (unexpected) throw Object.assign(new Error(`Unexpected field: ${unexpected}`), { status: 400 });

  const output = {};
  for (const key of fields) {
    if (!(key in input)) continue;
    const value = input[key];
    if (['title', 'description', 'category', 'location'].includes(key)) {
      if (typeof value !== 'string' || (key !== 'location' && !value.trim())) {
        throw Object.assign(new Error(`${key} must be a non-empty string.`), { status: 400 });
      }
      output[key] = value.trim();
    } else if (key === 'startsAt' || key === 'endsAt' || key === 'registrationDeadline' || key === 'checkInOpensAt' || key === 'checkInClosesAt') {
      if (value === null && key !== 'startsAt' && key !== 'endsAt') {
        output[key] = null;
      } else {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw Object.assign(new Error(`${key} must be a valid date.`), { status: 400 });
        output[key] = date;
      }
    } else if (key === 'capacity') {
      if (value === null || value === '') output.capacity = null;
      else if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw Object.assign(new Error('capacity must be a positive whole number or null.'), { status: 400 });
      } else output.capacity = Number(value);
    } else if (key === 'attendancePoints') {
      if (value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) {
        throw Object.assign(new Error('attendancePoints must be a non-negative number.'), { status: 400 });
      }
      output.attendancePoints = Number(value);
    } else if (key === 'mode') {
      if (!['online', 'offline'].includes(value)) throw Object.assign(new Error('mode must be online or offline.'), { status: 400 });
      output.mode = value;
    } else if (key === 'status') {
      if (!['draft', 'published', 'cancelled'].includes(value)) throw Object.assign(new Error('status must be draft, published, or cancelled.'), { status: 400 });
      output.status = value;
    }
  }

  if (!partial) {
    for (const key of ['title', 'description', 'category', 'startsAt', 'endsAt', 'mode']) {
      if (!(key in output)) throw Object.assign(new Error(`${key} is required.`), { status: 400 });
    }
  }

  const startsAt = output.startsAt;
  const endsAt = output.endsAt;
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw Object.assign(new Error('endsAt must be after startsAt.'), { status: 400 });
  }
  if (output.registrationDeadline && startsAt && output.registrationDeadline >= startsAt) {
    throw Object.assign(new Error('registrationDeadline must be before startsAt.'), { status: 400 });
  }
  const checkInOpensAt = output.checkInOpensAt ?? startsAt;
  const checkInClosesAt = output.checkInClosesAt ?? endsAt;
  if (checkInOpensAt && checkInClosesAt && checkInClosesAt <= checkInOpensAt) {
    throw Object.assign(new Error('checkInClosesAt must be after checkInOpensAt.'), { status: 400 });
  }
  if (output.mode === 'offline' && !('location' in output)) {
    throw Object.assign(new Error('location is required for offline events.'), { status: 400 });
  }
  return output;
}

export function validatePasswordChangeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Password details must be a JSON object.'), { status: 400 });
  }
  const unexpected = Object.keys(input).find((key) => !['currentPassword', 'newPassword'].includes(key));
  if (unexpected) throw Object.assign(new Error(`Unexpected field: ${unexpected}`), { status: 400 });
  if (typeof input.currentPassword !== 'string' || !input.currentPassword) {
    throw Object.assign(new Error('Enter your current password.'), { status: 400 });
  }
  if (typeof input.newPassword !== 'string' || input.newPassword.length < 8) {
    throw Object.assign(new Error('New password must be at least 8 characters.'), { status: 400 });
  }
  return { currentPassword: input.currentPassword, newPassword: input.newPassword };
}

export function validateStudentId(studentId) {
  if (typeof studentId !== 'string' || !/^\d{4,20}$/.test(studentId.trim())) {
    throw Object.assign(new Error('Student ID must contain 4–20 digits.'), { status: 400 });
  }
  return studentId.trim();
}

export function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
