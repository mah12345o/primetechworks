import AdminDashboard from "@/components/AdminDashboard";
import { getClients } from "@/server-actions/server";
import { cookies } from "next/headers";

interface AdminPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

export default async function AdminPage(props: AdminPageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 6;
  const search = typeof searchParams?.search === "string" ? searchParams.search : "";

  const cookieStore = await cookies();
  const adminEmail = cookieStore.get("admin_email")?.value;
  const adminToken = cookieStore.get("admin_token")?.value;

  const { data, pagination } = await getClients({
    page,
    limit,
    search,
  });

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminDashboard
          data={data}
          pagination={pagination}
          initialSearch={search}
          adminEmail={adminEmail}
          adminToken={adminToken}
        />
      </div>
    </main>
  );
}
