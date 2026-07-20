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
      <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="mx-auto w-full max-w-5xl px-10 py-10 print:p-0">{children}</div>
        </main>
      </div>
    </UserProvider>
  );
}
