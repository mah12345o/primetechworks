import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Techno Prime",
  description: "Sign in to Admin Portal",
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
