"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Token não fornecido' });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.userId = payload.sub;
        req.userRole = payload.role;
        next();
    }
    catch {
        res.status(401).json({ message: 'Token inválido' });
    }
}
function requireAdmin(req, res, next) {
    if (req.userRole !== 'admin') {
        res.status(403).json({ message: 'Acesso restrito a administradores' });
        return;
    }
    next();
}
