import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/user.model.js";
import Transaction, { TransactionType } from "../models/transaction.model.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { getIO } from "../socket.js";

const MAX_SAFE_AMOUNT = 10_000_000; // ₹1,00,00,000

// Helper to validate and round financial amounts with precision and limits
function validateAmount(
  val: any,
  allowZero: boolean = true
): { valid: boolean; value: number; message?: string } {
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
function isDuplicateKeyError(err: any): boolean {
  return err?.code === 11000 || err?.name === "MongoServerError";
}

// Scoped room-based Socket.IO emission (strictly guards against broad data leaks)
function emitToTargetAndAdmins(
  userId: string,
  event: string,
  payload: Record<string, any>
): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).to("admins").emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Socket.IO error on ${event}:`, err);
  }
}

// Financial audit trail logger
async function logTransaction(data: {
  userId: any;
  performedBy?: any;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
}): Promise<void> {
  try {
    await Transaction.create(data);
  } catch (err) {
    console.error("Failed to write financial audit log:", err);
  }
}

// CREATE USER
export const createUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email already exists",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // SECURITY: Always enforce role as UserRole.CLIENT
    const user = await User.create({
      name: name.trim(),
      city: city.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: hashedPassword,
      role: UserRole.CLIENT,
      amount: amountCheck.value,
    });

    // Write initial balance audit ledger if balance > 0
    if (amountCheck.value > 0) {
      await logTransaction({
        userId: user._id,
        performedBy: req.user?.id || "system",
        type: TransactionType.INITIAL,
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
      const io = getIO();
      io.to("admins").emit("userCreated", {
        user: userData,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Socket error on userCreated:", e);
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userData,
    });
  } catch (error: any) {
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

// GET ALL USERS (ADMIN ONLY: WITH PAGINATION & SEARCH)
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 6));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const query: Record<string, any> = { role: UserRole.CLIENT };

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { city: regex },
        { mobile: regex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// UPDATE USER (CONCURRENCY-SAFE ATOMIC UPDATE + AUDIT LEDGER)
export const updateUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, city, email, mobile, password, amount, amountToAdd } = req.body;

    // Retrieve current user document first to record previous balance and verify existence
    const existingUser = await User.findById(id);
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
      const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (emailExists) {
        res.status(409).json({
          success: false,
          message: "Email already exists",
        });
        return;
      }
    }

    // 2. Build atomic update operations
    const updateQuery: Record<string, any> = {};
    const setFields: Record<string, any> = {};

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
      setFields.password = await bcrypt.hash(password.trim(), 10);
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
    } else if (amount !== undefined && amount !== null && amount !== "") {
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
    const updatedUser = await User.findByIdAndUpdate(id, updateQuery, {
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
        type: TransactionType.CREDIT,
        amount: deltaAmount,
        balanceBefore,
        balanceAfter,
        description: `Balance credit delta of ₹${deltaAmount.toLocaleString()}`,
      });
    } else if (isDirectSet && balanceBefore !== balanceAfter) {
      await logTransaction({
        userId: updatedUser._id,
        performedBy: req.user?.id || "admin",
        type: TransactionType.SET,
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
  } catch (error: any) {
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

// GET USER BY ID (OWNERSHIP OR ADMIN RESTRICTED)
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

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
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

// DELETE USER (ADMIN ONLY + AUDIT EMIT)
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

// ADD AMOUNT TO USER (REALTIME INCREMENT + AUDIT TRAIL)
export const addAmount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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

    const existingUser = await User.findById(id);
    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const balanceBefore = existingUser.amount ?? 0;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $inc: { amount: numAmount } },
      { new: true, select: "-password" }
    );

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
      type: TransactionType.CREDIT,
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add amount",
    });
  }
};

// LOGIN CONTROLLER (WITH ROLE-BASED APPLICATION RESTRICTION & CONFIGURABLE EXPIRY)
export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    if (!appType || (appType !== UserRole.ADMIN && appType !== UserRole.CLIENT)) {
      res.status(400).json({
        success: false,
        message: "appType is required and must be either 'admin' or 'client'",
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const isUserAdmin = user.role === UserRole.ADMIN;
    const isUserClient = user.role === UserRole.CLIENT;

    // Required Authentication Rules:
    // 1. ADMIN can login to Admin App but cannot login to Client App
    // 2. CLIENT can login to Client App but cannot login to Admin App
    if (appType === UserRole.ADMIN && !isUserAdmin) {
      res.status(403).json({
        success: false,
        message: "Access Denied: Clients cannot log in to the Admin application.",
      });
      return;
    }

    if (appType === UserRole.CLIENT && !isUserClient) {
      res.status(403).json({
        success: false,
        message: "Access Denied: Admins cannot log in to the Client application.",
      });
      return;
    }

    // Configurable token lifetime (defaults to 24h for security)
    const tokenLifetime = (process.env.JWT_EXPIRES_IN || "24h") as jwt.SignOptions["expiresIn"];

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: tokenLifetime }
    );

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};
