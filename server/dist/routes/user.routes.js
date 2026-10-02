"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_js_1 = require("../controllers/user.controller.js");
const user_validator_js_1 = require("../validators/user.validator.js");
const validate_middleware_js_1 = require("../middlewares/validate.middleware.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// =========================================================
// PUBLIC AUTHENTICATION ROUTE
// =========================================================
router.post("/login", user_controller_js_1.login);
// =========================================================
// ADMIN-ONLY AUTHORIZED ROUTES (ROLE-BASED ACCESS CONTROL)
// =========================================================
router.get("/", auth_middleware_js_1.authenticateToken, auth_middleware_js_1.requireAdmin, user_controller_js_1.getAllUsers);
router.post("/", auth_middleware_js_1.authenticateToken, auth_middleware_js_1.requireAdmin, (0, validate_middleware_js_1.validate)(user_validator_js_1.createUserSchema), user_controller_js_1.createUser);
router.put("/:id", auth_middleware_js_1.authenticateToken, auth_middleware_js_1.requireAdmin, user_controller_js_1.updateUser);
router.delete("/:id", auth_middleware_js_1.authenticateToken, auth_middleware_js_1.requireAdmin, user_controller_js_1.deleteUser);
router.patch("/:id/amount", auth_middleware_js_1.authenticateToken, auth_middleware_js_1.requireAdmin, user_controller_js_1.addAmount);
// =========================================================
// OWNERSHIP-RESTRICTED ROUTE (IDOR PROTECTED: SELF OR ADMIN)
// =========================================================
router.get("/:id", auth_middleware_js_1.authenticateToken, auth_middleware_js_1.requireSelfOrAdmin, user_controller_js_1.getUserById);
exports.default = router;
