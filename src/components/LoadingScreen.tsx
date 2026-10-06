import { FontAwesome5 } from "@expo/vector-icons";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";

import { BRAND } from "../styles/colors";

export const LoadingScreen = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: BRAND.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <StatusBar barStyle="dark-content" />
    <View
      style={{
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: BRAND.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}
    >
      <FontAwesome5 name="running" size={40} color="#fff" />
    </View>
    <Text
      style={{
        fontSize: 24,
        fontWeight: "900",
        color: BRAND.primaryDark,
        marginBottom: 6,
      }}
    >
      IFit
    </Text>
    <Text style={{ color: BRAND.primaryDark, opacity: 0.7, fontSize: 13 }}>
      BMI & Activity Tracker
    </Text>
    <ActivityIndicator
      color={BRAND.primary}
      size="large"
      style={{ marginTop: 30 }}
    />
  </View>
);