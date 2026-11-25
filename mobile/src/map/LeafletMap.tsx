import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { API_URL } from "@/api/client";
import { colors } from "@/theme";

import { leafletHtml, type MapOptions } from "./leafletHtml";

export type MapMessage =
  | { type: "ready" }
  | { type: "error" }
  | { type: "pick"; lat: number; lng: number }
  | { type: "bounds"; bbox: string }
  | { type: "open"; id: number };

export type LeafletMapHandle = { call: (fn: string, ...args: unknown[]) => void };

type Props = {
  ref?: Ref<LeafletMapHandle>;
  options: Omit<MapOptions, "color">;
  onMessage?: (msg: MapMessage) => void;
};

export function LeafletMap({ ref, options, onMessage }: Props) {
  const webRef = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const queue = useRef<string[]>([]);
  const [html] = useState(() => leafletHtml({ ...options, color: colors.primary }));
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    call: (fn, ...args) => {
      const js = `window.${fn} && window.${fn}.apply(null, ${JSON.stringify(args)}); true;`;
      if (ready.current) webRef.current?.injectJavaScript(js);
      else queue.current.push(js);
    },
  }), []);

  const handleMessage = (e: WebViewMessageEvent) => {
    let msg: MapMessage;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") {
      ready.current = true;
      queue.current.splice(0).forEach((js) => webRef.current?.injectJavaScript(js));
    } else if (msg.type === "error") {
      setFailed(true);
    }
    onMessage?.(msg);
  };

  return (
    <View style={styles.root}>
      <WebView<object>
        ref={webRef}
        source={{ html, baseUrl: API_URL ?? "" }}
        originWhitelist={["*"]}
        onMessage={handleMessage}
        onError={() => setFailed(true)}
        nestedScrollEnabled
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
      />
      {failed && (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>Map failed to load. Check your internet connection.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.border },
  error: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: colors.background },
  errorText: { color: colors.danger, textAlign: "center" },
});
