"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "./userContext";

// Admin-only pages call this first. Redirects non-admins to their own area
// before any admin-only fetch can fire and crash on a 403 response body.
export function useRequireAdmin(): boolean {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user.role !== "admin") {
      router.replace("/my");
    }
  }, [user, router]);

  return user.role === "admin";
}

// The inverse, for provider-only pages like /my.
export function useRequireProvider(): boolean {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user.role !== "provider") {
      router.replace("/");
    }
  }, [user, router]);

  return user.role === "provider";
}
