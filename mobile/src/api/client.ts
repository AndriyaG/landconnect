import { create, isAxiosError } from "axios";

import { useAuth } from "@/store/auth";

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = create({ baseURL: API_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  if (isAxiosError(error) && error.response?.status === 401) {
    const { token, logout } = useAuth.getState();
    if (token && error.config?.headers?.Authorization === `Bearer ${token}`) logout();
  }
  return Promise.reject(error);
});

export function errorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    if (!e.response) return `Cannot reach server at ${API_URL ?? "(EXPO_PUBLIC_API_URL not set)"}`;
    const detail = e.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      const field = detail[0].loc?.at(-1);
      return typeof field === "string" && field !== "body" ? `${field}: ${detail[0].msg}` : detail[0].msg;
    }
    return `Request failed (${e.response.status})`;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}
