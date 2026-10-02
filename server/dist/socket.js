"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_js_1 = require("./models/user.model.js");
let io = null;
const initSocket = (httpServer) => {
    const allowedOrigins = [
        process.env.CLIENT_URL || "http://localhost:3001",
        process.env.ADMIN_URL || "http://localhost:3000",
    ];
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow connections from configured frontend origins or tools with no origin (e.g. mobile/curl)
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error(`WebSocket CORS policy: Origin ${origin} not allowed`));
                }
            },
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true,
        },
    });
    // Socket.IO Authentication Middleware (verifies JWT token on handshake)
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "");
        if (!token) {
            // Allow unauthenticated connection but without private room access, OR reject:
            // Rejecting ensures all socket channels are strictly authorized
            return next(new Error("Authentication required: Missing token"));
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next(new Error("Server error: JWT configuration missing"));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            socket.data.user = decoded;
            next();
        }
        catch {
            next(new Error("Authentication failed: Invalid or expired token"));
        }
    });
    io.on("connection", (socket) => {
        const user = socket.data.user;
        if (user) {
            // Automatically and securely join the authenticated user's private personal room
            socket.join(`user:${user.id}`);
            // If user is verified admin, automatically join the admins monitoring room
            if (user.role === user_model_js_1.UserRole.ADMIN) {
                socket.join("admins");
            }
        }
        socket.on("disconnect", () => {
            // Clean disconnect
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO has not been initialized. Call initSocket first.");
    }
    return io;
};
exports.getIO = getIO;
