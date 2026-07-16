import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Image src="/pointwell-logo.svg" alt="Pointwell" width={160} height={54} priority />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
