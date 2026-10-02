"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("Configuration error: MONGO_URI is not set in environment variables.");
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(uri, {
            dbName: "techno_prime",
        });
        console.log(`MongoDB connected successfully! Database: ${mongoose_1.default.connection.name}`);
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};
exports.default = connectDB;
