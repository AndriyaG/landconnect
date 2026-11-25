import { StyleSheet, Text } from "react-native";

import type { Role } from "@/store/auth";
import { colors } from "@/theme";

const BADGE: Record<Role, { label: string; bg: string; fg: string }> = {
  seller: { label: "Seller", bg: "#DCF8C6", fg: colors.primaryDark },
  broker: { label: "Broker", bg: "#E3F2FD", fg: "#1565C0" },
  buyer: { label: "Buyer", bg: "#FFF3E0", fg: "#E65100" },
};

export function RoleBadge({ role }: { role: Role }) {
  const b = BADGE[role] ?? BADGE.buyer;
  return <Text style={[styles.badge, { backgroundColor: b.bg, color: b.fg }]}>{b.label}</Text>;
}

const styles = StyleSheet.create({
  badge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
});
