import { Schema, model, Document } from 'mongoose';

export interface IBook extends Document {
  title: string;
  author: string;
  isbn: string;
  totalQty: number;
  availableQty: number;
  createdAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    totalQty: { type: Number, required: true, min: 1 },
    availableQty: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

bookSchema.index({ title: 'text', author: 'text' });

export const Book = model<IBook>('Book', bookSchema);
