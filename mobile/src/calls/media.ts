import { callManager, type Call, type StreamVideoClient } from "@stream-io/video-react-native-sdk";

import { queryClient } from "@/api/queryClient";
import { callFailureMessage, joinMeeting, reportCallStatus, startCall, type CallKind } from "@/calls/api";
import { permissionDeniedMessage, requestCallPermissions } from "@/calls/permissions";

export function isVideoCall(call: Call): boolean {
  return Boolean(call.state.custom?.video);
}

export async function prepareMedia(call: Call, video: boolean) {
  callManager.start({ audioRole: "communicator", deviceEndpointType: video ? "speaker" : "earpiece" });
  await call.microphone.enable();
  if (video) await call.camera.enable();
  else await call.camera.disable();
}

async function enterCall(client: StreamVideoClient, callId: string, video: boolean) {
  const call = client.call("default", callId);
  await call.get();
  await prepareMedia(call, video);
  await call.join();
  return call;
}

export async function placeCall(client: StreamVideoClient, calleeId: number, type: CallKind) {
  const video = type === "video";
  if (!(await requestCallPermissions(video))) throw new Error(permissionDeniedMessage(video));
  let callId: string;
  try {
    callId = await startCall(calleeId, type);
  } catch (e) {
    throw new Error(callFailureMessage(e));
  }
  await enterCall(client, callId, video);
}

export async function joinMeetingCall(client: StreamVideoClient, meetingId: number) {
  if (!(await requestCallPermissions(true))) throw new Error(permissionDeniedMessage(true));
  const callId = await joinMeeting(meetingId);
  await enterCall(client, callId, true);
}

export async function reportLoggedStatus(call: Call, status: "accepted" | "rejected" | "ended" | "missed") {
  if (call.state.custom?.logged === false) return;
  try {
    await reportCallStatus(call.id, status);
  } catch {
    return;
  }
  await queryClient.invalidateQueries({ queryKey: ["call-history"] });
}

export function otherMemberName(call: Call): string {
  const me = call.currentUserId;
  const other = call.state.members.find((m) => m.user_id !== me);
  return other?.user.name || (other ? `User ${other.user_id}` : "Unknown");
}
