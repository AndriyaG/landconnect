import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { fetchMe } from "@/api/auth";
import { queryClient } from "@/api/queryClient";
import { canList, useAuth } from "@/store/auth";
import { colors } from "@/theme";

export default function RootLayout() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const hydrate = useAuth((s) => s.hydrate);
  const setUser = useAuth((s) => s.setUser);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token) fetchMe().then(setUser).catch(() => {});
  }, [token, setUser]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="+not-found" />
            <Stack.Protected guard={hydrated && !!token}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="listing/[id]" />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="meeting-new" />
              <Stack.Protected guard={canList(user)}>
                <Stack.Screen name="my-listings" />
                <Stack.Screen name="listing-form" />
              </Stack.Protected>
            </Stack.Protected>
            <Stack.Protected guard={hydrated && !token}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
