"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PaginationMetadata } from "@/server-actions/server";

export interface Client {
  _id: string;
  name: string;
  city: string;
  email: string;
  mobile: string;
  amount: number;
  role: "admin" | "client";
  createdAt?: string;
}

interface ClientTableProps {
  clients: Client[];
  pagination?: PaginationMetadata;
  initialSearch?: string;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void | Promise<void>;
  onOpenAdd?: () => void;
  deletingId?: string | null;
}

const TABLE_HEADERS = [
  { label: "Name", align: "left" },
  { label: "City", align: "left" },
  { label: "Email", align: "left" },
  { label: "Mobile", align: "left" },
  { label: "Amount", align: "left" },
  { label: "Actions", align: "right" },
];

export default function ClientTable({
  clients = [],
  pagination,
  initialSearch = "",
  onEdit,
  onDelete,
  onOpenAdd,
  deletingId,
}: ClientTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  // Sync state if initialSearch changes
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  // Debounced server search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParam = searchParams.get("search") || "";
      if (search !== currentParam) {
        const params = new URLSearchParams(searchParams.toString());
        if (search) {
          params.set("search", search);
          params.set("page", "1");
        } else {
          params.delete("search");
          params.set("page", "1");
        }
        router.push(`/?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/?${params.toString()}`);
  };

  // If pagination is provided, clients are already server-paginated; otherwise fallback to local filter
  const displayedClients = pagination
    ? clients
    : clients.filter((client) => {
        const q = search.toLowerCase();
        return (
          client.name?.toLowerCase().includes(q) ||
          client.email?.toLowerCase().includes(q) ||
          client.city?.toLowerCase().includes(q) ||
          client.mobile?.includes(q)
        );
      });

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Search + Add user */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <label htmlFor="client-search" className="sr-only">
            Search clients by name, city, email, or mobile
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            id="client-search"
            name="search"
            type="search"
            autoComplete="off"
            placeholder="Search name, city, email, mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search input"
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {search
              ? `${pagination ? pagination.total : displayedClients.length} clients found`
              : ""}
          </span>
        </div>

        {onOpenAdd && (
          <button
            type="button"
            onClick={onOpenAdd}
            aria-label="Add new user"
            className="inline-flex items-center justify-center rounded-lg bg-[#0e6251] px-4 py-2 text-sm font-medium text-white shadow-2xs hover:bg-[#0b5344] active:scale-[0.98] transition cursor-pointer"
          >
            Add user
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-white text-sm font-semibold text-slate-700">
              <tr>
                {TABLE_HEADERS.map((header) => (
                  <th
                    key={header.label}
                    className={`px-6 py-4 font-semibold text-slate-700 ${
                      header.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedClients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    {search ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              ) : (
                displayedClients.map((client) => (
                  <tr
                    key={client._id}
                    className="hover:bg-slate-50/60 transition"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{client.city}</td>
                    <td className="px-6 py-4 text-slate-600">{client.email}</td>
                    <td className="px-6 py-4 text-slate-600">{client.mobile}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {formatCurrency(client.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(client)}
                            aria-label={`Edit ${client.name}'s account`}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            disabled={deletingId === client._id}
                            onClick={async () => {
                              await onDelete(client);
                            }}
                            aria-label={`Delete ${client.name}'s account`}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-red-500 shadow-2xs hover:bg-red-50 disabled:opacity-50 transition cursor-pointer"
                          >
                            {deletingId === client._id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 bg-white px-6 py-3.5 text-sm text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {pagination
                ? pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1
                : displayedClients.length === 0
                ? 0
                : 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {pagination
                ? Math.min(pagination.page * pagination.limit, pagination.total)
                : displayedClients.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {pagination ? pagination.total : displayedClients.length}
            </span>{" "}
            clients
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination || pagination.page <= 1}
              onClick={() => pagination && handlePageChange(pagination.page - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-slate-600 px-1">
              Page {pagination?.page || 1} of {Math.max(1, pagination?.totalPages || 1)}
            </span>
            <button
              type="button"
              disabled={!pagination || pagination.page >= pagination.totalPages}
              onClick={() => pagination && handlePageChange(pagination.page + 1)}
              aria-label="Next page"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
