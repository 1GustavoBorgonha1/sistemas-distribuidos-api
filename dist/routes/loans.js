"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Loan_1 = require("../models/Loan");
const Book_1 = require("../models/Book");
const User_1 = require("../models/User");
const auth_1 = require("../middlewares/auth");
const queue_1 = require("../services/queue");
const cache_1 = require("../services/cache");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
router.post('/', auth_1.requireAuth, async (req, res) => {
    const { bookId } = req.body;
    if (!bookId) {
        res.status(400).json({ message: 'bookId é obrigatório' });
        return;
    }
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const book = await Book_1.Book.findById(bookId).session(session);
        if (!book) {
            await session.abortTransaction();
            res.status(404).json({ message: 'Livro não encontrado' });
            return;
        }
        if (book.availableQty < 1) {
            await session.abortTransaction();
            res.status(409).json({ message: 'Livro sem exemplares disponíveis' });
            return;
        }
        const activeCount = await Loan_1.Loan.countDocuments({ userId: req.userId, bookId, status: 'active' }).session(session);
        if (activeCount > 0) {
            await session.abortTransaction();
            res.status(409).json({ message: 'Você já tem este livro emprestado' });
            return;
        }
        book.availableQty -= 1;
        await book.save({ session });
        const loan = await Loan_1.Loan.create([{ userId: req.userId, bookId }], { session });
        await session.commitTransaction();
        await (0, cache_1.cacheDel)('books:list:');
        const user = await User_1.User.findById(req.userId).select('name email');
        await (0, queue_1.publishLoanEvent)({
            type: 'LOAN_CREATED',
            loanId: loan[0]._id.toString(),
            userId: req.userId,
            userEmail: user?.email ?? '',
            userName: user?.name ?? '',
            bookId: book._id.toString(),
            bookTitle: book.title,
            timestamp: new Date().toISOString(),
        });
        const populated = await Loan_1.Loan.findById(loan[0]._id).populate('bookId', 'title author isbn');
        res.status(201).json(populated);
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
});
router.put('/:id/return', auth_1.requireAuth, async (req, res) => {
    const loan = await Loan_1.Loan.findOne({ _id: req.params.id, userId: req.userId, status: 'active' });
    if (!loan) {
        res.status(404).json({ message: 'Empréstimo ativo não encontrado' });
        return;
    }
    const book = await Book_1.Book.findById(loan.bookId);
    if (book) {
        book.availableQty += 1;
        await book.save();
        await (0, cache_1.cacheDel)('books:list:');
    }
    loan.status = 'returned';
    loan.returnedAt = new Date();
    await loan.save();
    const user = await User_1.User.findById(req.userId).select('name email');
    await (0, queue_1.publishLoanEvent)({
        type: 'LOAN_RETURNED',
        loanId: loan._id.toString(),
        userId: req.userId,
        userEmail: user?.email ?? '',
        userName: user?.name ?? '',
        bookId: loan.bookId.toString(),
        bookTitle: book?.title ?? '',
        timestamp: new Date().toISOString(),
    });
    const populated = await Loan_1.Loan.findById(loan._id).populate('bookId', 'title author isbn');
    res.json(populated);
});
router.get('/my', auth_1.requireAuth, async (req, res) => {
    const loans = await Loan_1.Loan.find({ userId: req.userId })
        .populate('bookId', 'title author isbn')
        .sort({ createdAt: -1 });
    res.json(loans);
});
router.get('/', auth_1.requireAuth, auth_1.requireAdmin, async (_req, res) => {
    const loans = await Loan_1.Loan.find()
        .populate('userId', 'name email')
        .populate('bookId', 'title author isbn')
        .sort({ createdAt: -1 });
    res.json(loans);
});
exports.default = router;
