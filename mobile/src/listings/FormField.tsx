import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

export function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  error: { color: colors.danger, fontSize: 13 },
});
