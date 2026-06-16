import { Router, Response } from 'express';
import { Book } from '../models/Book';
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth';
import { cacheGet, cacheSet, cacheDel } from '../services/cache';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { q } = req.query;
  const cacheKey = `books:list:${q ?? ''}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const filter = q ? { $text: { $search: String(q) } } : {};
  const books = await Book.find(filter).sort({ title: 1 });
  await cacheSet(cacheKey, JSON.stringify(books), 60);
  res.json(books);
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const book = await Book.findById(req.params.id);
  if (!book) {
    res.status(404).json({ message: 'Livro não encontrado' });
    return;
  }
  res.json(book);
});

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, author, isbn, totalQty } = req.body;
  if (!title || !author || !isbn || !totalQty) {
    res.status(400).json({ message: 'title, author, isbn e totalQty são obrigatórios' });
    return;
  }
  const book = await Book.create({ title, author, isbn, totalQty, availableQty: totalQty });
  await cacheDel('books:list:');
  res.status(201).json(book);
});

router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!book) {
    res.status(404).json({ message: 'Livro não encontrado' });
    return;
  }
  await cacheDel('books:list:');
  res.json(book);
});

export default router;
