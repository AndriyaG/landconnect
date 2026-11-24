import { useCall } from "@stream-io/video-react-native-sdk";
import { useEffect } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isVideoCall, otherMemberName } from "@/calls/media";
import { RoundButton } from "@/components/RoundButton";
import { colors } from "@/theme";

export function OutgoingCall() {
  const call = useCall()!;
  const cancel = () => {
    call.leave({ reject: true, reason: "cancel" }).catch(() => {});
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      call.leave({ reject: true, reason: "cancel" }).catch(() => {});
      return true;
    });
    return () => sub.remove();
  }, [call]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.info}>
        <Text style={styles.kind}>{isVideoCall(call) ? "Video" : "Audio"} call</Text>
        <Text style={styles.name}>{otherMemberName(call)}</Text>
        <Text style={styles.kind}>Ringing…</Text>
      </View>
      <View style={styles.actions}>
        <RoundButton label="Cancel" accessibilityLabel="Cancel call" color={colors.danger} onPress={cancel} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDark, justifyContent: "space-between", padding: 24 },
  info: { alignItems: "center", marginTop: 80, gap: 12 },
  kind: { color: "#d9fdd3", fontSize: 16 },
  name: { color: "#fff", fontSize: 30, fontWeight: "700" },
  actions: { alignItems: "center", marginBottom: 48 },
});
