import { CallingState, useCall, useCallStateHooks } from "@stream-io/video-react-native-sdk";

import { IncomingCall } from "@/calls/IncomingCall";
import { InCallView } from "@/calls/InCallView";
import { OutgoingCall } from "@/calls/OutgoingCall";

export function ActiveCall() {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const state = useCallCallingState();

  if (!call || state === CallingState.LEFT || state === CallingState.IDLE) return null;
  if (state === CallingState.RINGING) return call.isCreatedByMe ? <OutgoingCall /> : <IncomingCall />;
  return <InCallView />;
}
