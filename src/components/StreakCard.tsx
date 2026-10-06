import { FontAwesome5 } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { BRAND } from "../styles/colors";
import { globalStyles as styles } from "../styles/globalStyles";
import type { StreakData } from "../types";
import type { Theme } from "../styles/theme";

type StreakCardProps = {
  streakData: StreakData;
  theme: Theme;
};

export const StreakCard = ({ streakData, theme }: StreakCardProps) => (
  <View style={[styles.card, { backgroundColor: theme.card }]}>
    <View style={styles.cardHeader}>
      <View
        style={[styles.iconCircle, { backgroundColor: BRAND.warningSoft }]}
      >
        <FontAwesome5 name="fire" size={22} color={BRAND.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Streak Login
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
          Login berturut-turut tiap hari
        </Text>
      </View>
    </View>

    <View style={{ flexDirection: "row", gap: 10 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: BRAND.warningSoft,
          borderRadius: 14,
          padding: 14,
          alignItems: "center",
        }}
      >
        <FontAwesome5 name="fire" size={20} color={BRAND.warning} />
        <Text
          style={{
            color: "#7C2D12",
            fontSize: 26,
            fontWeight: "900",
            marginTop: 6,
          }}
        >
          {streakData.current}
        </Text>
        <Text
          style={{
            color: "#9A3412",
            fontSize: 10,
            fontWeight: "800",
            marginTop: 2,
          }}
        >
          STREAK SEKARANG
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: BRAND.primarySoft,
          borderRadius: 14,
          padding: 14,
          alignItems: "center",
        }}
      >
        <FontAwesome5 name="trophy" size={20} color={BRAND.primary} />
        <Text
          style={{
            color: BRAND.primaryDark,
            fontSize: 26,
            fontWeight: "900",
            marginTop: 6,
          }}
        >
          {streakData.longest}
        </Text>
        <Text
          style={{
            color: BRAND.primaryDark,
            fontSize: 10,
            fontWeight: "800",
            marginTop: 2,
          }}
        >
          TERLAMA
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: BRAND.accentSoft,
          borderRadius: 14,
          padding: 14,
          alignItems: "center",
        }}
      >
        <FontAwesome5 name="calendar-check" size={20} color={BRAND.accent} />
        <Text
          style={{
            color: "#1E3A8A",
            fontSize: 26,
            fontWeight: "900",
            marginTop: 6,
          }}
        >
          {streakData.totalLoginDays}
        </Text>
        <Text
          style={{
            color: "#1E3A8A",
            fontSize: 10,
            fontWeight: "800",
            marginTop: 2,
          }}
        >
          TOTAL HARI
        </Text>
      </View>
    </View>

    {streakData.current > 0 && (
      <Text
        style={{
          color: theme.muted,
          fontSize: 11,
          textAlign: "center",
          marginTop: 12,
        }}
      >
        {streakData.current >= 7
          ? "🎉 Luar biasa! Streak kamu sudah seminggu lebih!"
          : streakData.current >= 3
            ? "💪 Bagus! Pertahankan streak kamu!"
            : "🔥 Ayo login besok untuk lanjut streak!"}
      </Text>
    )}
  </View>
);