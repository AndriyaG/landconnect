import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { login, register } from "@/api/auth";
import { errorMessage } from "@/api/client";
import { Header } from "@/components/Header";
import { useAuth, type Role } from "@/store/auth";
import { colors } from "@/theme";

const ROLES: Role[] = ["buyer", "seller", "broker"];

export default function LoginScreen() {
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const session = isRegister
        ? await register(name.trim(), email.trim(), password, role)
        : await login(email.trim(), password);
      await setSession(session);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      <Header title="LandConnect" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isRegister ? "Create account" : "Sign in"}</Text>
        {isRegister && (
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} accessibilityLabel="Name" />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password"
        />
        {isRegister && (
          <View style={styles.roles}>
            {ROLES.map((r) => (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ selected: role === r }}
                accessibilityLabel={`Role ${r}`}
                onPress={() => setRole(r)}
                style={[styles.chip, role === r && styles.chipSelected]}
              >
                <Text style={[styles.chipText, role === r && styles.chipTextSelected]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRegister ? "Create account" : "Sign in"}
          style={[styles.button, busy && styles.disabled]}
          disabled={busy}
          onPress={submit}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isRegister ? "Register" : "Login"}</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRegister ? "Switch to sign in" : "Switch to create account"}
          onPress={() => {
            setMode(isRegister ? "login" : "register");
            setError(null);
          }}
        >
          <Text style={styles.link}>{isRegister ? "Have an account? Sign in" : "New here? Create an account"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  roles: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, textTransform: "capitalize" },
  chipTextSelected: { color: "#fff" },
  error: { color: colors.danger },
  button: { backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
  link: { color: colors.primary, textAlign: "center", marginTop: 8, fontWeight: "600" },
});
