import { api } from "@/api/client";
import type { PublicUser } from "@/store/auth";

export type Meeting = {
  id: number;
  title: string;
  host: PublicUser;
  call_id: string;
  scheduled_at: string;
  participants: PublicUser[];
};

export async function fetchMeetings(): Promise<Meeting[]> {
  const { data } = await api.get<Meeting[]>("/meetings");
  return data;
}

export async function createMeeting(title: string, scheduledAt: string, inviteeIds: number[]): Promise<Meeting> {
  const { data } = await api.post<Meeting>("/meetings", {
    title,
    scheduled_at: scheduledAt,
    invitee_ids: inviteeIds,
  });
  return data;
}
