"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { ClientData } from "@/types/user";
import { logoutClientAction } from "@/server-actions/auth";

interface ClientDashboardProps {
  initialClient?: ClientData;
  token?: string;
}

export default function ClientDashboard({
  initialClient,
  token = "",
}: ClientDashboardProps) {
  const router = useRouter();
  const [client, setClient] = useState<ClientData | undefined>(initialClient);
  const [lastCredit, setLastCredit] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "info" | "success" | "warning";
  } | null>(null);

  useEffect(() => {
    if (initialClient) {
      setClient(initialClient);
    }
  }, [initialClient]);

  // Realtime Socket.IO listener for live profile & balance updates
  useEffect(() => {
    if (!client?.id) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
    });

    // Realtime Amount Updates
    socket.on(
      "amountUpdated",
      ({
        userId,
        addedAmount,
        newAmount,
      }: {
        userId: string;
        addedAmount: number;
        newAmount: number;
      }) => {
        if (userId === client.id) {
          setClient((prev) => (prev ? { ...prev, amount: newAmount } : prev));
          setLastCredit(addedAmount);

          setTimeout(() => {
            setLastCredit(null);
          }, 5000);
        }
      }
    );

    // Realtime User Updates (Email, Name, City, Mobile, etc. by Admin)
    socket.on(
      "userUpdated",
      ({ userId, user }: { userId: string; user: ClientData }) => {
        if (userId === client.id) {
          const oldEmail = client.email;
          setClient(user);

          if (user.email !== oldEmail) {
            setNotification({
              message: `Your email address has been updated to "${user.email}" by Administrator.`,
              type: "info",
            });
          } else {
            setNotification({
              message: "Your profile details have been updated by Administrator.",
              type: "success",
            });
          }

          setTimeout(() => {
            setNotification(null);
          }, 7000);
        }
      }
    );

    // Realtime User Deletion
    socket.on("userDeleted", async ({ userId }: { userId: string }) => {
      if (userId === client.id) {
        alert("Your account has been deleted or deactivated by the Administrator.");
        await logoutClientAction();
        router.push("/login");
        router.refresh();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [client?.id, client?.email, token, router]);

  const handleSignOut = async () => {
    await logoutClientAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              TP
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">
                Client Portal
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Live balance updates active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-slate-600">
              {client?.email || "Signed in"}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        {/* Notification Banner */}
        {notification && (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm shadow-xs transition-all ${notification.type === "info"
              ? "border-blue-200 bg-blue-50/80 text-blue-800"
              : notification.type === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                : "border-amber-200 bg-amber-50/80 text-amber-800"
              }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 font-bold text-blue-600">
                ℹ
              </span>
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Balance Card */}
          <div className="md:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Available Balance
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Real-time
                </span>
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                ₹{(Number(client?.amount) || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {lastCredit !== null && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 animate-bounce">
                  <span>+₹{lastCredit.toLocaleString("en-IN")} credited live!</span>
                </div>
              )}
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
              Synced with Techno Prime core ledger.
            </div>
          </div>

          {/* Account Profile Card */}
          <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Client Account Details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="text-xs font-medium text-slate-400">Full Name</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {client?.name || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="text-xs font-medium text-slate-400">City</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {client?.city || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="text-xs font-medium text-slate-400">Email Address</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {client?.email || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="text-xs font-medium text-slate-400">Mobile Number</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {client?.mobile || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
