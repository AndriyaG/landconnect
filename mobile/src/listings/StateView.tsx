import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { colors } from "@/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void };
};

export function StateView({ icon, title, text, action }: Props) {
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={56} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      {!!text && <Text style={styles.text}>{text}</Text>}
      {action && <PrimaryButton label={action.label} onPress={action.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", gap: 8, padding: 32, flexGrow: 1 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" },
  text: { color: colors.muted, textAlign: "center", fontSize: 14, marginBottom: 8 },
});
