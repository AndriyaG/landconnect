import { api } from "@/api/client";
import type { PublicUser, Role } from "@/store/auth";

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
  const { data } = await api.get<PublicUser>("/me");
  return { id: data.id, name: data.name, role: data.role };
}
