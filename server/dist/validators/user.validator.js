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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserSchema = void 0;
const v = __importStar(require("valibot"));
const user_model_js_1 = require("../models/user.model.js");
exports.createUserSchema = v.object({
    name: v.pipe(v.string("Name is required"), v.nonEmpty("Name is required"), v.minLength(3, "Name must be at least 3 characters")),
    city: v.pipe(v.string("City is required"), v.nonEmpty("City is required"), v.minLength(3, "City must be at least 3 characters")),
    amount: v.pipe(v.number("Amount is required"), v.minValue(0, "Amount must be at least 0")),
    mobile: v.pipe(v.string("Mobile is required"), v.nonEmpty("Mobile is required"), v.minLength(10, "Mobile must be at least 10 digits")),
    email: v.pipe(v.string("Email is required"), v.nonEmpty("Email is required"), v.email("Invalid email address")),
    password: v.pipe(v.string("Password is required"), v.nonEmpty("Password is required"), v.minLength(8, "Password must be at least 8 characters")),
    role: v.optional(v.literal(user_model_js_1.UserRole.CLIENT)),
});
