"use client";

import React, { useState, useEffect } from "react";
import { Client } from "./ClientTable";
import Modal from "./Modal";

interface AddAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onAddAmount: (clientId: string, amount: number) => Promise<boolean>;
}

export default function AddAmountModal({
  isOpen,
  onClose,
  client,
  onAddAmount,
}: AddAmountModalProps) {
  const [amountToAdd, setAmountToAdd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountToAdd("");
      setError(null);
      setLoading(false);
    }
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = Number(amountToAdd);
    if (!amountToAdd || isNaN(num) || num <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      const success = await onAddAmount(client._id, num);
      if (success) {
        onClose();
      } else {
        setError("Failed to add amount");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Amount"
      description={`Add credit balance to ${client.name}'s account.`}
      maxWidth="md"
      error={error}
    >
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Amount to Add (₹)
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 font-semibold">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="any"
              autoFocus
              placeholder="Enter amount (e.g. 500)"
              value={amountToAdd}
              onChange={(e) => setAmountToAdd(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-8 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-800 dark:focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[#0e6251] px-5 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-[#0b5344] disabled:opacity-50 transition cursor-pointer"
          >
            {loading && (
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            {loading ? "Adding..." : "Add Amount"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
