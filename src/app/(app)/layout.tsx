import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppChrome } from "@/components/AppChrome";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppChrome userName={session.user.name ?? "User"} userRole={session.user.role}>
      {children}
    </AppChrome>
  );
}
