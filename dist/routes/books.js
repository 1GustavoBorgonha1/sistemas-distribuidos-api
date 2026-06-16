"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Book_1 = require("../models/Book");
const auth_1 = require("../middlewares/auth");
const cache_1 = require("../services/cache");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { q } = req.query;
    const cacheKey = `books:list:${q ?? ''}`;
    const cached = await (0, cache_1.cacheGet)(cacheKey);
    if (cached) {
        res.json(JSON.parse(cached));
        return;
    }
    const filter = q ? { $text: { $search: String(q) } } : {};
    const books = await Book_1.Book.find(filter).sort({ title: 1 });
    await (0, cache_1.cacheSet)(cacheKey, JSON.stringify(books), 60);
    res.json(books);
});
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    const book = await Book_1.Book.findById(req.params.id);
    if (!book) {
        res.status(404).json({ message: 'Livro não encontrado' });
        return;
    }
    res.json(book);
});
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const { title, author, isbn, totalQty } = req.body;
    if (!title || !author || !isbn || !totalQty) {
        res.status(400).json({ message: 'title, author, isbn e totalQty são obrigatórios' });
        return;
    }
    const book = await Book_1.Book.create({ title, author, isbn, totalQty, availableQty: totalQty });
    await (0, cache_1.cacheDel)('books:list:');
    res.status(201).json(book);
});
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const book = await Book_1.Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) {
        res.status(404).json({ message: 'Livro não encontrado' });
        return;
    }
    await (0, cache_1.cacheDel)('books:list:');
    res.json(book);
});
exports.default = router;
