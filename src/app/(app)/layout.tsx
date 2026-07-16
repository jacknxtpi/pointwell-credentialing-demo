import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserProvider } from "@/lib/userContext";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <UserProvider user={user}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-10 py-10">{children}</div>
        </main>
      </div>
    </UserProvider>
  );
}
