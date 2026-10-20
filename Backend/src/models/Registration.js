import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ticketId: { type: String, default: null },
    checkedInAt: { type: Date, default: null },
    pointsAwarded: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

registrationSchema.index({ user: 1, event: 1 }, { unique: true });
registrationSchema.index(
  { ticketId: 1 },
  { unique: true, partialFilterExpression: { ticketId: { $type: 'string' } } },
);
registrationSchema.index({ pointsAwarded: 1, user: 1 });

export default mongoose.model('Registration', registrationSchema);
