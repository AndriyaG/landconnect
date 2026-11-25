import type { StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { errorMessage } from "@/api/client";
import { useCallClient } from "@/calls/CallProvider";
import { startRingingCall } from "@/calls/media";
import { permissionDeniedMessage, requestCallPermissions } from "@/calls/permissions";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { PublicUser } from "@/store/auth";
import { colors } from "@/theme";

export function CallDialer({ me }: { me: PublicUser }) {
  const { client, error, retry } = useCallClient();

  if (client) return <Dialer client={client} me={me} />;
  return (
    <View style={styles.center}>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton label="Retry" onPress={retry} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>Connecting to call service…</Text>
        </>
      )}
    </View>
  );
}

function Dialer({ client, me }: { client: StreamVideoClient; me: PublicUser }) {
  const [peerId, setPeerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const off = client.on("call.rejected", (e) => {
      if (e.user.id === String(me.id)) return;
      setMessage(e.reason === "cancel" ? `${e.user.name || "Caller"} cancelled the call` : "Call was declined");
    });
    return () => off();
  }, [client, me.id]);

  const call = async (video: boolean) => {
    setMessage(null);
    const peer = peerId.trim();
    if (!/^\d+$/.test(peer)) return setMessage("Enter the other user's numeric ID.");
    if (peer === String(me.id)) return setMessage("You can't call yourself.");
    setBusy(true);
    try {
      if (!(await requestCallPermissions(video))) return setMessage(permissionDeniedMessage(video));
      await startRingingCall(client, String(me.id), peer, video);
    } catch (e) {
      setMessage(`Could not call user ${peer}. They must have signed in to the app at least once. (${errorMessage(e)})`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.body}>
      <View style={styles.card}>
        <Text style={styles.muted}>Your user ID</Text>
        <Text style={styles.myId} accessibilityLabel={`Your user ID is ${me.id}`}>
          {me.id}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Call user ID</Text>
        <TextInput
          style={styles.input}
          value={peerId}
          onChangeText={setPeerId}
          keyboardType="number-pad"
          placeholder="e.g. 2"
          placeholderTextColor={colors.muted}
          accessibilityLabel="User ID to call"
        />
        <View style={styles.row}>
          <CallButton label="Audio call" a11y="Start audio call" disabled={busy} onPress={() => call(false)} />
          <CallButton label="Video call" a11y="Start video call" disabled={busy} onPress={() => call(true)} />
        </View>
        {message && <Text style={styles.error}>{message}</Text>}
      </View>
    </View>
  );
}

type CallButtonProps = { label: string; a11y: string; disabled: boolean; onPress: () => void };

function CallButton({ label, a11y, disabled, onPress }: CallButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={[styles.callButton, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.callText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  body: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 6 },
  muted: { color: colors.muted, fontSize: 13 },
  myId: { color: colors.primary, fontSize: 40, fontWeight: "700" },
  label: { color: colors.text, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
  },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  callButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: "center" },
  callText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, textAlign: "center", marginTop: 8 },
});
