import { callManager, type Call, type StreamVideoClient } from "@stream-io/video-react-native-sdk";

export function isVideoCall(call: Call): boolean {
  return Boolean(call.state.custom?.video);
}

export async function prepareMedia(call: Call, video: boolean) {
  callManager.start({ audioRole: "communicator", deviceEndpointType: video ? "speaker" : "earpiece" });
  await call.microphone.enable();
  if (video) await call.camera.enable();
  else await call.camera.disable();
}

export async function startRingingCall(client: StreamVideoClient, myId: string, peerId: string, video: boolean) {
  const callId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const call = client.call("default", callId);
  await call.getOrCreate({
    ring: true,
    video,
    data: { members: [{ user_id: myId }, { user_id: peerId }], custom: { video } },
  });
  await prepareMedia(call, video);
  return call;
}

export function otherMemberName(call: Call): string {
  const me = call.currentUserId;
  const other = call.state.members.find((m) => m.user_id !== me);
  return other?.user.name || (other ? `User ${other.user_id}` : "Unknown");
}
