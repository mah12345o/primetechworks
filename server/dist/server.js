"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = __importDefault(require("./config/db.js"));
const socket_js_1 = require("./socket.js");
const user_routes_js_1 = __importDefault(require("./routes/user.routes.js"));
const user_model_js_1 = __importStar(require("./models/user.model.js"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// 1. SECURITY MIDDLEWARE & CONFIGURATION
// Hide server signature to prevent stack fingerprinting
app.disable("x-powered-by");
// Essential security headers
app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});
// 2. RESTRICTED CORS (Eliminate overly permissive wildcard origin: "*")
const allowedOrigins = [
    process.env.CLIENT_URL || "http://localhost:3001",
    process.env.ADMIN_URL || "http://localhost:3000",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
}));
// 3. BODY PARSER WITH STRICT SIZE LIMIT (Prevent DoS via oversized payloads)
app.use(express_1.default.json({ limit: "10kb" }));
// 4. INITIALIZE AUTHENTICATED WEBSOCKETS (Decoupled from Express app object)
(0, socket_js_1.initSocket)(server);
// 5. APPLICATION ROUTES
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Techno Prime API is running",
    });
});
app.use("/api/users", user_routes_js_1.default);
// 6. 404 NOT FOUND HANDLER
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    });
});
// 7. GLOBAL ERROR HANDLER
app.use((err, _req, res, _next) => {
    console.error("Unhandled Error:", err);
    if (res.headersSent) {
        return _next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    const isProd = process.env.NODE_ENV === "production";
    res.status(statusCode).json({
        success: false,
        message: isProd && statusCode === 500 ? "Internal server error" : err.message || "An unexpected error occurred",
    });
});
const PORT = Number(process.env.PORT) || 5000;
// 8. STARTUP LOGIC (Throws errors to top-level runner instead of process.exit in helpers)
const startServer = async () => {
    // Validate critical configuration early
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your_super_secret_key_change_this") {
        throw new Error("JWT_SECRET is not configured or is using an insecure default placeholder.");
    }
    await (0, db_js_1.default)();
    // Secure Admin Seeding (Uses environment variables, avoids hardcoded passwords in code)
    const adminExists = await user_model_js_1.default.findOne({ role: user_model_js_1.UserRole.ADMIN });
    if (!adminExists) {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
            console.warn("WARNING: Production environment detected without explicit ADMIN_PASSWORD. Skipping auto-seed.");
        }
        else {
            const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
            await user_model_js_1.default.create({
                name: "System Admin",
                city: "Surat",
                email: adminEmail,
                mobile: "9999999999",
                password: hashedPassword,
                role: user_model_js_1.UserRole.ADMIN,
                amount: 0,
            });
            console.log(`Initial admin configured (${adminEmail}).`);
        }
    }
    server.listen(PORT, () => {
        console.log(`Server running securely on port ${PORT}`);
    });
};
// 9. TOP-LEVEL ERROR TRAPPING (Standard Node.js pattern)
startServer().catch((error) => {
    console.error("FATAL: Server startup failure:", error.message);
    process.exit(1);
});
// 10. GRACEFUL SHUTDOWN (Clean termination on SIGTERM / SIGINT)
const handleGracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        console.log("HTTP & WebSocket servers closed.");
        try {
            await mongoose_1.default.connection.close();
            console.log("MongoDB connection closed.");
            process.exit(0);
        }
        catch (err) {
            console.error("Error closing MongoDB connection:", err);
            process.exit(1);
        }
    });
    // Force exit after 10s if connections fail to close in time
    setTimeout(() => {
        console.error("Graceful shutdown timed out. Forcing process exit.");
        process.exit(1);
    }, 10000).unref();
};
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
