import { Router, Response } from 'express';
import { Loan } from '../models/Loan';
import { Book } from '../models/Book';
import { User } from '../models/User';
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth';
import { publishLoanEvent } from '../services/queue';
import { cacheDel } from '../services/cache';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookId } = req.body;
  if (!bookId) {
    res.status(400).json({ message: 'bookId é obrigatório' });
    return;
  }

  try {
    const book = await Book.findById(bookId);
    if (!book) {
      res.status(404).json({ message: 'Livro não encontrado' });
      return;
    }
    if (book.availableQty < 1) {
      res.status(409).json({ message: 'Livro sem exemplares disponíveis' });
      return;
    }

    const activeCount = await Loan.countDocuments({ userId: req.userId, bookId, status: 'active' });
    if (activeCount > 0) {
      res.status(409).json({ message: 'Você já tem este livro emprestado' });
      return;
    }

    book.availableQty -= 1;
    await book.save();

    const loan = await Loan.create([{ userId: req.userId, bookId }]);
    await cacheDel('books:list:');

    const user = await User.findById(req.userId).select('name email');
    await publishLoanEvent({
      type: 'LOAN_CREATED',
      loanId: loan[0]._id.toString(),
      userId: req.userId!,
      userEmail: user?.email ?? '',
      userName: user?.name ?? '',
      bookId: book._id.toString(),
      bookTitle: book.title,
      timestamp: new Date().toISOString(),
    });

    const populated = await Loan.findById(loan[0]._id).populate('bookId', 'title author isbn');
    res.status(201).json(populated);
  } catch (err) {
    throw err;
  }
});

router.put('/:id/return', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const loan = await Loan.findOne({ _id: req.params.id, userId: req.userId, status: 'active' });
  if (!loan) {
    res.status(404).json({ message: 'Empréstimo ativo não encontrado' });
    return;
  }

  const book = await Book.findById(loan.bookId);
  if (book) {
    book.availableQty += 1;
    await book.save();
    await cacheDel('books:list:');
  }

  loan.status = 'returned';
  loan.returnedAt = new Date();
  await loan.save();

  const user = await User.findById(req.userId).select('name email');
  await publishLoanEvent({
    type: 'LOAN_RETURNED',
    loanId: loan._id.toString(),
    userId: req.userId!,
    userEmail: user?.email ?? '',
    userName: user?.name ?? '',
    bookId: loan.bookId.toString(),
    bookTitle: book?.title ?? '',
    timestamp: new Date().toISOString(),
  });

  const populated = await Loan.findById(loan._id).populate('bookId', 'title author isbn');
  res.json(populated);
});

router.get('/my', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const loans = await Loan.find({ userId: req.userId })
    .populate('bookId', 'title author isbn')
    .sort({ createdAt: -1 });
  res.json(loans);
});

router.get('/', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const loans = await Loan.find()
    .populate('userId', 'name email')
    .populate('bookId', 'title author isbn')
    .sort({ createdAt: -1 });
  res.json(loans);
});

export default router;
