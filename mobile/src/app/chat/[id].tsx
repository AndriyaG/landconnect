import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/api/client";
import {
  blockUser,
  fetchConversations,
  fetchMessages,
  MESSAGE_PAGE,
  newClientId,
  upsertMessage,
  type LocalMessage,
  type ServerEvent,
} from "@/api/chat";
import { useCallClient } from "@/calls/CallProvider";
import { placeCall } from "@/calls/media";
import type { CallKind } from "@/calls/api";
import { formatChatTime } from "@/chat/time";
import { useChatSocket } from "@/chat/useChatSocket";
import { useAuth } from "@/store/auth";
import { colors, Screen } from "@/theme";

const FAIL_AFTER_MS = 12_000;

function containsPhoneNumber(text: string): boolean {
  for (const part of text.matchAll(/\+?(?:[\d\s().-]{9,22})\d/g)) {
    if ((part[0].match(/\d/g)?.length ?? 0) >= 10) return true;
  }
  return false;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const me = useAuth((s) => s.user);
  const { client } = useCallClient();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: fetchConversations });
  const conversation = conversations.data?.find((c) => c.id === conversationId);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingOlder = useRef(false);
  const sendRef = useRef<(payload: object) => boolean>(() => false);

  const onEvent = useCallback(
    (event: ServerEvent) => {
      if (event.type === "auth_ok") {
        for (const message of messagesRef.current) {
          if (message.status === "pending") {
            sendRef.current({
              type: "send",
              conversation_id: conversationId,
              text: message.text,
              client_id: message.client_id,
            });
          }
        }
      }
      if (event.type === "message" && event.message.conversation_id === conversationId) {
        setMessages((prev) => upsertMessage(prev, { ...event.message, status: "sent" }));
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
      if (event.type === "ack") {
        setMessages((prev) => {
          const current = prev.find((m) => m.client_id === event.client_id);
          if (!current) return prev;
          return upsertMessage(prev, { ...current, id: event.message_id, status: "sent" });
        });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
      if (event.type === "error" && event.client_id) {
        setMessages((prev) => prev.map((m) => (m.client_id === event.client_id ? { ...m, status: "failed" } : m)));
      }
    },
    [conversationId, queryClient],
  );

  const { connected, sendRaw } = useChatSocket(onEvent);
  sendRef.current = sendRaw;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchMessages(conversationId)
      .then((page) => {
        if (cancel) return;
        setHasMore(page.length === MESSAGE_PAGE);
        setMessages((prev) => page.reduce((list, message) => upsertMessage(list, { ...message, status: "sent" }), prev));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (!cancel) setLoadError(errorMessage(e));
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [conversationId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setMessages((prev) =>
        prev.map((m) =>
          m.status === "pending" && m.id == null && now - new Date(m.created_at).getTime() > FAIL_AFTER_MS
            ? { ...m, status: "failed" }
            : m,
        ),
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const loadOlder = useCallback(async () => {
    if (loadingOlder.current || !hasMore) return;
    const oldest = messagesRef.current.find((m) => m.id != null);
    if (!oldest?.id) return;
    loadingOlder.current = true;
    try {
      const page = await fetchMessages(conversationId, oldest.id);
      setHasMore(page.length === MESSAGE_PAGE);
      setMessages((prev) => page.reduce((list, message) => upsertMessage(list, { ...message, status: "sent" }), prev));
    } catch (e) {
      Alert.alert("Couldn't load earlier messages", errorMessage(e));
    } finally {
      loadingOlder.current = false;
    }
  }, [conversationId, hasMore]);

  const transmit = useCallback(
    (text: string, clientId: string, createdAt: string) => {
      setMessages((prev) =>
        upsertMessage(prev, {
          id: prev.find((m) => m.client_id === clientId)?.id ?? null,
          conversation_id: conversationId,
          sender_id: me?.id ?? 0,
          text,
          client_id: clientId,
          created_at: createdAt,
          status: "pending",
        }),
      );
      sendRaw({ type: "send", conversation_id: conversationId, text, client_id: clientId });
    },
    [conversationId, me?.id, sendRaw],
  );

  const send = () => {
    const text = draft.trim();
    if (!text || !me) return;
    setDraft("");
    transmit(text, newClientId(), new Date().toISOString());
  };

  const retry = (message: LocalMessage) => {
    transmit(message.text, message.client_id, new Date().toISOString());
  };

  const confirmBlock = () => {
    if (!conversation) return;
    Alert.alert(conversation.other_user.name, "You will not be able to message each other.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block user",
        style: "destructive",
        onPress: () => {
          blockUser(conversation.other_user.id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
              queryClient.invalidateQueries({ queryKey: ["blocks"] });
              Alert.alert("Blocked", `${conversation.other_user.name} is blocked.`);
              router.back();
            })
            .catch((e: unknown) => Alert.alert("Couldn't block user", errorMessage(e)));
        },
      },
    ]);
  };

  const startCall = (type: CallKind) => {
    if (!conversation) return;
    if (!client) {
      Alert.alert("Call", "Still connecting to the call service. Try again in a moment.");
      return;
    }
    placeCall(client, conversation.other_user.id, type).catch((e: unknown) =>
      Alert.alert(type === "video" ? "Video call" : "Audio call", errorMessage(e)),
    );
  };

  const data = useMemo(() => [...messages].reverse(), [messages]);
  const title = conversation?.other_user.name ?? "Chat";

  return (
    <Screen
      title={title}
      back
      right={
        <View style={styles.actions}>
          <HeaderIcon name="call" label="Audio call" onPress={() => startCall("audio")} />
          <HeaderIcon name="videocam" label="Video call" onPress={() => startCall("video")} />
          <HeaderIcon name="ellipsis-vertical" label="Chat menu" onPress={confirmBlock} />
        </View>
      }
    >
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.primary} accessibilityLabel="Loading messages" />
        ) : loadError && messages.length === 0 ? (
          <View style={styles.flexCenter}>
            <Text style={styles.error}>{loadError}</Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(item) => item.client_id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReached={loadOlder}
            onEndReachedThreshold={0.2}
            renderItem={({ item }) => <Bubble message={item} mine={item.sender_id === me?.id} onRetry={() => retry(item)} />}
          />
        )}
        {!connected && <Text style={styles.status}>Reconnecting…</Text>}
        <View style={[styles.composer, { paddingBottom: keyboardOpen ? 8 : insets.bottom + 8 }]}>
          {containsPhoneNumber(draft) && (
            <Text style={styles.warn} accessibilityLiveRegion="polite">
              This looks like a phone number. It will be hidden in the chat.
            </Text>
          )}
          <View style={styles.composerRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Message"
              multiline
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={send}
              disabled={!draft.trim()}
              style={[styles.send, !draft.trim() && { opacity: 0.5 }]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function HeaderIcon({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress}>
      <Ionicons name={name} size={22} color="#fff" />
    </Pressable>
  );
}

function Bubble({ message, mine, onRetry }: { message: LocalMessage; mine: boolean; onRetry: () => void }) {
  return (
    <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
        <Text style={styles.bubbleTime}>
          {formatChatTime(message.created_at)}
          {message.status === "pending" ? " · Sending" : ""}
        </Text>
      </View>
      {message.status === "failed" && (
        <Pressable accessibilityRole="button" accessibilityLabel="Retry message" onPress={onRetry}>
          <Text style={styles.failed}>Not sent. Tap to retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ECE5DD" },
  flexCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loading: { marginTop: 48 },
  error: { color: colors.danger, textAlign: "center" },
  list: { padding: 12, gap: 6 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  status: { textAlign: "center", color: colors.muted, fontSize: 12, paddingVertical: 4, backgroundColor: "#ECE5DD" },
  composer: { paddingHorizontal: 8, paddingTop: 8, backgroundColor: colors.background, gap: 6 },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  warn: { color: colors.danger, fontSize: 12, paddingHorizontal: 6 },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  bubbleWrap: { maxWidth: "80%", marginVertical: 2 },
  mineWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  mine: { backgroundColor: "#DCF8C6" },
  theirs: { backgroundColor: colors.surface },
  bubbleText: { fontSize: 16, color: colors.text },
  bubbleTime: { alignSelf: "flex-end", marginTop: 2, fontSize: 11, color: colors.muted },
  failed: { marginTop: 2, color: colors.danger, fontSize: 12, fontWeight: "600" },
});
