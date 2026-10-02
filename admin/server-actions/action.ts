"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "./server";

export const loginAdminAction = async (formData: { email: string; password: string }) => {
    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...formData,
                appType: "admin",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Login failed",
            };
        }

        const cookieStore = await cookies();
        cookieStore.set("admin_token", data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        cookieStore.set("admin_email", data.data?.email || "admin@example.com", {
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return {
            success: true,
            message: "Login successful",
            data: data.data,
        };
    } catch {
        return {
            success: false,
            message: "Unable to connect to server. Please try again.",
        };
    }
};

export const logoutAdminAction = async () => {
    const cookieStore = await cookies();
    cookieStore.delete("admin_token");
    cookieStore.delete("admin_email");
    return { success: true };
};

export interface CreateClientFormData {
    name: string;
    city: string;
    email: string;
    mobile: string;
    password: string;
    amount?: number;
    amountToAdd?: number;
}

const getAuthHeaders = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};

export const createClient = async (formData: CreateClientFormData) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/users`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                name: formData.name,
                city: formData.city,
                email: formData.email,
                mobile: formData.mobile,
                password: formData.password,
                amount: 0,
                role: "client",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.errors) {
                const firstError = Object.values(data.errors).flat()[0] as string;
                return {
                    success: false,
                    message: firstError || data.message || "Failed to create client",
                };
            }
            return {
                success: false,
                message: data.message || "Failed to create client",
            };
        }

        revalidatePath("/");

        return {
            success: true,
            message: data.message || "User created successfully",
            data: data.data,
        };
    } catch (error: unknown) {
        return {
            success: false,
            message: "Something went wrong",
        };
    }
};

export const updateClient = async (
    id: string,
    formData: Partial<CreateClientFormData>
) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Failed to update client",
            };
        }

        revalidatePath("/");

        return {
            success: true,
            message: data.message || "Client updated successfully",
            data: data.data,
        };
    } catch (error: unknown) {
        return {
            success: false,
            message: "Something went wrong",
        };
    }
};

export const deleteClient = async (id: string) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: "DELETE",
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Failed to delete client",
            };
        }

        revalidatePath("/");

        return {
            success: true,
            message: data.message || "Client deleted successfully",
        };
    } catch (error: unknown) {
        return {
            success: false,
            message: "Something went wrong",
        };
    }
};

export const addClientAmount = async (id: string, amount: number) => {
    try {
        const response = await fetch(`${API_URL}/users/${id}/amount`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Failed to add amount",
            };
        }

        revalidatePath("/");

        return {
            success: true,
            message: data.message || "Amount added successfully",
            data: data.data,
        };
    } catch (error: unknown) {
        return {
            success: false,
            message: "Something went wrong",
        };
    }
};



