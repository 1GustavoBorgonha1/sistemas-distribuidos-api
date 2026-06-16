"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Book = void 0;
const mongoose_1 = require("mongoose");
const bookSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    totalQty: { type: Number, required: true, min: 1 },
    availableQty: { type: Number, required: true, min: 0 },
}, { timestamps: true });
bookSchema.index({ title: 'text', author: 'text' });
exports.Book = (0, mongoose_1.model)('Book', bookSchema);
