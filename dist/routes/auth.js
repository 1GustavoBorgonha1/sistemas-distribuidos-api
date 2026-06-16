"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const config_1 = require("../config");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    const { name, email, password, adminSecret } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ message: 'name, email e password são obrigatórios' });
        return;
    }
    const existing = await User_1.User.findOne({ email });
    if (existing) {
        res.status(409).json({ message: 'Email já cadastrado' });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const role = adminSecret === process.env.ADMIN_SECRET && process.env.ADMIN_SECRET ? 'admin' : 'user';
    const user = await User_1.User.create({ name, email, passwordHash, role });
    const token = jsonwebtoken_1.default.sign({ sub: user._id.toString(), role: user.role }, config_1.config.jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'email e password são obrigatórios' });
        return;
    }
    const user = await User_1.User.findOne({ email });
    if (!user || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
        res.status(401).json({ message: 'Credenciais inválidas' });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ sub: user._id.toString(), role: user.role }, config_1.config.jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});
exports.default = router;
