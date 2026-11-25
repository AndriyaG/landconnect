import { StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { useEffect, useState } from "react";

import { errorMessage } from "@/api/client";
import { fetchCallToken } from "@/calls/api";
import { disconnectStreamClient, rememberStreamClient } from "@/calls/session";
import type { PublicUser } from "@/store/auth";

export function useStreamClient(user: PublicUser) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let instance: StreamVideoClient | undefined;
    fetchCallToken()
      .then((t) => {
        if (cancelled) return;
        instance = StreamVideoClient.getOrCreateInstance({
          apiKey: t.api_key,
          user: { id: t.user_id, name: user.name },
          token: t.token,
          tokenProvider: async () => (await fetchCallToken()).token,
        });
        rememberStreamClient(instance);
        if (cancelled) {
          disconnectStreamClient();
          return;
        }
        setClient(instance);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
      disconnectStreamClient();
    };
  }, [user.id, user.name, attempt]);

  const retry = () => {
    setError(null);
    setAttempt((a) => a + 1);
  };

  return { client, error, retry };
}
