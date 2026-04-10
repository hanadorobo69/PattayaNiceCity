"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@prisma/client";

interface AuthState {
  user: { id: string; email: string; profile: Profile } | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setState({ user: data.user ?? null, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return state;
}
