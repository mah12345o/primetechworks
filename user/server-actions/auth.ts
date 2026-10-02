"use server";

import { cookies } from "next/headers";
import { ClientData, LoginResponse } from "@/types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function loginClientAction(formData: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        appType: "client",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || "Login failed. Please check your credentials.",
      };
    }

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    const oneWeek = 60 * 60 * 24 * 7;

    cookieStore.set("client_token", data.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: oneWeek,
      path: "/",
    });

    if (data.data?.id) {
      cookieStore.set("client_id", data.data.id, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: oneWeek,
        path: "/",
      });
    }

    return {
      success: true,
      message: data.message || "Login successful",
      token: data.token,
      data: data.data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Unable to connect to the authentication service.",
    };
  }
}

export async function logoutClientAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete("client_token");
  cookieStore.delete("client_id");
  return { success: true };
}

export async function getClientSession(): Promise<{
  client: ClientData;
  token: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("client_token")?.value;
    const userId = cookieStore.get("client_id")?.value;

    if (!token || !userId) {
      return null;
    }

    const response = await fetch(`${API_URL}/users/${userId}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Invalidate stale or unauthorized session
      cookieStore.delete("client_token");
      cookieStore.delete("client_id");
      return null;
    }

    const data = await response.json();
    if (!data.success || !data.data) {
      return null;
    }

    return {
      client: data.data as ClientData,
      token,
    };
  } catch {
    return null;
  }
}
