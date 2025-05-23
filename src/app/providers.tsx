"use client";

import React, { memo } from "react";
import { AuthProvider as FirebaseAuthProvider } from "@/context/AuthContext";

// Use memo to prevent unnecessary re-renders of the provider
const AuthProvider = memo(({ children }: { children: React.ReactNode }) => {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
});

AuthProvider.displayName = "AuthProvider";

export default AuthProvider;
