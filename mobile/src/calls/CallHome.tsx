import { CallingState, StreamCall, useCalls, useStreamVideoClient } from "@stream-io/video-react-native-sdk";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { errorMessage } from "@/api/client";
import { ActiveCall } from "@/calls/ActiveCall";
import { startRingingCall } from "@/calls/media";
import { permissionDeniedMessage, requestCallPermissions } from "@/calls/permissions";
import { Header } from "@/components/Header";
import type { PublicUser } from "@/store/auth";
import { colors } from "@/theme";

type Props = { me: PublicUser; onLogout: () => void };

export function CallHome({ me, onLogout }: Props) {
  const client = useStreamVideoClient()!;
  const calls = useCalls();
  const active = calls.find((c) => c.state.callingState !== CallingState.LEFT);
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
    <View style={styles.root}>
      <Header
        title="LandConnect"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout} hitSlop={12}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        }
      />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.muted}>Signed in as</Text>
          <Text style={styles.name}>
            {me.name} · {me.role}
          </Text>
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
            accessibilityLabel="User ID to call"
          />
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start audio call"
              style={[styles.callButton, busy && styles.disabled]}
              disabled={busy}
              onPress={() => call(false)}
            >
              <Text style={styles.callText}>Audio call</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start video call"
              style={[styles.callButton, busy && styles.disabled]}
              disabled={busy}
              onPress={() => call(true)}
            >
              <Text style={styles.callText}>Video call</Text>
            </Pressable>
          </View>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
      {active && (
        <View style={StyleSheet.absoluteFill}>
          <StreamCall call={active}>
            <ActiveCall />
          </StreamCall>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 6 },
  muted: { color: colors.muted, fontSize: 13 },
  name: { color: colors.text, fontSize: 18, fontWeight: "600", marginBottom: 8 },
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
  message: { color: colors.danger, marginTop: 8 },
  logout: { color: "#fff", fontWeight: "600" },
});
