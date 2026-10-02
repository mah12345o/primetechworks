import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { UserRole } from "./models/user.model.js";
import { AuthenticatedUser } from "./middlewares/auth.middleware.js";

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  const allowedOrigins = [
    process.env.CLIENT_URL || "http://localhost:3001",
    process.env.ADMIN_URL || "http://localhost:3000",
  ];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow connections from configured frontend origins or tools with no origin (e.g. mobile/curl)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`WebSocket CORS policy: Origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Socket.IO Authentication Middleware (verifies JWT token on handshake)
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
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
      const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error("Authentication failed: Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as AuthenticatedUser | undefined;

    if (user) {
      // Automatically and securely join the authenticated user's private personal room
      socket.join(`user:${user.id}`);

      // If user is verified admin, automatically join the admins monitoring room
      if (user.role === UserRole.ADMIN) {
        socket.join("admins");
      }
    }

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized. Call initSocket first.");
  }
  return io;
};
