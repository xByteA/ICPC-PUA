import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    registrationDeadline: { type: Date, default: null },
    checkInOpensAt: { type: Date, default: null },
    checkInClosesAt: { type: Date, default: null },
    checkInTokenHash: { type: String, select: false, default: null },
    attendancePoints: { type: Number, min: 0, default: 0 },
    mode: { type: String, enum: ['online', 'offline'], required: true },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    capacity: { type: Number, min: 1, default: null },
    registrationCount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['draft', 'published', 'cancelled', 'deleted'], default: 'draft', index: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

eventSchema.index({ status: 1, startsAt: 1 });

export default mongoose.model('Event', eventSchema);
