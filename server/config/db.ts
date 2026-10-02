import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error("Configuration error: MONGO_URI is not set in environment variables.");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, {
            dbName: "techno_prime",
        });
        console.log(`MongoDB connected successfully! Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;