import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/api/client";
import { createConversation } from "@/api/chat";
import { useCallClient } from "@/calls/CallProvider";
import { placeCall } from "@/calls/media";
import type { CallKind } from "@/calls/api";
import type { PublicUser } from "@/store/auth";
import { colors } from "@/theme";

type Action = { label: string; icon: keyof typeof Ionicons.glyphMap };

const ACTIONS: Action[] = [
  { label: "Message", icon: "chatbubble-outline" },
  { label: "Audio call", icon: "call-outline" },
  { label: "Video call", icon: "videocam-outline" },
];

export function ContactBar({ owner, listingId }: { owner: PublicUser; listingId: number }) {
  const { bottom } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { client } = useCallClient();
  const [messaging, setMessaging] = useState(false);
  const [calling, setCalling] = useState(false);

  const message = async () => {
    setMessaging(true);
    try {
      const conversation = await createConversation(owner.id, listingId);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push({ pathname: "/chat/[id]", params: { id: String(conversation.id) } });
    } catch (e) {
      Alert.alert("Message", errorMessage(e));
    } finally {
      setMessaging(false);
    }
  };

  const call = async (type: CallKind) => {
    if (!client) {
      Alert.alert("Call", "Still connecting to the call service. Try again in a moment.");
      return;
    }
    setCalling(true);
    try {
      await placeCall(client, owner.id, type);
    } catch (e) {
      Alert.alert(type === "video" ? "Video call" : "Audio call", errorMessage(e));
    } finally {
      setCalling(false);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: bottom + 10 }]}>
      {ACTIONS.map((a) => {
        const isMessage = a.label === "Message";
        const type: CallKind | null = a.label === "Audio call" ? "audio" : a.label === "Video call" ? "video" : null;
        const busy = (isMessage && messaging) || (type !== null && calling);
        return (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            accessibilityLabel={`${a.label} ${owner.name}`}
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={() => (isMessage ? message() : type && call(type))}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={a.icon} size={20} color="#fff" />}
            <Text style={styles.label}>{a.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  button: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 10, borderRadius: 24, backgroundColor: colors.primary },
  label: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
