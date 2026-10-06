import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BRAND } from "../styles/colors";
import type { useAuth } from "../hooks/useAuth";

type LoginScreenProps = {
  auth: ReturnType<typeof useAuth>;
};

export const LoginScreen = ({ auth }: LoginScreenProps) => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.primarySoft }}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 28,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 26,
                  backgroundColor: BRAND.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  shadowColor: BRAND.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <FontAwesome5 name="running" size={44} color="#fff" />
              </View>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "900",
                  color: BRAND.primaryDark,
                }}
              >
                IFit
              </Text>
              <Text
                style={{
                  color: BRAND.primaryDark,
                  opacity: 0.7,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                BMI & Activity Tracker
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 22,
                padding: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <MaterialCommunityIcons
                  name={auth.hasAccount ? "login" : "account-plus"}
                  size={22}
                  color={BRAND.primary}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: "#0F172A",
                    marginLeft: 8,
                  }}
                >
                  {auth.hasAccount ? "Masuk" : "Daftar Akun"}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  marginBottom: 20,
                  lineHeight: 18,
                }}
              >
                {auth.hasAccount
                  ? "Masukkan nama dan PIN kamu untuk melanjutkan."
                  : "Buat akun baru dengan nama dan PIN 4-6 digit."}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Nama
              </Text>
              <TextInput
                value={auth.loginName}
                onChangeText={(t) => {
                  auth.setLoginName(t);
                  auth.setLoginError("");
                }}
                placeholder="Nama kamu"
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  color: "#0F172A",
                  backgroundColor: "#F8FAFC",
                  marginBottom: 14,
                  fontWeight: "600",
                }}
                editable={!auth.isRegistering}
              />

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                PIN (4-6 digit)
              </Text>
              <TextInput
                value={auth.loginPin}
                onChangeText={(t) => {
                  auth.setLoginPin(t.replace(/\D/g, "").slice(0, 6));
                  auth.setLoginError("");
                }}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                style={{
                  borderWidth: 1.5,
                  borderColor: "#E2E8F0",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 18,
                  color: "#0F172A",
                  backgroundColor: "#F8FAFC",
                  marginBottom: 14,
                  letterSpacing: 6,
                  textAlign: "center",
                  fontWeight: "800",
                }}
              />

              {auth.isRegistering && (
                <>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#475569",
                      marginBottom: 6,
                    }}
                  >
                    Konfirmasi PIN
                  </Text>
                  <TextInput
                    value={auth.confirmPin}
                    onChangeText={(t) => {
                      auth.setConfirmPin(t.replace(/\D/g, "").slice(0, 6));
                      auth.setLoginError("");
                    }}
                    placeholder="••••"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    style={{
                      borderWidth: 1.5,
                      borderColor: "#E2E8F0",
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 18,
                      color: "#0F172A",
                      backgroundColor: "#F8FAFC",
                      marginBottom: 14,
                      letterSpacing: 6,
                      textAlign: "center",
                      fontWeight: "800",
                    }}
                  />
                </>
              )}

              {auth.loginError ? (
                <View
                  style={{
                    backgroundColor: BRAND.dangerSoft,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={18}
                    color={BRAND.danger}
                  />
                  <Text
                    style={{
                      color: BRAND.danger,
                      fontSize: 12,
                      fontWeight: "700",
                      flex: 1,
                    }}
                  >
                    {auth.loginError}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => {
                  if (auth.isRegistering) {
                    void auth.handleRegister();
                  } else {
                    void auth.handleLogin();
                  }
                }}
                style={{
                  backgroundColor: BRAND.primary,
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: BRAND.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <MaterialCommunityIcons
                  name={auth.isRegistering ? "check" : "login"}
                  size={20}
                  color="#fff"
                />
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}
                >
                  {auth.isRegistering ? "Daftar Sekarang" : "Masuk"}
                </Text>
              </TouchableOpacity>

              {auth.isRegistering && (
                <TouchableOpacity
                  onPress={() => {
                    auth.setIsRegistering(false);
                    auth.setConfirmPin("");
                    auth.setLoginError("");
                  }}
                  style={{
                    marginTop: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#64748B",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    Batal
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text
              style={{
                textAlign: "center",
                color: BRAND.primaryDark,
                opacity: 0.5,
                fontSize: 11,
                marginTop: 20,
              }}
            >
              Data tersimpan aman di perangkat kamu
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};