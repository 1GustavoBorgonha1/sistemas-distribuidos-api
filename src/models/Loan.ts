import { Schema, model, Document, Types } from 'mongoose';

export interface ILoan extends Document {
  userId: Types.ObjectId;
  bookId: Types.ObjectId;
  borrowedAt: Date;
  returnedAt?: Date;
  status: 'active' | 'returned';
}

const loanSchema = new Schema<ILoan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    borrowedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date },
    status: { type: String, enum: ['active', 'returned'], default: 'active' },
  },
  { timestamps: true },
);

export const Loan = model<ILoan>('Loan', loanSchema);
