import { api, errorMessage } from "@/api/client";
import type { PublicUser } from "@/store/auth";

export type CallToken = { api_key: string; user_id: string; token: string };
export type CallKind = "audio" | "video";
export type CallLogStatus = "ringing" | "accepted" | "rejected" | "ended" | "missed";

export type CallHistoryItem = {
  id: number;
  call_id: string;
  type: CallKind;
  status: CallLogStatus;
  started_at: string;
  ended_at: string | null;
  direction: "incoming" | "outgoing";
  other_user: PublicUser;
};

export async function fetchCallToken(): Promise<CallToken> {
  const { data } = await api.post<CallToken>("/calls/token");
  return data;
}

export async function startCall(calleeId: number, type: CallKind): Promise<string> {
  const { data } = await api.post<{ call_id: string }>("/calls/start", { callee_id: calleeId, type });
  return data.call_id;
}

export async function reportCallStatus(callId: string, status: Exclude<CallLogStatus, "ringing">): Promise<void> {
  await api.post(`/calls/${callId}/status`, { status });
}

export async function fetchCallHistory(): Promise<CallHistoryItem[]> {
  const { data } = await api.get<CallHistoryItem[]>("/calls/history");
  return data;
}

export async function joinMeeting(meetingId: number): Promise<string> {
  const { data } = await api.post<{ call_id: string }>(`/meetings/${meetingId}/join`);
  return data.call_id;
}

export function callFailureMessage(e: unknown): string {
  const raw = errorMessage(e);
  if (raw === "blocked") return "You can't place this call. One of you has blocked the other.";
  if (raw === "not accepting calls") return "This person is not accepting calls.";
  return raw;
}
