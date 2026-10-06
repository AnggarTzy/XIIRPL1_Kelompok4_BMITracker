import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BRAND } from "../styles/colors";
import { globalStyles as styles } from "../styles/globalStyles";
import { getTheme } from "../styles/theme";
import {
  BACKGROUND_LOCATION_TASK,
  TRACKER_STORAGE_KEY,
} from "../constants/config";
import type { StoredTrackerState } from "../types";
import { getDistanceKm } from "../utils/distance";
import { getActivityIcon } from "../utils/icons";

import { useTheme } from "../hooks/useTheme";
import { useProfile } from "../hooks/useProfile";
import { useHistory } from "../hooks/useHistory";
import { useAuth } from "../hooks/useAuth";
import { useTracker } from "../hooks/useTracker";

import { LoadingScreen } from "../components/LoadingScreen";
import { LoginScreen } from "../components/LoginScreen";
import { StreakCard } from "../components/StreakCard";
import { BmiCard, type BmiAdvice } from "../components/BmiCard";
import { TrackerCard } from "../components/TrackerCard";
import { Sidebar } from "../components/Sidebar";
import { HistoryModal } from "../components/HistoryModal";

// ============================================================
// NOTIFICATION HANDLER
// ============================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("ifit-km", {
    name: "Pencapaian Jarak",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND.primary,
  });
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================
// BACKGROUND LOCATION TASK
// ============================================================

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.log("Background location error:", error);
      return;
    }

    const locations = (data as { locations?: Location.LocationObject[] })
      ?.locations;

    if (!locations?.length) return;

    try {
      const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
      if (!raw) return;

      const state: StoredTrackerState = JSON.parse(raw);
      if (!state.tracking) return;
      if (state.paused) return;

      const next = { ...state };
      if (typeof next.lastSpokenKm !== "number") next.lastSpokenKm = 0;

      const lastGps = locations[locations.length - 1];
      const point = {
        latitude: lastGps.coords.latitude,
        longitude: lastGps.coords.longitude,
      };
      const timestamp = lastGps.timestamp || Date.now();

      if (next.lastLocation && next.lastTimestamp) {
        const dist = getDistanceKm(
          next.lastLocation.latitude,
          next.lastLocation.longitude,
          point.latitude,
          point.longitude
        );

        const speed = lastGps.coords.speed;
        const accuracy = lastGps.coords.accuracy;
        const hasGoodAccuracy = accuracy == null || accuracy <= 30;
        const movingBySpeed = speed != null && speed >= 0.5;
        const movingByDistance = (speed == null || speed < 0) && dist >= 0.005;
        const moving = hasGoodAccuracy && (movingBySpeed || movingByDistance);

        if (moving && dist > 0 && dist <= 0.2) {
          const prevKm = Math.floor(next.distance);
          next.distance += dist;
          const currentKm = Math.floor(next.distance);

          const elapsed = Math.max(
            0,
            Math.floor((timestamp - next.lastTimestamp) / 1000)
          );
          next.activeDuration += Math.min(elapsed, 30);

          if (
            currentKm > prevKm &&
            currentKm >= 1 &&
            currentKm > next.lastSpokenKm
          ) {
            next.lastSpokenKm = currentKm;
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "🎉 Pencapaian Baru!",
                  body: `Kamu sudah mencapai ${currentKm} km!`,
                  sound: "default",
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  ...(Platform.OS === "android" && { channelId: "ifit-km" }),
                },
                trigger: null,
              });
            } catch (e) {
              console.log("BG notif error:", e);
            }
          }
        }
      }

      next.lastLocation = point;
      next.lastTimestamp = timestamp;

      await AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Background tracking error:", error);
    }
  });
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const themeHook = useTheme();
  const profile = useProfile();
  const historyHook = useHistory();

  const loadAll = async (newUserName?: string) => {
    await historyHook.load();
    await themeHook.load();
    await profile.load();
    if (newUserName) profile.setProfileName(newUserName);
    await recoverFromCrash();
  };

  const auth = useAuth({ onLoginSuccess: loadAll });

  const tracker = useTracker({
    weight: profile.weight,
    isLoggedIn: auth.isLoggedIn,
    onSaveHistory: historyHook.saveItem,
  });

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  const [bmiResult, setBmiResult] = useState<string | null>(null);
  const [bmiCategory, setBmiCategory] = useState("");
  const [idealWeight, setIdealWeight] = useState("");

  const { isDark, toggle: toggleDarkMode } = themeHook;
  const theme = getTheme(isDark);

  useEffect(() => {
    void auth.checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recoverFromCrash = async () => {
    try {
      const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
      if (!raw) return;
      const state: StoredTrackerState = JSON.parse(raw);
      if (state.tracking) {
        console.log("Recovering from crash — cleaning stale state");
        await AsyncStorage.setItem(
          TRACKER_STORAGE_KEY,
          JSON.stringify({
            ...state,
            tracking: false,
            paused: false,
            lastLocation: null,
            lastTimestamp: null,
          })
        );
      }
    } catch (e) {
      console.log("recoverFromCrash error:", e);
    }
  };

  useEffect(() => {
    if (!auth.isLoggedIn) return;
    if (
      profile.profileName === "Pengguna IFit" &&
      !profile.age &&
      !profile.weight &&
      !profile.height &&
      profile.gender === "Pria"
    ) {
      return;
    }
    void profile.save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile.profileName,
    profile.gender,
    profile.age,
    profile.weight,
    profile.height,
    auth.isLoggedIn,
  ]);

  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(drawerAnim, {
      toValue: -SCREEN_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  const calculateBMI = () => {
    if (!profile.weight || !profile.height || !profile.age) {
      Alert.alert(
        "Data belum lengkap",
        "Harap isi usia, berat, dan tinggi badan."
      );
      return;
    }

    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height) / 100;
    const userAge = parseInt(profile.age, 10);

    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      !Number.isFinite(userAge) ||
      w <= 0 ||
      h <= 0 ||
      userAge <= 0
    ) {
      Alert.alert(
        "Data tidak valid",
        "Masukkan usia, berat, dan tinggi dengan angka yang benar."
      );
      return;
    }

    const bmi = w / (h * h);
    setBmiResult(bmi.toFixed(1));

    if (bmi < 18.5) setBmiCategory("Kurus");
    else if (bmi < 25) setBmiCategory("Normal");
    else if (bmi < 30) setBmiCategory("Gemuk");
    else setBmiCategory("Obesitas");

    const heightCm = h * 100;
    const ideal =
      profile.gender === "Pria"
        ? 50 + 0.9 * (heightCm - 152)
        : 45.5 + 0.9 * (heightCm - 152);

    const minWeight = ideal * 0.9;
    const maxWeight = ideal * 1.1;

    setIdealWeight(
      `${minWeight.toFixed(1)} - ${maxWeight.toFixed(
        1
      )} kg (ideal: ${ideal.toFixed(1)} kg)`
    );
  };

  const getBmiAdvice = (): BmiAdvice => {
    switch (bmiCategory) {
      case "Kurus":
        return {
          title: "Fokus pada asupan yang cukup dan seimbang",
          message:
            "Usahakan makan teratur dan pilih makanan beragam. Jika berat sulit bertambah atau ada keluhan kesehatan, bicarakan dengan orang tua/wali dan tenaga kesehatan.",
          foods: [
            "Nasi/oat/kentang",
            "Telur & ikan",
            "Sayur & buah",
            "Susu/yogurt bila cocok",
          ],
          drinks: ["Air putih", "Susu", "Smoothie buah tanpa berlebihan gula"],
        };
      case "Normal":
        return {
          title: "Pertahankan kebiasaan sehat",
          message:
            "Pertahankan pola makan beragam, tidur cukup, minum air putih, dan tetap aktif. Tidak perlu melakukan diet ketat hanya karena angka BMI.",
          foods: [
            "Nasi/oat",
            "Ayam/ikan/telur",
            "Sayur & buah",
            "Kacang-kacangan",
          ],
          drinks: [
            "Air putih",
            "Susu/yogurt",
            "Jus buah tanpa tambahan gula berlebihan",
          ],
        };
      case "Gemuk":
        return {
          title: "Fokus pada kebiasaan sehat, bukan diet ketat",
          message:
            "Utamakan makan teratur, makanan beragam, aktivitas fisik, dan tidur cukup. Karena usia di bawah 18 tahun masih dalam masa pertumbuhan, jangan melakukan pembatasan makan atau program penurunan berat badan tanpa arahan tenaga kesehatan.",
          foods: [
            "Sayur & buah",
            "Ikan/ayam/telur",
            "Nasi atau sumber karbohidrat",
            "Kacang-kacangan",
          ],
          drinks: [
            "Air putih",
            "Susu sesuai kebutuhan",
            "Minuman tanpa tambahan gula berlebihan",
          ],
        };
      case "Obesitas":
        return {
          title: "Jaga kesehatan dengan pendampingan yang tepat",
          message:
            "Jangan melakukan diet ekstrem atau melewatkan makan. Untuk usia sekolah/remaja, hasil BMI perlu dinilai berdasarkan usia dan jenis kelamin oleh tenaga kesehatan. Diskusikan hasil ini dengan orang tua/wali dan tenaga kesehatan.",
          foods: [
            "Sayur & buah",
            "Protein: ikan/ayam/telur",
            "Karbohidrat secukupnya",
            "Kacang-kacangan",
          ],
          drinks: [
            "Air putih",
            "Susu sesuai kebutuhan",
            "Batasi minuman sangat manis",
          ],
        };
      default:
        return null;
    }
  };

  const advice = getBmiAdvice();

  if (auth.isCheckingSession) return <LoadingScreen />;

  if (!auth.isLoggedIn) return <LoginScreen auth={auth} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* HEADER */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={[
                styles.logoCircle,
                { backgroundColor: BRAND.primarySoft },
              ]}
            >
              <FontAwesome5 name="running" size={18} color={BRAND.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[styles.headerTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                Hai, {profile.profileName.split(" ")[0]}!
              </Text>
              <Text
                style={[styles.headerSub, { color: theme.muted }]}
                numberOfLines={1}
              >
                🔥 Streak {auth.streakData.current} hari • Total{" "}
                {auth.streakData.totalLoginDays} hari login
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={openSidebar}>
            <MaterialCommunityIcons name="menu" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StreakCard streakData={auth.streakData} theme={theme} />

          <BmiCard
            theme={theme}
            profile={profile}
            bmiResult={bmiResult}
            bmiCategory={bmiCategory}
            idealWeight={idealWeight}
            advice={advice}
            onCalculate={calculateBMI}
          />

          <TrackerCard theme={theme} tracker={tracker} />

          <Text style={[styles.footer, { color: theme.muted }]}>
            IFit • BMI & Activity Tracker
          </Text>
        </ScrollView>

        <Sidebar
          visible={sidebarVisible}
          onClose={closeSidebar}
          drawerAnim={drawerAnim}
          theme={theme}
          isDark={isDark}
          toggleDarkMode={toggleDarkMode}
          auth={auth}
          profile={profile}
          historyHook={historyHook}
          getActivityIcon={getActivityIcon}
        />

        <HistoryModal
          theme={theme}
          isDark={isDark}
          historyHook={historyHook}
          getActivityIcon={getActivityIcon}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}