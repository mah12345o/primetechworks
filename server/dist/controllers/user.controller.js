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
exports.login = exports.addAmount = exports.deleteUser = exports.getUserById = exports.updateUser = exports.getAllUsers = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_js_1 = __importStar(require("../models/user.model.js"));
const transaction_model_js_1 = __importStar(require("../models/transaction.model.js"));
const socket_js_1 = require("../socket.js");
const MAX_SAFE_AMOUNT = 10_000_000; // ₹1,00,00,000
// Helper to validate and round financial amounts with precision and limits
function validateAmount(val, allowZero = true) {
    const num = Number(val);
    if (!Number.isFinite(num)) {
        return { valid: false, value: 0, message: "Amount must be a valid, finite number" };
    }
    if (allowZero ? num < 0 : num <= 0) {
        return {
            valid: false,
            value: 0,
            message: allowZero ? "Amount cannot be negative" : "Amount must be greater than 0",
        };
    }
    if (num > MAX_SAFE_AMOUNT) {
        return {
            valid: false,
            value: 0,
            message: `Amount cannot exceed ₹${MAX_SAFE_AMOUNT.toLocaleString()}`,
        };
    }
    // Enforce 2 decimal places max & eliminate IEEE 754 floating point drift
    const rounded = Math.round(num * 100) / 100;
    if (Number(num.toFixed(2)) !== num) {
        return { valid: false, value: 0, message: "Amount cannot have more than 2 decimal places" };
    }
    return { valid: true, value: rounded };
}
// Helper to reliably check MongoDB duplicate key errors (TOCTOU race condition)
function isDuplicateKeyError(err) {
    return err?.code === 11000 || err?.name === "MongoServerError";
}
// Scoped room-based Socket.IO emission (strictly guards against broad data leaks)
function emitToTargetAndAdmins(userId, event, payload) {
    try {
        const io = (0, socket_js_1.getIO)();
        io.to(`user:${userId}`).to("admins").emit(event, {
            ...payload,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error(`Socket.IO error on ${event}:`, err);
    }
}
// Financial audit trail logger
async function logTransaction(data) {
    try {
        await transaction_model_js_1.default.create(data);
    }
    catch (err) {
        console.error("Failed to write financial audit log:", err);
    }
}
// CREATE USER
const createUser = async (req, res) => {
    try {
        const { name, city, email, mobile, password, amount } = req.body;
        if (!name || !city || !email || !mobile || !password) {
            res.status(400).json({
                success: false,
                message: "All fields are required",
            });
            return;
        }
        const cleanEmail = email.toLowerCase().trim();
        const cleanMobile = mobile.trim();
        if (!/^\d{10}$/.test(cleanMobile)) {
            res.status(400).json({
                success: false,
                message: "Mobile number must be exactly 10 digits",
            });
            return;
        }
        // Amount validation
        const parsedAmount = amount !== undefined ? amount : 0;
        const amountCheck = validateAmount(parsedAmount, true);
        if (!amountCheck.valid) {
            res.status(400).json({
                success: false,
                message: amountCheck.message,
            });
            return;
        }
        const existingUser = await user_model_js_1.default.findOne({ email: cleanEmail });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: "Email already exists",
            });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password.trim(), 10);
        // SECURITY: Always enforce role as UserRole.CLIENT
        const user = await user_model_js_1.default.create({
            name: name.trim(),
            city: city.trim(),
            email: cleanEmail,
            mobile: cleanMobile,
            password: hashedPassword,
            role: user_model_js_1.UserRole.CLIENT,
            amount: amountCheck.value,
        });
        // Write initial balance audit ledger if balance > 0
        if (amountCheck.value > 0) {
            await logTransaction({
                userId: user._id,
                performedBy: req.user?.id || "system",
                type: transaction_model_js_1.TransactionType.INITIAL,
                amount: amountCheck.value,
                balanceBefore: 0,
                balanceAfter: amountCheck.value,
                description: "Initial client balance creation",
            });
        }
        const userData = {
            id: user._id.toString(),
            name: user.name,
            city: user.city,
            email: user.email,
            mobile: user.mobile,
            amount: user.amount,
            role: user.role,
        };
        // Scoped live event to admins room
        try {
            const io = (0, socket_js_1.getIO)();
            io.to("admins").emit("userCreated", {
                user: userData,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            console.error("Socket error on userCreated:", e);
        }
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: userData,
        });
    }
    catch (error) {
        if (isDuplicateKeyError(error)) {
            res.status(409).json({
                success: false,
                message: "Email already exists",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to create user",
        });
    }
};
exports.createUser = createUser;
// GET ALL USERS (ADMIN ONLY)
const getAllUsers = async (_req, res) => {
    try {
        const users = await user_model_js_1.default.find({ role: user_model_js_1.UserRole.CLIENT })
            .select("-password")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
};
exports.getAllUsers = getAllUsers;
// UPDATE USER (CONCURRENCY-SAFE ATOMIC UPDATE + AUDIT LEDGER)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, city, email, mobile, password, amount, amountToAdd } = req.body;
        // Retrieve current user document first to record previous balance and verify existence
        const existingUser = await user_model_js_1.default.findById(id);
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        const balanceBefore = existingUser.amount ?? 0;
        // 1. Email collision check if email is provided
        if (email) {
            const cleanEmail = email.toLowerCase().trim();
            const emailExists = await user_model_js_1.default.findOne({ email: cleanEmail, _id: { $ne: id } });
            if (emailExists) {
                res.status(409).json({
                    success: false,
                    message: "Email already exists",
                });
                return;
            }
        }
        // 2. Build atomic update operations
        const updateQuery = {};
        const setFields = {};
        if (name !== undefined && typeof name === "string" && name.trim()) {
            setFields.name = name.trim();
        }
        if (city !== undefined && typeof city === "string" && city.trim()) {
            setFields.city = city.trim();
        }
        if (email !== undefined && typeof email === "string" && email.trim()) {
            setFields.email = email.toLowerCase().trim();
        }
        if (mobile !== undefined && typeof mobile === "string" && mobile.trim()) {
            const cleanMobile = mobile.trim();
            if (!/^\d{10}$/.test(cleanMobile)) {
                res.status(400).json({
                    success: false,
                    message: "Mobile number must be exactly 10 digits",
                });
                return;
            }
            setFields.mobile = cleanMobile;
        }
        if (password && typeof password === "string" && password.trim()) {
            if (password.trim().length < 8) {
                res.status(400).json({
                    success: false,
                    message: "Password must be at least 8 characters",
                });
                return;
            }
            setFields.password = await bcryptjs_1.default.hash(password.trim(), 10);
        }
        // 3. Financial Amount Handling
        let isDeltaUpdate = false;
        let deltaAmount = 0;
        let isDirectSet = false;
        if (amountToAdd !== undefined && amountToAdd !== null && amountToAdd !== "") {
            const deltaCheck = validateAmount(amountToAdd, false);
            if (!deltaCheck.valid) {
                res.status(400).json({
                    success: false,
                    message: deltaCheck.message,
                });
                return;
            }
            deltaAmount = deltaCheck.value;
            updateQuery.$inc = { amount: deltaAmount };
            isDeltaUpdate = true;
        }
        else if (amount !== undefined && amount !== null && amount !== "") {
            const amountCheck = validateAmount(amount, true);
            if (!amountCheck.valid) {
                res.status(400).json({
                    success: false,
                    message: amountCheck.message,
                });
                return;
            }
            setFields.amount = amountCheck.value;
            isDirectSet = true;
        }
        if (Object.keys(setFields).length > 0) {
            updateQuery.$set = setFields;
        }
        if (Object.keys(updateQuery).length === 0) {
            res.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
            return;
        }
        // 4. Atomically execute update
        const updatedUser = await user_model_js_1.default.findByIdAndUpdate(id, updateQuery, {
            new: true,
            runValidators: true,
            select: "-password",
        });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        const balanceAfter = updatedUser.amount;
        // 5. Financial Audit Trail
        if (isDeltaUpdate) {
            await logTransaction({
                userId: updatedUser._id,
                performedBy: req.user?.id || "admin",
                type: transaction_model_js_1.TransactionType.CREDIT,
                amount: deltaAmount,
                balanceBefore,
                balanceAfter,
                description: `Balance credit delta of ₹${deltaAmount.toLocaleString()}`,
            });
        }
        else if (isDirectSet && balanceBefore !== balanceAfter) {
            await logTransaction({
                userId: updatedUser._id,
                performedBy: req.user?.id || "admin",
                type: transaction_model_js_1.TransactionType.SET,
                amount: balanceAfter,
                balanceBefore,
                balanceAfter,
                description: `Direct balance adjustment from ₹${balanceBefore.toLocaleString()} to ₹${balanceAfter.toLocaleString()}`,
            });
        }
        const userData = {
            _id: updatedUser._id.toString(),
            id: updatedUser._id.toString(),
            name: updatedUser.name,
            city: updatedUser.city,
            email: updatedUser.email,
            mobile: updatedUser.mobile,
            amount: updatedUser.amount,
            role: updatedUser.role,
        };
        // 6. Scoped Realtime Events (Targeted to affected client and admins only)
        if (isDeltaUpdate && deltaAmount !== 0) {
            emitToTargetAndAdmins(updatedUser._id.toString(), "amountUpdated", {
                userId: updatedUser._id.toString(),
                addedAmount: deltaAmount,
                newAmount: updatedUser.amount,
            });
        }
        emitToTargetAndAdmins(updatedUser._id.toString(), "userUpdated", {
            userId: updatedUser._id.toString(),
            user: userData,
        });
        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: userData,
        });
    }
    catch (error) {
        if (isDuplicateKeyError(error)) {
            res.status(409).json({
                success: false,
                message: "Email already exists",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to update user",
        });
    }
};
exports.updateUser = updateUser;
// GET USER BY ID (OWNERSHIP OR ADMIN RESTRICTED)
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await user_model_js_1.default.findById(id).select("-password");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                id: user._id.toString(),
                name: user.name,
                city: user.city,
                email: user.email,
                mobile: user.mobile,
                amount: user.amount,
                role: user.role,
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch user",
        });
    }
};
exports.getUserById = getUserById;
// DELETE USER (ADMIN ONLY + AUDIT EMIT)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await user_model_js_1.default.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        // Scoped deletion event to target user and admins
        emitToTargetAndAdmins(user._id.toString(), "userDeleted", {
            userId: user._id.toString(),
        });
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete user",
        });
    }
};
exports.deleteUser = deleteUser;
// ADD AMOUNT TO USER (REALTIME INCREMENT + AUDIT TRAIL)
const addAmount = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const amountCheck = validateAmount(amount, false);
        if (!amountCheck.valid) {
            res.status(400).json({
                success: false,
                message: amountCheck.message,
            });
            return;
        }
        const numAmount = amountCheck.value;
        const existingUser = await user_model_js_1.default.findById(id);
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        const balanceBefore = existingUser.amount ?? 0;
        const updatedUser = await user_model_js_1.default.findByIdAndUpdate(id, { $inc: { amount: numAmount } }, { new: true, select: "-password" });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        const balanceAfter = updatedUser.amount;
        // Write audit trail
        await logTransaction({
            userId: updatedUser._id,
            performedBy: req.user?.id || "admin",
            type: transaction_model_js_1.TransactionType.CREDIT,
            amount: numAmount,
            balanceBefore,
            balanceAfter,
            description: `Manual balance addition of ₹${numAmount.toLocaleString()}`,
        });
        // Scoped Socket.IO emission to target user and admins
        emitToTargetAndAdmins(updatedUser._id.toString(), "amountUpdated", {
            userId: updatedUser._id.toString(),
            addedAmount: numAmount,
            newAmount: updatedUser.amount,
        });
        res.status(200).json({
            success: true,
            message: `₹${numAmount.toLocaleString()} added successfully`,
            data: updatedUser,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to add amount",
        });
    }
};
exports.addAmount = addAmount;
// LOGIN CONTROLLER (WITH ROLE-BASED APPLICATION RESTRICTION & CONFIGURABLE EXPIRY)
const login = async (req, res) => {
    try {
        // Fail immediately if JWT configuration is missing or insecure
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.trim() === "" || jwtSecret === "your_super_secret_key_change_this") {
            console.error("FATAL SECURITY ERROR: JWT_SECRET environment variable is missing or insecure.");
            res.status(500).json({
                success: false,
                message: "Server configuration error: Authentication service is unavailable",
            });
            return;
        }
        const { email, password, appType } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }
        // Enforce strict appType validation (prevent bypass when appType is omitted)
        if (!appType || (appType !== user_model_js_1.UserRole.ADMIN && appType !== user_model_js_1.UserRole.CLIENT)) {
            res.status(400).json({
                success: false,
                message: "appType is required and must be either 'admin' or 'client'",
            });
            return;
        }
        const user = await user_model_js_1.default.findOne({ email: email.toLowerCase().trim() }).select("+password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        const isUserAdmin = user.role === user_model_js_1.UserRole.ADMIN;
        const isUserClient = user.role === user_model_js_1.UserRole.CLIENT;
        // Required Authentication Rules:
        // 1. ADMIN can login to Admin App but cannot login to Client App
        // 2. CLIENT can login to Client App but cannot login to Admin App
        if (appType === user_model_js_1.UserRole.ADMIN && !isUserAdmin) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Clients cannot log in to the Admin application.",
            });
            return;
        }
        if (appType === user_model_js_1.UserRole.CLIENT && !isUserClient) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Admins cannot log in to the Client application.",
            });
            return;
        }
        // Configurable token lifetime (defaults to 24h for security)
        const tokenLifetime = (process.env.JWT_EXPIRES_IN || "24h");
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            role: user.role,
            email: user.email,
            name: user.name,
        }, jwtSecret, { expiresIn: tokenLifetime });
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: {
                id: user._id,
                name: user.name,
                city: user.city,
                email: user.email,
                mobile: user.mobile,
                amount: user.amount,
                role: user.role,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};
exports.login = login;
