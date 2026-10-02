import * as v from "valibot";
import { UserRole } from "../models/user.model.js";

export const createUserSchema = v.object({
    name: v.pipe(
        v.string("Name is required"),
        v.nonEmpty("Name is required"),
        v.minLength(3, "Name must be at least 3 characters")
    ),
    city: v.pipe(
        v.string("City is required"),
        v.nonEmpty("City is required"),
        v.minLength(3, "City must be at least 3 characters")
    ),
    amount: v.pipe(
        v.number("Amount is required"),
        v.minValue(0, "Amount must be at least 0")
    ),
    mobile: v.pipe(
        v.string("Mobile is required"),
        v.nonEmpty("Mobile is required"),
        v.minLength(10, "Mobile must be at least 10 digits")
    ),

    email: v.pipe(
        v.string("Email is required"),
        v.nonEmpty("Email is required"),
        v.email("Invalid email address")
    ),

    password: v.pipe(
        v.string("Password is required"),
        v.nonEmpty("Password is required"),
        v.minLength(8, "Password must be at least 8 characters")
    ),
    role: v.optional(
        v.literal(UserRole.CLIENT)
    ),
});

export type CreateUserInput = v.InferInput<
    typeof createUserSchema
>;