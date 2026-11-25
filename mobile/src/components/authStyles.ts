import { StyleSheet } from "react-native";

import { colors } from "@/theme";

export const authStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  error: { color: colors.danger },
  link: { color: colors.primary, textAlign: "center", marginTop: 8, fontWeight: "600" },
});
