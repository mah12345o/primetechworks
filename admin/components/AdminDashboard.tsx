"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientModal from "./ClientModal";
import ClientTable, { Client } from "./ClientTable";
import Modal from "./Modal";
import { deleteClient, logoutAdminAction } from "@/server-actions/action";
import { PaginationMetadata } from "@/server-actions/server";
import { io } from "socket.io-client";

export default function AdminDashboard({
  data = [],
  pagination,
  initialSearch = "",
  adminEmail = "admin@example.com",
  adminToken,
}: {
  data: Client[];
  pagination?: PaginationMetadata;
  initialSearch?: string;
  adminEmail?: string;
  adminToken?: string;
}) {
  const router = useRouter();
  const [clientsList, setClientsList] = useState<Client[]>(data);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setDeletingId(clientToDelete._id);
    try {
      await deleteClient(clientToDelete._id);
      router.refresh();
      setClientToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await logoutAdminAction();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setClientsList(data);
  }, [data]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token: adminToken },
    });

    socket.on("amountUpdated", ({ userId, newAmount }: { userId: string; newAmount: number }) => {
      setClientsList((prev) =>
        prev.map((client) =>
          client._id === userId ? { ...client, amount: newAmount } : client
        )
      );
    });

    socket.on("userCreated", ({ user }: { user: any }) => {
      setClientsList((prev) => [
        {
          _id: user.id || user._id,
          name: user.name,
          city: user.city,
          email: user.email,
          mobile: user.mobile,
          amount: user.amount || 0,
          role: user.role || "client",
          createdAt: user.createdAt,
        },
        ...prev.filter((c) => c._id !== (user.id || user._id)),
      ].slice(0, 6));
    });

    socket.on("userDeleted", ({ userId }: { userId: string }) => {
      setClientsList((prev) => prev.filter((c) => c._id !== userId));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Users
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Live — changes appear instantly</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          balance: 100000
          <span className="text-xs sm:text-sm text-slate-600">
            {adminEmail}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out of admin portal"
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>

      <ClientTable
        clients={clientsList}
        pagination={pagination}
        initialSearch={initialSearch}
        onEdit={handleOpenEdit}
        onDelete={(client) => setClientToDelete(client)}
        onOpenAdd={handleOpenAdd}
        deletingId={deletingId}
      />

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        clientToEdit={editingClient}
      />

      {/* Accessible Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        title="Delete Client"
        description={`Are you sure you want to delete ${clientToDelete?.name}? This action cannot be undone.`}
      >
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setClientToDelete(null)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Boolean(deletingId)}
            onClick={confirmDelete}
            aria-label={`Confirm delete ${clientToDelete?.name}`}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
          >
            {deletingId ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
