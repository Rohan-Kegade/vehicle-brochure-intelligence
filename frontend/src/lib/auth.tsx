import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { USE_MOCK, apiFetch } from "./api.ts";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
}

/** `undefined` while the initial `/auth/me` is in flight; `null` once we know
 * nobody is signed in. */
type MaybeUser = AuthUser | null | undefined;

interface AuthContextValue {
  user: MaybeUser;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Stand-in identity for the backend-less production demo build. */
const DEMO_USER: AuthUser = {
  id: "demo",
  email: "you@example.com",
  fullName: "Demo User",
  avatarUrl: null,
  emailVerified: true,
};

function toUser(raw: {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
}): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    avatarUrl: raw.avatar_url,
    emailVerified: raw.email_verified,
  };
}

async function postAuth(path: string, body: unknown): Promise<AuthUser> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* keep the default */
    }
    throw new Error(detail);
  }
  return toUser(await res.json());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MaybeUser>(USE_MOCK ? DEMO_USER : undefined);

  useEffect(() => {
    if (USE_MOCK) return;
    let alive = true;
    apiFetch("/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (alive) setUser(raw ? toUser(raw) : null);
      })
      .catch(() => {
        if (alive) setUser(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setUser(
        await postAuth("/auth/register", {
          email,
          password,
          full_name: fullName || null,
        }),
      );
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    setUser(await postAuth("/auth/login", { email, password }));
  }, []);

  const logout = useCallback(async () => {
    if (!USE_MOCK) {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    }
    setUser(USE_MOCK ? DEMO_USER : null);
  }, []);

  const value = useMemo(
    () => ({ user, register, login, logout }),
    [user, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** "Maya Rao" -> "MR"; falls back to the email's first two letters. */
export function initialsFrom(name: string | null, email: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

/** First name for greetings, with a sensible fallback. */
export function firstNameFrom(name: string | null, email: string): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || email.split("@")[0];
}
