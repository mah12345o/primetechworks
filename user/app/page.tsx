import ClientDashboard from "@/components/ClientDashboard";
import { getClientSession } from "@/server-actions/auth";

export default async function ClientPage() {
  const session = await getClientSession();

  return (
    <ClientDashboard
      initialClient={session?.client}
      token={session?.token}

    />
  );
}
