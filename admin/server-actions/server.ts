import { cookies } from "next/headers";

export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export const getClients = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
}) => {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;

        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const query = new URLSearchParams();
        if (params?.page) query.set("page", String(params.page));
        query.set("limit", String(params?.limit || 6));
        if (params?.search) query.set("search", params.search);

        const qs = query.toString() ? `?${query.toString()}` : "";
        const response = await fetch(`${API_URL}/users${qs}`, {
            cache: "no-store",
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Failed to fetch clients",
                data: [],
                pagination: undefined,
            };
        }

        return {
            success: true,
            data: data.data || [],
            count: data.count,
            adminBalance: typeof data.adminBalance === "number" ? data.adminBalance : 100000,
            pagination: data.pagination as PaginationMetadata | undefined,
        };
    } catch (error: unknown) {
        return {
            success: false,
            message:
                error instanceof Error ? error.message : "Failed to fetch clients",
            data: [],
            pagination: undefined,
        };
    }
};