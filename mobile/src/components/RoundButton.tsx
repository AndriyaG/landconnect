import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
};

export function RoundButton({ label, accessibilityLabel, onPress, color, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  label: { color: "#fff", fontWeight: "600", fontSize: 13, textAlign: "center" },
});
