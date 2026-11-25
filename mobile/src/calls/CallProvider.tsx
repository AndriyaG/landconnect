import {
  CallingState,
  StreamCall,
  StreamVideo,
  useCalls,
  type StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ActiveCall } from "@/calls/ActiveCall";
import { useStreamClient } from "@/calls/useStreamClient";
import { useAuth, type PublicUser } from "@/store/auth";

type CallContextValue = { client: StreamVideoClient | null; error: string | null; retry: () => void };

const CallContext = createContext<CallContextValue>({ client: null, error: null, retry: () => {} });

export const useCallClient = () => useContext(CallContext);

export function CallProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!user) return children;
  return <Connected user={user}>{children}</Connected>;
}

function Connected({ user, children }: { user: PublicUser; children: ReactNode }) {
  const value = useStreamClient(user);
  return (
    <CallContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {value.client && (
          <StreamVideo client={value.client}>
            <ActiveCallOverlay />
          </StreamVideo>
        )}
      </View>
    </CallContext.Provider>
  );
}

function ActiveCallOverlay() {
  const calls = useCalls();
  const active = calls.find((c) => c.state.callingState !== CallingState.LEFT);
  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <StreamCall call={active}>
        <ActiveCall />
      </StreamCall>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
