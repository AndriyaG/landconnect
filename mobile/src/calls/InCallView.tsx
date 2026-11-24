import {
  CallingState,
  OwnCapability,
  ParticipantView,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { useEffect, useRef } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isVideoCall, otherMemberName } from "@/calls/media";
import { RoundButton } from "@/components/RoundButton";
import { colors } from "@/theme";

export function InCallView() {
  const call = useCall()!;
  const video = isVideoCall(call);
  const {
    useCallCallingState,
    useRemoteParticipants,
    useLocalParticipant,
    useMicrophoneState,
    useCameraState,
    useHasPermissions,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const remote = useRemoteParticipants();
  const local = useLocalParticipant();
  const { optimisticIsMute: micOff } = useMicrophoneState();
  const { optimisticIsMute: camOff } = useCameraState();
  const canEndForAll = useHasPermissions(OwnCapability.END_CALL);
  const hadRemote = useRef(false);

  useEffect(() => {
    if (remote.length > 0) hadRemote.current = true;
    else if (hadRemote.current && callingState === CallingState.JOINED) call.leave().catch(() => {});
  }, [remote.length, callingState, call]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const end = async () => {
    try {
      if (canEndForAll) await call.endCall();
      else await call.leave();
    } catch {
      await call.leave().catch(() => {});
    }
  };

  const peer = remote[0];
  const status =
    callingState === CallingState.JOINED ? (peer ? "Connected" : "Waiting for other user…") : "Connecting…";

  return (
    <View style={styles.root}>
      {video && peer ? (
        <ParticipantView participant={peer} trackType="videoTrack" style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.audioCard}>
          <Text style={styles.name}>{peer?.name || otherMemberName(call)}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
      )}
      {video && local && !camOff && (
        <ParticipantView participant={local} trackType="videoTrack" style={styles.selfView} objectFit="cover" />
      )}
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="none">
        {video && <Text style={styles.status}>{status}</Text>}
      </SafeAreaView>
      <SafeAreaView edges={["bottom"]} style={styles.controls}>
        <RoundButton
          label={micOff ? "Unmute" : "Mute"}
          accessibilityLabel={micOff ? "Unmute microphone" : "Mute microphone"}
          color={micOff ? colors.danger : "#3b4a54"}
          onPress={() => call.microphone.toggle()}
        />
        {video && (
          <RoundButton
            label={camOff ? "Cam on" : "Cam off"}
            accessibilityLabel={camOff ? "Turn camera on" : "Turn camera off"}
            color={camOff ? colors.danger : "#3b4a54"}
            onPress={() => call.camera.toggle()}
          />
        )}
        {video && (
          <RoundButton
            label="Flip"
            accessibilityLabel="Switch between front and back camera"
            color="#3b4a54"
            onPress={() => call.camera.flip()}
            disabled={camOff}
          />
        )}
        <RoundButton label="End" accessibilityLabel="End call" color={colors.danger} onPress={end} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b141a" },
  audioCard: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.primaryDark },
  name: { color: "#fff", fontSize: 30, fontWeight: "700" },
  status: { color: "#d9fdd3", fontSize: 16, textAlign: "center" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 12 },
  selfView: {
    position: "absolute",
    top: 72,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});
