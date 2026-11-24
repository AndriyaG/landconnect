import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

export type Role = "buyer" | "seller" | "broker";
export type PublicUser = { id: number; name: string; role: Role };
type Session = { token: string; user: PublicUser };

const KEY = "session";

type AuthState = {
  token: string | null;
  user: PublicUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (s: Session) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
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
    } finally {
      set({ hydrated: true });
    }
  },
  setSession: async (s) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    set({ token: s.token, user: s.user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync(KEY);
    set({ token: null, user: null });
  },
}));
