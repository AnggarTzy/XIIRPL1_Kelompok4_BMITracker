import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Animated,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BRAND } from "../styles/colors";
import { globalStyles as styles } from "../styles/globalStyles";
import type { Theme } from "../styles/theme";
import { SIDEBAR_HISTORY_PREVIEW } from "../constants/config";
import type { ActivityType } from "../types";
import type { useAuth } from "../hooks/useAuth";
import type { useProfile } from "../hooks/useProfile";
import type { useHistory } from "../hooks/useHistory";
import {
  formatClock,
  formatDate,
  formatDurationShort,
  formatTime,
} from "../utils/format";

type SidebarProps = {
  visible: boolean;
  onClose: () => void;
  drawerAnim: Animated.Value;
  theme: Theme;
  isDark: boolean;
  toggleDarkMode: (v: boolean) => void;
  auth: ReturnType<typeof useAuth>;
  profile: ReturnType<typeof useProfile>;
  historyHook: ReturnType<typeof useHistory>;
  getActivityIcon: (type: ActivityType) => string;
};

export const Sidebar = ({
  visible,
  onClose,
  drawerAnim,
  theme,
  isDark,
  toggleDarkMode,
  auth,
  profile,
  historyHook,
  getActivityIcon,
}: SidebarProps) => {
  const { history, stats } = historyHook;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: theme.drawer,
              transform: [{ translateX: drawerAnim }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <View style={[styles.avatar, { backgroundColor: BRAND.primary }]}>
              <FontAwesome5 name="user" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.drawerTitle, { color: theme.text }]}>
                {auth.currentUser ?? "IFit"}
              </Text>
              <Text style={[styles.drawerSubtitle, { color: theme.muted }]}>
                🔥 Streak {auth.streakData.current} hari
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={27}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Informasi Pribadi
            </Text>

            <Text style={[styles.drawerLabel, { color: theme.muted }]}>
              Nama
            </Text>
            <TextInput
              value={profile.profileName}
              onChangeText={profile.setProfileName}
              style={[
                styles.drawerInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.input,
                },
              ]}
              placeholder="Nama kamu"
              placeholderTextColor={theme.muted}
            />

            <View style={styles.profileInfo}>
              <View>
                <Text style={[styles.profileLabel, { color: theme.muted }]}>
                  Gender
                </Text>
                <Text style={[styles.profileValue, { color: theme.text }]}>
                  {profile.gender}
                </Text>
              </View>
              <View>
                <Text style={[styles.profileLabel, { color: theme.muted }]}>
                  Usia
                </Text>
                <Text style={[styles.profileValue, { color: theme.text }]}>
                  {profile.age ? `${profile.age} tahun` : "-"}
                </Text>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <View>
                <Text style={[styles.profileLabel, { color: theme.muted }]}>
                  Berat
                </Text>
                <Text style={[styles.profileValue, { color: theme.text }]}>
                  {profile.weight ? `${profile.weight} kg` : "-"}
                </Text>
              </View>
              <View>
                <Text style={[styles.profileLabel, { color: theme.muted }]}>
                  Tinggi
                </Text>
                <Text style={[styles.profileValue, { color: theme.text }]}>
                  {profile.height ? `${profile.height} cm` : "-"}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Tampilan
            </Text>

            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: BRAND.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name={isDark ? "weather-night" : "white-balance-sunny"}
                  size={20}
                  color={BRAND.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Mode {isDark ? "Gelap" : "Terang"}
                </Text>
                <Text
                  style={[styles.settingDescription, { color: theme.muted }]}
                >
                  Ubah tampilan aplikasi
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(v) => void toggleDarkMode(v)}
                trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                thumbColor={isDark ? BRAND.primary : "#F8FAFC"}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text, marginBottom: 0 },
                ]}
              >
                Riwayat Aktivitas
              </Text>
              {history.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    setTimeout(
                      () => historyHook.setHistoryModalVisible(true),
                      250
                    );
                  }}
                >
                  <Text
                    style={{
                      color: BRAND.primary,
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    Lihat Semua
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {history.length > 0 && (
              <View
                style={{
                  backgroundColor: isDark ? "#064E3B" : BRAND.primarySoft,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isDark ? "#10B981" : BRAND.primaryLight,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? "#6EE7B7" : BRAND.primaryDark,
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    TOTAL AKTIVITAS
                  </Text>
                  <Text
                    style={{
                      color: isDark ? "#F8FAFC" : theme.text,
                      fontSize: 10,
                      fontWeight: "900",
                    }}
                  >
                    {stats.totalSessions} sesi
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <FontAwesome5
                      name="route"
                      size={14}
                      color={BRAND.primary}
                    />
                    <Text
                      style={{
                        color: isDark ? "#F8FAFC" : theme.text,
                        fontSize: 12,
                        fontWeight: "900",
                        marginTop: 4,
                      }}
                    >
                      {stats.totalKm.toFixed(1)}
                    </Text>
                    <Text
                      style={{
                        color: isDark ? "#CBD5E1" : theme.muted,
                        fontSize: 9,
                        fontWeight: "700",
                        marginTop: 1,
                      }}
                    >
                      KM
                    </Text>
                  </View>

                  <View style={{ alignItems: "center", flex: 1 }}>
                    <FontAwesome5
                      name="stopwatch"
                      size={14}
                      color={BRAND.accent}
                    />
                    <Text
                      style={{
                        color: isDark ? "#F8FAFC" : theme.text,
                        fontSize: 12,
                        fontWeight: "900",
                        marginTop: 4,
                      }}
                    >
                      {formatDurationShort(stats.totalDuration)}
                    </Text>
                    <Text
                      style={{
                        color: isDark ? "#CBD5E1" : theme.muted,
                        fontSize: 9,
                        fontWeight: "700",
                        marginTop: 1,
                      }}
                    >
                      WAKTU
                    </Text>
                  </View>

                  <View style={{ alignItems: "center", flex: 1 }}>
                    <FontAwesome5
                      name="fire-alt"
                      size={14}
                      color={BRAND.danger}
                    />
                    <Text
                      style={{
                        color: isDark ? "#F8FAFC" : theme.text,
                        fontSize: 12,
                        fontWeight: "900",
                        marginTop: 4,
                      }}
                    >
                      {stats.totalCalories.toFixed(0)}
                    </Text>
                    <Text
                      style={{
                        color: isDark ? "#CBD5E1" : theme.muted,
                        fontSize: 9,
                        fontWeight: "700",
                        marginTop: 1,
                      }}
                    >
                      KCAL
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {history.length === 0 ? (
              <View style={[styles.aboutBox, { backgroundColor: theme.soft }]}>
                <MaterialCommunityIcons
                  name="history"
                  size={20}
                  color={theme.muted}
                />
                <Text style={[styles.aboutText, { color: theme.muted }]}>
                  Belum ada riwayat. Selesaikan satu sesi tracking lalu tekan
                  "Berhenti" untuk menyimpan riwayat.
                </Text>
              </View>
            ) : (
              history.slice(0, SIDEBAR_HISTORY_PREVIEW).map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: theme.soft,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: BRAND.primarySoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FontAwesome5
                          name={getActivityIcon(item.activityType)}
                          size={14}
                          color={BRAND.primary}
                        />
                      </View>
                      <View>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "800",
                            fontSize: 13,
                          }}
                        >
                          {item.activityType}
                        </Text>
                        <Text
                          style={{
                            color: theme.muted,
                            fontSize: 10,
                            marginTop: 1,
                          }}
                        >
                          {formatDate(item.date)} • {formatClock(item.date)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => historyHook.deleteItem(item.id)}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={BRAND.danger}
                      />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 4,
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
                          fontSize: 13,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {item.distance.toFixed(2)} km
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
                          fontSize: 13,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {formatTime(item.duration)}
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
                          fontSize: 13,
                          fontWeight: "900",
                          marginTop: 2,
                        }}
                      >
                        {item.calories.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {history.length > SIDEBAR_HISTORY_PREVIEW && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  setTimeout(
                    () => historyHook.setHistoryModalVisible(true),
                    250
                  );
                }}
                style={{
                  backgroundColor: BRAND.primarySoft,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: BRAND.primaryLight,
                }}
              >
                <Text
                  style={{
                    color: BRAND.primary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Lihat {history.length - SIDEBAR_HISTORY_PREVIEW} riwayat
                  lainnya →
                </Text>
              </TouchableOpacity>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              onPress={() => auth.handleLogout(onClose)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: BRAND.dangerSoft,
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
                gap: 10,
              }}
            >
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color={BRAND.danger}
              />
              <Text
                style={{
                  color: BRAND.danger,
                  fontSize: 14,
                  fontWeight: "900",
                  flex: 1,
                }}
              >
                Keluar Akun
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={BRAND.danger}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.aboutBox,
                { backgroundColor: theme.soft, marginTop: 6 },
              ]}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={BRAND.primary}
              />
              <Text style={[styles.aboutText, { color: theme.muted }]}>
                IFit membantu menghitung BMI dan memantau aktivitas menggunakan
                lokasi perangkat. Data profil pada tampilan ini hanya digunakan
                selama aplikasi berjalan.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};