import { StyleSheet, Text, View } from "react-native";

import type { PublicUser } from "@/store/auth";
import { colors } from "@/theme";

import { RoleBadge } from "./RoleBadge";

export function OwnerCard({ owner }: { owner: PublicUser }) {
  return (
    <View style={styles.card} accessibilityLabel={`Listed by ${owner.name}, ${owner.role}`}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{owner.name.trim().charAt(0).toUpperCase() || "?"}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>Listed by</Text>
        <Text style={styles.name} numberOfLines={1}>{owner.name}</Text>
      </View>
      <RoleBadge role={owner.role} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 14, borderRadius: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  initial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  info: { flex: 1 },
  label: { fontSize: 12, color: colors.muted },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
});
