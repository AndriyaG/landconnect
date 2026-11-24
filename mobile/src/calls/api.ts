import { api } from "@/api/client";

export type CallToken = { api_key: string; user_id: string; token: string };

export async function fetchCallToken(): Promise<CallToken> {
  const { data } = await api.post<CallToken>("/calls/token");
  return data;
}
