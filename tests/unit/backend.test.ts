import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { createUserSchema } from "../../server/validators/user.validator.js";

describe("Backend Unit Tests: User Validator", () => {
  it("should validate a valid user input successfully", () => {
    const validUser = {
      name: "John Doe",
      city: "Mumbai",
      amount: 100,
      mobile: "9876543210",
      email: "john@example.com",
      password: "password123",
    };

    const result = v.safeParse(createUserSchema, validUser);
    expect(result.success).toBe(true);
  });

  it("should fail validation when required fields are missing or invalid", () => {
    const invalidUser = {
      name: "Jo",
      city: "",
      amount: -10,
      mobile: "123",
      email: "invalid-email",
      password: "123",
    };

    const result = v.safeParse(createUserSchema, invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});
