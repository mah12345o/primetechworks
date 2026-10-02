import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { app } from "../../server/server.js";
import User, { UserRole } from "../../server/models/user.model.js";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = "ff749062304eb1779f9743faf1cf04de0d556ce468873e6741934c2d22adf692";
  process.env.NODE_ENV = "test";

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 20000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("API Integration Tests (Isolated MongoDB)", () => {
  it("GET / - returns health message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Techno Prime API is running");
  });

  it("POST /api/users/login - rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "wrong@example.com", password: "wrongpassword", appType: "admin" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it(
    "POST /api/users/login & GET /api/users - authenticates admin and fetches clients with pagination",
    async () => {
      // Seed admin user in test memory database
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: hashedPassword,
        city: "Surat",
        mobile: "9999999999",
        role: UserRole.ADMIN,
        amount: 0,
      });

      // 1. Login
      const loginRes = await request(app)
        .post("/api/users/login")
        .send({ email: "admin@example.com", password: "admin123", appType: "admin" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.token).toBeDefined();

      const token = loginRes.body.token;

      // 2. Fetch clients with token
      const clientsRes = await request(app)
        .get("/api/users?page=1&limit=6")
        .set("Authorization", `Bearer ${token}`);

      expect(clientsRes.status).toBe(200);
      expect(clientsRes.body.success).toBe(true);
      expect(Array.isArray(clientsRes.body.data)).toBe(true);
      expect(clientsRes.body.pagination).toBeDefined();
      expect(clientsRes.body.pagination.limit).toBe(6);
    },
    20000
  );
});
