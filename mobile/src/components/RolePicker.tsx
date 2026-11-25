import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Role } from "@/store/auth";
import { colors } from "@/theme";

const ROLES: { value: Role; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "buyer", label: "Buyer", hint: "Looking for land", icon: "search" },
  { value: "seller", label: "Seller", hint: "Listing my land", icon: "pricetag" },
  { value: "broker", label: "Broker", hint: "Connecting both sides", icon: "briefcase" },
];

export function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Choose your role">
      {ROLES.map((r) => {
        const selected = value === r.value;
        return (
          <Pressable
            key={r.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${r.label}: ${r.hint}`}
            onPress={() => onChange(r.value)}
            style={[styles.card, selected && styles.selected]}
          >
            <Ionicons name={r.icon} size={22} color={selected ? "#fff" : colors.primary} />
            <Text style={[styles.label, selected && styles.selectedText]}>{r.label}</Text>
            <Text style={[styles.hint, selected && styles.selectedText]}>{r.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary },
  label: { color: colors.text, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 11, textAlign: "center" },
  selectedText: { color: "#fff" },
});
