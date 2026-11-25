import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
  size?: number;
};

export function RoundButton({ label, accessibilityLabel, onPress, color, disabled, size = 72 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", padding: 4 },
  label: { color: "#fff", fontWeight: "600", fontSize: 13, textAlign: "center" },
});
