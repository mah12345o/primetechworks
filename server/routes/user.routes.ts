import { Router } from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  addAmount,
  login,
} from "../controllers/user.controller.js";
import { createUserSchema } from "../validators/user.validator.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  authenticateToken,
  requireAdmin,
  requireSelfOrAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

// =========================================================
// PUBLIC AUTHENTICATION ROUTE
// =========================================================
router.post("/login", login);

// =========================================================
// ADMIN-ONLY AUTHORIZED ROUTES (ROLE-BASED ACCESS CONTROL)
// =========================================================
router.get("/", authenticateToken, requireAdmin, getAllUsers);
router.post("/", authenticateToken, requireAdmin, validate(createUserSchema), createUser);
router.put("/:id", authenticateToken, requireAdmin, updateUser);
router.delete("/:id", authenticateToken, requireAdmin, deleteUser);
router.patch("/:id/amount", authenticateToken, requireAdmin, addAmount);

// =========================================================
// OWNERSHIP-RESTRICTED ROUTE (IDOR PROTECTED: SELF OR ADMIN)
// =========================================================
router.get("/:id", authenticateToken, requireSelfOrAdmin, getUserById);

export default router;