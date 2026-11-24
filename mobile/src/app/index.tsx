import { StreamVideo } from "@stream-io/video-react-native-sdk";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { CallHome } from "@/calls/CallHome";
import { useStreamClient } from "@/calls/useStreamClient";
import { Header } from "@/components/Header";
import { useAuth, type PublicUser } from "@/store/auth";
import { colors } from "@/theme";

export default function CallScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  if (!user) return null;
  return <Connected user={user} onLogout={logout} />;
}

function Connected({ user, onLogout }: { user: PublicUser; onLogout: () => void }) {
  const { client, error, retry } = useStreamClient(user);

  if (client) {
    return (
      <StreamVideo client={client}>
        <CallHome me={user} onLogout={onLogout} />
      </StreamVideo>
    );
  }

  return (
    <View style={styles.root}>
      <Header title="LandConnect" />
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry connecting" style={styles.button} onPress={retry}>
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout}>
              <Text style={styles.link}>Log out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.muted}>Connecting to call service…</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  muted: { color: colors.muted },
  error: { color: colors.danger, textAlign: "center" },
  button: { backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32 },
  buttonText: { color: "#fff", fontWeight: "700" },
  link: { color: colors.primary, fontWeight: "600" },
});
