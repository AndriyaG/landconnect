import { api } from "@/api/client";
import type { PublicUser, Role } from "@/store/auth";

export type CallPrivacy = "everyone" | "contacts";
export type Me = PublicUser & { email: string; call_privacy: CallPrivacy };

type TokenOut = { access_token: string; token_type: string; user: PublicUser };

export async function login(email: string, password: string) {
  const { data } = await api.post<TokenOut>("/auth/login", { email, password });
  return { token: data.access_token, user: data.user };
}

export async function register(name: string, email: string, password: string, role: Role) {
  const { data } = await api.post<TokenOut>("/auth/register", { name, email, password, role });
  return { token: data.access_token, user: data.user };
}

export async function fetchMe(): Promise<PublicUser> {
  const { data } = await api.get<Me>("/me");
  return { id: data.id, name: data.name, role: data.role };
}

export async function fetchProfile(): Promise<Me> {
  const { data } = await api.get<Me>("/me");
  return data;
}

export async function updateMe(body: { name?: string; call_privacy?: CallPrivacy }): Promise<Me> {
  const { data } = await api.patch<Me>("/me", body);
  return data;
}
