"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "./auth";

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): SessionUser {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useCurrentUser must be used within an authenticated (app) route.");
  }
  return user;
}
