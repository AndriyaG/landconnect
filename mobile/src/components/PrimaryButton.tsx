import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/theme";

type Props = { label: string; onPress: () => void; busy?: boolean; color?: string };

export function PrimaryButton({ label, onPress, busy, color = colors.primary }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      style={[styles.button, { backgroundColor: color }, busy && styles.disabled]}
      disabled={busy}
      onPress={onPress}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 24, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  text: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
});
