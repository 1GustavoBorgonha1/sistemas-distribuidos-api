import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, adminSecret } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ message: 'name, email e password são obrigatórios' });
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ message: 'Email já cadastrado' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const adminSecretValue = process.env.ADMIN_SECRET ?? 'admin';
  const role = adminSecret === adminSecretValue ? 'admin' : 'user';
  const user = await User.create({ name, email, passwordHash, role });
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'email e password são obrigatórios' });
    return;
  }
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'Credenciais inválidas' });
    return;
  }
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export default router;
