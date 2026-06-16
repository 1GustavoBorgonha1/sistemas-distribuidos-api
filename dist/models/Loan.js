"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loan = void 0;
const mongoose_1 = require("mongoose");
const loanSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Book', required: true },
    borrowedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date },
    status: { type: String, enum: ['active', 'returned'], default: 'active' },
}, { timestamps: true });
exports.Loan = (0, mongoose_1.model)('Loan', loanSchema);
