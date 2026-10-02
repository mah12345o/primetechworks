import mongoose, { Document, Schema } from "mongoose";

export enum UserRole {
  ADMIN = "admin",
  CLIENT = "client",
}

export interface IUser extends Document {
  name: string;
  city: string;
  email: string;
  mobile: string;
  password: string;
  amount: number;
  role: UserRole;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile is required"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CLIENT,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;