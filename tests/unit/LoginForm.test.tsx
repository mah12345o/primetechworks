// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import LoginForm from "../../admin/components/LoginForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server-actions/action", () => ({
  loginAdminAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("React Component Tests: LoginForm", () => {
  it("renders login inputs and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText("admin@example.com")).toBeDefined();
    expect(screen.getByPlaceholderText("Enter your password")).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in to admin/i })).toBeDefined();
  });

  it("updates input values on user typing", () => {
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText("admin@example.com") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput.value).toBe("test@example.com");

    const passwordInput = screen.getByPlaceholderText("Enter your password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "newpassword" } });
    expect(passwordInput.value).toBe("newpassword");
  });
});
