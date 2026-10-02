"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient, CreateClientFormData } from "@/server-actions/action";
import { Client } from "./ClientTable";
import Modal from "./Modal";
import { validateClientForm, FieldErrors } from "@/validators/client.validator";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
}

const initialFormData = {
  name: "",
  city: "",
  email: "",
  mobile: "",
  password: "",
  amount: "0",
};

export default function ClientModal({
  isOpen,
  onClose,
  clientToEdit,
}: ClientModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialFormData);
  const [addAmountInput, setAddAmountInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setFormData({
          name: clientToEdit.name || "",
          city: clientToEdit.city || "",
          email: clientToEdit.email || "",
          mobile: clientToEdit.mobile || "",
          password: "",
          amount: String(clientToEdit.amount ?? 0),
        });
        setAddAmountInput("");
      } else {
        setFormData(initialFormData);
        setAddAmountInput("");
      }
      setShowPassword(false);
      setError(null);
      setFieldErrors({});
      setLoading(false);
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const validateFields = () => validateClientForm(formData, Boolean(clientToEdit));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific field error as user types
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { isValid, errors: validationErrors, data: validatedData } = validateFields();
    if (!isValid || !validatedData) {
      setFieldErrors(validationErrors);
      setError("Please fix the highlighted field errors below.");
      return;
    }

    setLoading(true);

    try {
      let res;
      if (clientToEdit) {
        const payload: Partial<CreateClientFormData> = {
          name: validatedData.name,
          city: validatedData.city,
          email: validatedData.email,
          mobile: validatedData.mobile,
        };

        const addNum = Number(addAmountInput);
        if (!isNaN(addNum) && addNum !== 0) {
          payload.amountToAdd = addNum;
        }

        if (validatedData.password) {
          payload.password = validatedData.password;
        }
        res = await updateClient(clientToEdit._id, payload);
      } else {
        res = await createClient({
          name: validatedData.name,
          city: validatedData.city,
          email: validatedData.email,
          mobile: validatedData.mobile,
          password: validatedData.password || "",
          amount: 0,
        });
      }

      if (!res?.success) {
        const msg = res?.message || `Failed to ${clientToEdit ? "update" : "create"} client`;
        setError(msg);

        // Highlight matching field if email exists
        if (msg.toLowerCase().includes("email")) {
          setFieldErrors((prev) => ({
            ...prev,
            email: msg,
          }));
        } else if (msg.toLowerCase().includes("mobile")) {
          setFieldErrors((prev) => ({
            ...prev,
            mobile: msg,
          }));
        }

        setLoading(false);
        return;
      }

      setFormData(initialFormData);
      setFieldErrors({});
      if (!clientToEdit) {
        router.push("/?page=1");
      }
      router.refresh();
      onClose();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clientToEdit ? "Edit Client" : "Add New Client"}
      description={
        clientToEdit
          ? "Update client details and credentials."
          : "Enter client credentials and details to register."
      }
      maxWidth="lg"
      error={error}
    >
      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
              className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-800 ${
                fieldErrors.name
                  ? "border-red-500 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:text-red-100"
                  : "border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={handleChange}
              className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-800 ${
                fieldErrors.city
                  ? "border-red-500 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:text-red-100"
                  : "border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              }`}
            />
            {fieldErrors.city && (
              <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">
                {fieldErrors.city}
              </p>
            )}
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            placeholder="e.g. client@example.com"
            value={formData.email}
            onChange={handleChange}
            className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-800 ${
              fieldErrors.email
                ? "border-red-500 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:text-red-100"
                : "border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="mobile"
            maxLength={10}
            placeholder="e.g. 9876543210 (10 digits)"
            value={formData.mobile}
            onChange={(e) => {
              // Only allow numbers
              const val = e.target.value.replace(/\D/g, "");
              handleChange({
                ...e,
                target: {
                  ...e.target,
                  name: "mobile",
                  value: val,
                },
              });
            }}
            className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-800 ${
              fieldErrors.mobile
                ? "border-red-500 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:text-red-100"
                : "border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            }`}
          />
          {fieldErrors.mobile && (
            <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">
              {fieldErrors.mobile}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Password {!clientToEdit ? <span className="text-red-500">*</span> : <span className="text-zinc-400 font-normal lowercase">(optional)</span>}
          </label>
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={clientToEdit ? "Leave blank to keep current password" : "•••••••• (min 8 chars)"}
              value={formData.password}
              onChange={handleChange}
              className={`w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-11 text-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-800 ${
                fieldErrors.password
                  ? "border-red-500 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:text-red-100"
                  : "border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Amount Section */}
        {clientToEdit ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-950/40 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Current Balance
                </span>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  Real-time client balance
                </p>
              </div>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                ₹{(Number(clientToEdit.amount) || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Add Amount (+₹)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 font-semibold text-sm">
                  +₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Enter amount to add (e.g. 500)"
                  value={addAmountInput}
                  onChange={(e) => {
                    const addVal = e.target.value;
                    setAddAmountInput(addVal);
                    const base = Number(clientToEdit.amount) || 0;
                    const addNum = Number(addVal) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      amount: String(Math.max(0, base + addNum)),
                    }));
                  }}
                  className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
              </div>
              {Number(addAmountInput) > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  <span>New Sum Total:</span>
                  <span className="font-bold">
                    ₹
                    {(
                      (Number(clientToEdit.amount) || 0) + Number(addAmountInput)
                    ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Initial Amount (₹) <span className="text-zinc-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                name="amount"
                min="0"
                step="any"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-8 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
              />
            </div>
          </div>
        )}

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
            {loading
              ? clientToEdit
                ? "Updating..."
                : "Creating..."
              : clientToEdit
                ? "Update Client"
                : "Save Client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
