import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BRAND } from "../styles/colors";
import type { Theme } from "../styles/theme";
import type { ActivityType, HistoryFilter } from "../types";
import type { useHistory } from "../hooks/useHistory";
import {
  formatClock,
  formatDate,
  formatDurationShort,
  formatTime,
} from "../utils/format";

type HistoryModalProps = {
  theme: Theme;
  isDark: boolean;
  historyHook: ReturnType<typeof useHistory>;
  getActivityIcon: (type: ActivityType) => string;
};

export const HistoryModal = ({
  theme,
  isDark,
  historyHook,
  getActivityIcon,
}: HistoryModalProps) => {
  const { history, filtered, stats, historyFilter, historyModalVisible } =
    historyHook;

  return (
    <Modal
      visible={historyModalVisible}
      animationType="slide"
      onRequestClose={() => historyHook.setHistoryModalVisible(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity
            onPress={() => historyHook.setHistoryModalVisible(false)}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 4,
            }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}
            >
              Riwayat Lengkap
            </Text>
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>
              {filtered.length} dari {history.length} aktivitas
            </Text>
          </View>

          {history.length > 0 && (
            <TouchableOpacity
              onPress={historyHook.clearAll}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: BRAND.dangerSoft,
              }}
            >
              <Text
                style={{
                  color: BRAND.danger,
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                Hapus Semua
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          {(["Semua", "Joging", "Lari", "Bersepeda"] as HistoryFilter[]).map(
            (f) => {
              const active = historyFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => historyHook.setHistoryFilter(f)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? BRAND.primary : theme.soft,
                    borderWidth: 1,
                    borderColor: active ? BRAND.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#fff" : theme.muted,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {history.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: theme.card,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            {[
              { label: "SESI", value: `${stats.totalSessions}` },
              { label: "TOTAL KM", value: stats.totalKm.toFixed(1) },
              {
                label: "WAKTU",
                value: formatDurationShort(stats.totalDuration),
              },
              {
                label: "KCAL",
                value: stats.totalCalories.toFixed(0),
              },
            ].map((s) => (
              <View key={s.label} style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 9,
                    fontWeight: "700",
                  }}
                >
                  {s.label}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "900",
                    marginTop: 3,
                  }}
                >
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {filtered.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 30,
            }}
          >
            <MaterialCommunityIcons
              name="history"
              size={50}
              color={theme.muted}
            />
            <Text
              style={{
                color: theme.muted,
                fontSize: 14,
                fontWeight: "700",
                marginTop: 12,
                textAlign: "center",
              }}
            >
              {history.length === 0
                ? "Belum ada riwayat aktivitas."
                : `Tidak ada riwayat ${historyFilter}.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: BRAND.primarySoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesome5
                        name={getActivityIcon(item.activityType)}
                        size={16}
                        color={BRAND.primary}
                      />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "900",
                          fontSize: 14,
                        }}
                      >
                        {item.activityType}
                      </Text>
                      <Text
                        style={{
                          color: theme.muted,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {formatDate(item.date)} • {formatClock(item.date)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => historyHook.deleteItem(item.id)}
                    style={{
                      width: 36,
                      height: 36,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color={BRAND.danger}
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: theme.muted,
                        fontSize: 9,
                        fontWeight: "700",
                      }}
                    >
                      JARAK
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "900",
                        marginTop: 3,
                      }}
                    >
                      {item.distance.toFixed(2)}
                    </Text>
                    <Text
                      style={{ color: theme.muted, fontSize: 9, marginTop: 1 }}
                    >
                      km
                    </Text>
                  </View>

                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: theme.muted,
                        fontSize: 9,
                        fontWeight: "700",
                      }}
                    >
                      WAKTU
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "900",
                        marginTop: 3,
                      }}
                    >
                      {formatTime(item.duration)}
                    </Text>
                    <Text
                      style={{ color: theme.muted, fontSize: 9, marginTop: 1 }}
                    >
                      aktif {formatTime(item.activeDuration)}
                    </Text>
                  </View>

                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: theme.muted,
                        fontSize: 9,
                        fontWeight: "700",
                      }}
                    >
                      KCAL
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "900",
                        marginTop: 3,
                      }}
                    >
                      {item.calories.toFixed(0)}
                    </Text>
                    <Text
                      style={{ color: theme.muted, fontSize: 9, marginTop: 1 }}
                    >
                      kalori
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};