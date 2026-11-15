import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppChrome } from "@/components/AppChrome";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const unreadAlerts = await prisma.alert.count({
    where: { organizationId: session.user.organizationId, readAt: null },
  });

  return (
    <AppChrome userName={session.user.name ?? "User"} userRole={session.user.role} unreadAlerts={unreadAlerts}>
      {children}
    </AppChrome>
  );
}
