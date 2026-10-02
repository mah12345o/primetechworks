import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import userRoutes from "./routes/user.routes.js";
import User, { UserRole } from "./models/user.model.js";

const app = express();
const server = http.createServer(app);

// 1. SECURITY MIDDLEWARE & CONFIGURATION
// Hide server signature to prevent stack fingerprinting
app.disable("x-powered-by");

// Essential security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
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

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  })
);

// 3. BODY PARSER WITH STRICT SIZE LIMIT (Prevent DoS via oversized payloads)
app.use(express.json({ limit: "10kb" }));

// 4. INITIALIZE AUTHENTICATED WEBSOCKETS (Decoupled from Express app object)
initSocket(server);

// 5. APPLICATION ROUTES
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Techno Prime API is running",
  });
});

app.use("/api/users", userRoutes);

// 6. 404 NOT FOUND HANDLER
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// 7. GLOBAL ERROR HANDLER
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
const startServer = async (): Promise<void> => {
  // Validate critical configuration early
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your_super_secret_key_change_this") {
    throw new Error("JWT_SECRET is not configured or is using an insecure default placeholder.");
  }

  await connectDB();

  // Secure Admin Seeding (Uses environment variables, avoids hardcoded passwords in code)
  const adminExists = await User.findOne({ role: UserRole.ADMIN });
  if (!adminExists) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
      console.warn("WARNING: Production environment detected without explicit ADMIN_PASSWORD. Skipping auto-seed.");
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: "System Admin",
        city: "Surat",
        email: adminEmail,
        mobile: "9999999999",
        password: hashedPassword,
        role: UserRole.ADMIN,
        amount: 0,
      });
      console.log(`Initial admin configured (${adminEmail}).`);
    }
  }

  server.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
  });
};

export { app, server };
export default app;

// 9. TOP-LEVEL ERROR TRAPPING (Standard Node.js pattern)
if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("FATAL: Server startup failure:", error.message);
    process.exit(1);
  });
}

// 10. GRACEFUL SHUTDOWN (Clean termination on SIGTERM / SIGINT)
const handleGracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("HTTP & WebSocket servers closed.");
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    } catch (err) {
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