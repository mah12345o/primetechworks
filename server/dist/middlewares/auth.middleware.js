"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSelfOrAdmin = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_js_1 = require("../models/user.model.js");
// 1. AUTHENTICATE TOKEN: Verifies JWT from Authorization Bearer header
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            message: "Unauthorized: Missing or invalid Bearer token",
        });
        return;
    }
    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        res.status(500).json({
            success: false,
            message: "Server configuration error: Authentication service is unavailable",
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                message: "Unauthorized: Token has expired. Please sign in again.",
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid token signature",
        });
    }
};
exports.authenticateToken = authenticateToken;
// 2. REQUIRE ADMIN: Restricts route to Administrators only
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Unauthorized: Authentication required",
        });
        return;
    }
    if (req.user.role !== user_model_js_1.UserRole.ADMIN) {
        res.status(403).json({
            success: false,
            message: "Forbidden: Access restricted to administrators only",
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
// 3. REQUIRE SELF OR ADMIN: IDOR Protection for getUserById
const requireSelfOrAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Unauthorized: Authentication required",
        });
        return;
    }
    const { id } = req.params;
    const isSelf = req.user.id === id;
    const isAdmin = req.user.role === user_model_js_1.UserRole.ADMIN;
    if (!isSelf && !isAdmin) {
        res.status(403).json({
            success: false,
            message: "Forbidden: You are not authorized to access another user's profile",
        });
        return;
    }
    next();
};
exports.requireSelfOrAdmin = requireSelfOrAdmin;
