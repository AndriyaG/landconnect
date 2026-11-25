import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PublicUser } from "@/store/auth";
import { colors } from "@/theme";

type Action = { label: string; icon: keyof typeof Ionicons.glyphMap };

const ACTIONS: Action[] = [
  { label: "Message", icon: "chatbubble-outline" },
  { label: "Audio call", icon: "call-outline" },
  { label: "Video call", icon: "videocam-outline" },
];

export function ContactBar({ owner }: { owner: PublicUser }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: bottom + 10 }]}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={`${a.label} ${owner.name}`}
          onPress={() => Alert.alert(a.label, `${a.label} with ${owner.name} is coming soon.`)}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name={a.icon} size={20} color="#fff" />
          <Text style={styles.label}>{a.label}</Text>
        </Pressable>
      ))}
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
