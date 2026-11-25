import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { canList, useAuth } from "@/store/auth";
import { colors, Screen } from "@/theme";

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <Screen title="Profile">
      <View style={styles.body}>
        {user && (
          <View style={styles.card}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>{user.role}</Text>
            <Text style={styles.muted}>User ID {user.id}</Text>
          </View>
        )}
        {canList(user) && <PrimaryButton label="My listings" onPress={() => router.push("/my-listings")} />}
        <PrimaryButton label="Log out" color={colors.danger} onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 4 },
  name: { color: colors.text, fontSize: 20, fontWeight: "700" },
  role: { color: colors.primary, fontWeight: "600", textTransform: "capitalize" },
  muted: { color: colors.muted },
});
