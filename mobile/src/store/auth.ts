import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { queryClient } from "@/api/queryClient";
import { disconnectStreamClient } from "@/calls/session";

export type Role = "buyer" | "seller" | "broker";
export type PublicUser = { id: number; name: string; role: Role };
type Session = { token: string; user: PublicUser };

export const canList = (user: PublicUser | null) => user?.role === "seller" || user?.role === "broker";

const KEY = "session";

type AuthState = {
  token: string | null;
  user: PublicUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (s: Session) => Promise<void>;
  setUser: (user: PublicUser) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const s: Session = JSON.parse(raw);
        set({ token: s.token, user: s.user });
      }
    } catch {
      await SecureStore.deleteItemAsync(KEY).catch(() => {});
    } finally {
      set({ hydrated: true });
    }
  },
  setSession: async (s) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    set({ token: s.token, user: s.user });
  },
  setUser: async (user) => {
    const token = get().token;
    if (!token) return;
    await SecureStore.setItemAsync(KEY, JSON.stringify({ token, user }));
    set({ user });
  },
  logout: async () => {
    disconnectStreamClient();
    await SecureStore.deleteItemAsync(KEY).catch(() => {});
    set({ token: null, user: null });
    queryClient.clear();
    router.replace("/login");
  },
}));
