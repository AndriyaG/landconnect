import type { StreamVideoClient } from "@stream-io/video-react-native-sdk";

let active: StreamVideoClient | null = null;

export function rememberStreamClient(client: StreamVideoClient | null) {
  active = client;
}

export function disconnectStreamClient() {
  const current = active;
  active = null;
  current?.disconnectUser().catch(() => {});
}
