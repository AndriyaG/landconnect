import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "./colors";
import { Header } from "./Header";

type Props = { title: string; back?: boolean; right?: ReactNode; children: ReactNode };

export function Screen({ title, back, right, children }: Props) {
  return (
    <View style={styles.root}>
      <Header title={title} back={back} right={right} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
