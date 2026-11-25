import { useCall } from "@stream-io/video-react-native-sdk";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorMessage } from "@/api/client";
import { isVideoCall, otherMemberName, prepareMedia, reportLoggedStatus } from "@/calls/media";
import { permissionDeniedMessage, requestCallPermissions } from "@/calls/permissions";
import { RoundButton } from "@/components/RoundButton";
import { colors } from "@/theme";

export function IncomingCall() {
  const call = useCall()!;
  const video = isVideoCall(call);
  const caller = call.state.createdBy?.name || otherMemberName(call);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reject = () => {
    reportLoggedStatus(call, "rejected")
      .catch(() => {})
      .finally(() => {
        call.leave({ reject: true, reason: "decline" }).catch(() => {});
      });
  };

  useEffect(() => {
    Vibration.vibrate([0, 800, 800], true);
    return () => Vibration.cancel();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      reject();
      return true;
    });
    return () => sub.remove();
  }, [call]);

  const accept = async () => {
    setBusy(true);
    setMessage(null);
    Vibration.cancel();
    try {
      if (!(await requestCallPermissions(video))) {
        setMessage(permissionDeniedMessage(video));
        return;
      }
      await prepareMedia(call, video);
      await call.join();
      await reportLoggedStatus(call, "accepted");
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.info}>
        <Text style={styles.kind}>Incoming {video ? "video" : "audio"} call</Text>
        <Text style={styles.name}>{caller}</Text>
        {message && <Text style={styles.error}>{message}</Text>}
      </View>
      <View style={styles.actions}>
        <RoundButton label="Reject" accessibilityLabel="Reject call" color={colors.danger} onPress={reject} disabled={busy} />
        <RoundButton label="Accept" accessibilityLabel="Accept call" color={colors.accent} onPress={accept} disabled={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark, justifyContent: "space-between", padding: 24 },
  info: { alignItems: "center", marginTop: 80, gap: 12 },
  kind: { color: "#d9fdd3", fontSize: 16 },
  name: { color: "#fff", fontSize: 30, fontWeight: "700" },
  error: { color: "#fff", backgroundColor: colors.danger, padding: 12, borderRadius: 8, marginTop: 16, textAlign: "center" },
  actions: { flexDirection: "row", justifyContent: "space-around", marginBottom: 48 },
});
