import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors, Screen } from "@/theme";

type Props = { title: string; icon: keyof typeof Ionicons.glyphMap; text: string };

export function ComingSoon({ title, icon, text }: Props) {
  return (
    <Screen title={title}>
      <View style={styles.center}>
        <Ionicons name={icon} size={56} color={colors.primary} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  text: { color: colors.muted, textAlign: "center", fontSize: 15 },
});
