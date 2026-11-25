import { api } from "@/api/client";
import type { PublicUser } from "@/store/auth";

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: number;
  text: string;
  client_id: string;
  created_at: string;
};

export type LocalMessage = Omit<Message, "id"> & {
  id: number | null;
  status: "pending" | "sent" | "failed";
};

export type Conversation = {
  id: number;
  listing_id: number;
  other_user: PublicUser;
  last_message: Message | null;
};

export type ServerEvent =
  | { type: "auth_ok"; user_id: number }
  | { type: "message"; message: Message }
  | { type: "ack"; client_id: string; message_id: number }
  | { type: "error"; detail: string; client_id?: string };

const PAGE = 30;

export async function fetchConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Conversation[]>("/conversations");
  return data;
}

export async function createConversation(otherUserId: number, listingId: number): Promise<Conversation> {
  const { data } = await api.post<Conversation>("/conversations", {
    other_user_id: otherUserId,
    listing_id: listingId,
  });
  return data;
}

export async function fetchMessages(conversationId: number, before?: number): Promise<Message[]> {
  const { data } = await api.get<Message[]>(`/conversations/${conversationId}/messages`, {
    params: { limit: PAGE, before },
  });
  return data;
}

export async function blockUser(userId: number): Promise<PublicUser> {
  const { data } = await api.post<PublicUser>("/blocks", { user_id: userId });
  return data;
}

export const MESSAGE_PAGE = PAGE;

function compareMessages(a: LocalMessage, b: LocalMessage) {
  if (a.id != null && b.id != null && a.id !== b.id) return a.id - b.id;
  if (a.id == null && b.id != null) return 1;
  if (a.id != null && b.id == null) return -1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export function upsertMessage(list: LocalMessage[], message: LocalMessage): LocalMessage[] {
  const index = list.findIndex((m) => m.client_id === message.client_id || (message.id != null && m.id === message.id));
  const next = index === -1 ? [...list, message] : list.map((m, i) => (i === index ? { ...m, ...message } : m));
  return next.sort(compareMessages);
}

export function newClientId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
