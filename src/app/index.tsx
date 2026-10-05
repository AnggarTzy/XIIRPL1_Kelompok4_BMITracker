import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList } from "react-native";
import type { AppStateStatus } from "react-native";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// ============================================================
// BRAND
// ============================================================

const BRAND = {
  primary: "#10B981",
  primaryDark: "#059669",
  primaryLight: "#D1FAE5",
  primarySoft: "#ECFDF5",
  male: "#10B981",
  maleDark: "#059669",
  maleSoft: "#D1FAE5",
  female: "#0D9488",
  femaleDark: "#0F766E",
  femaleSoft: "#CCFBF1",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  warning: "#F59E0B",
  warningSoft: "#FFFBEB",
  purple: "#8B5CF6",
  purpleSoft: "#F5F3FF",
  accent: "#2563EB",
  accentSoft: "#EFF6FF",
};

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

// ============================================================
// TYPE
// ============================================================

type ActivityType = "Joging" | "Lari" | "Bersepeda";
type Gender = "Pria" | "Wanita";
type HistoryFilter = "Semua" | ActivityType;

type LatLng = { latitude: number; longitude: number };

type StoredTrackerState = {
  tracking: boolean;
  paused: boolean;
  activityType: ActivityType;
  weight: number;
  distance: number;
  activeDuration: number;
  lastLocation: LatLng | null;
  lastTimestamp: number | null;
  lastSpokenKm: number;
  startedAt: number | null;
};

type HistoryItem = {
  id: string;
  date: number;
  activityType: ActivityType;
  distance: number;
  duration: number;
  activeDuration: number;
  calories: number;
  pace: number;
};

// ============================================================
// CONSTANT
// ============================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MET_VALUES: Record<ActivityType, number> = {
  Joging: 7.0,
  Lari: 9.8,
  Bersepeda: 8.0,
};

const DEFAULT_REGION = {
  latitude: -7.250445,
  longitude: 112.768845,
};

const BACKGROUND_LOCATION_TASK = "IFIT_BACKGROUND_LOCATION";
const TRACKER_STORAGE_KEY = "@ifit_tracker_state";
const HISTORY_STORAGE_KEY = "@ifit_history";
const SETTINGS_STORAGE_KEY = "@ifit_settings";
const MAX_HISTORY = 200;
const SIDEBAR_HISTORY_PREVIEW = 5;
const AUTO_PAUSE_MS = 20000;

// ============================================================
// HELPERS
// ============================================================

const notifyKmReached = async (km: number) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎉 Pencapaian Baru!",
        body: `Kamu sudah mencapai ${km} km!`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === "android" && { channelId: "ifit-km" }),
      },
      trigger: null,
    });
  } catch (e) {
    console.log("Notif error:", e);
  }
};

// ============================================================
// GLOBAL DISTANCE
// ============================================================

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// ============================================================
// BACKGROUND LOCATION TASK
// ============================================================

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }) => {
      if (error) {
        console.log("Background location error:", error);
        return;
      }

      const locations = (
        data as { locations?: Location.LocationObject[] }
      )?.locations;

      if (!locations?.length) return;

      try {
        const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
        if (!raw) return;

        const state: StoredTrackerState = JSON.parse(raw);
        if (!state.tracking) return;
        if (state.paused) return;

        let next = { ...state };
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
          const movingByDistance =
            (speed == null || speed < 0) && dist >= 0.005;
          const moving =
            hasGoodAccuracy && (movingBySpeed || movingByDistance);

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
                    priority:
                      Notifications.AndroidNotificationPriority.HIGH,
                    ...(Platform.OS === "android" && {
                      channelId: "ifit-km",
                    }),
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

        await AsyncStorage.setItem(
          TRACKER_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (error) {
        console.log("Background tracking error:", error);
      }
    }
  );
}

// ============================================================
// LEAFLET MAP
// ============================================================

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    body { overflow: hidden; }
    .leaflet-control-attribution { font-size: 8px; }
    .user-marker-wrap {
      width: 38px; height: 38px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.16);
    }
    .user-arrow {
      width: 30px; height: 30px;
      transform-origin: 50% 50%;
      transition: transform 0.25s ease-out;
      filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.35));
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map("map", {
      zoomControl: true,
      attributionControl: true,
      touchZoom: true,
      doubleClickZoom: true,
      dragging: true,
      scrollWheelZoom: true
    }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const userIcon = L.divIcon({
      className: "",
      html:
        '<div class="user-marker-wrap">' +
        '<svg id="user-arrow" class="user-arrow" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M20 2 L37 36 L20 28 L3 36 Z" fill="#10B981" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="20" cy="23" r="2.5" fill="#FFFFFF"/>' +
        '</svg></div>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    let userMarker = null;
    const routeLine = L.polyline([], {
      color: "#10B981",
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    let userChangedMap = false;
    let firstLocationShown = false;

    map.on("zoomstart", function() { userChangedMap = true; });
    map.on("dragstart", function() { userChangedMap = true; });

    function updateMap(latitude, longitude, routeData, shouldFollow, heading) {
      const point = [latitude, longitude];
      if (!userMarker) {
        userMarker = L.marker(point, { icon: userIcon }).addTo(map);
      } else {
        userMarker.setLatLng(point);
      }
      const arrow = document.getElementById("user-arrow");
      if (arrow && typeof heading === "number" && Number.isFinite(heading)) {
        arrow.style.transform = "rotate(" + heading + "deg)";
      }
      if (Array.isArray(routeData)) {
        const coordinates = routeData.map(function(item) {
          return [item.latitude, item.longitude];
        });
        routeLine.setLatLngs(coordinates);
      }
      if (shouldFollow && !userChangedMap) {
        const targetZoom = map.getZoom() < 16 ? 17 : map.getZoom();
        map.setView(point, targetZoom, { animate: true, duration: 0.5 });
      } else if (shouldFollow && !firstLocationShown) {
        map.setView(point, 17, { animate: true, duration: 0.5 });
      }
      firstLocationShown = true;
    }

    function resetMap() {
      if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
      routeLine.setLatLngs([]);
      userChangedMap = false;
      firstLocationShown = false;
      map.setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 13);
    }

    if (typeof L === "undefined") {
      document.getElementById("map").innerHTML =
        '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:#E2E8F0;color:#475569;font:600 14px Arial;text-align:center;padding:20px;box-sizing:border-box;">Peta gagal dimuat. Periksa koneksi internet lalu coba lagi.</div>';
    } else if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage("LEAFLET_READY");
    }
  </script>
</body>
</html>
`;

// ============================================================
// APP
// ============================================================

export default function App() {
  // PROFIL
  const [profileName, setProfileName] = useState("Pengguna IFit");
  const [gender, setGender] = useState<Gender>("Pria");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // TEMA & SIDEBAR
  const [isDark, setIsDark] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  // BMI
  const [bmiResult, setBmiResult] = useState<string | null>(null);
  const [bmiCategory, setBmiCategory] = useState("");
  const [idealWeight, setIdealWeight] = useState("");

  // TRACKER
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("Joging");
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [calories, setCalories] = useState(0);
  const [pace, setPace] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [locationStatus, setLocationStatus] = useState("Lokasi belum aktif");
  const [locationSub, setLocationSub] =
    useState<Location.LocationSubscription | null>(null);

  // HISTORY
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("Semua");

  const lastLocation = useRef<LatLng | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [heading, setHeading] = useState(0);
  const lastHeadingRef = useRef(0);
  const lastSpokenKmRef = useRef(0);
  const distanceRef = useRef(0);
  const isMovingRef = useRef(false);
  const isPausedRef = useRef(false);
  const movingSamplesRef = useRef(0);
  const lastMovementAtRef = useRef<number>(Date.now());
  const autoPausedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTrackingRef = useRef(false);
  const backgroundSyncInProgressRef = useRef(false);
  
  // === FIX MASALAH 1 & 2 & 3 ===
  const pausedTotalRef = useRef(0);              // total ms di-pause
  const pauseStartedAtRef = useRef<number | null>(null);  // kapan mulai pause
  const stoppingRef = useRef(false);             // guard stop dobel
  const activityTypeRef = useRef<ActivityType>("Joging");  // untuk akses di closure
  const sessionIdRef = useRef<string | null>(null);  // ID unik per sesi

  // ANIMATION
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // SINKRONISASI REF ↔ STATE
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    activityTypeRef.current = activityType;
  }, [activityType]);

  // LOAD SETTINGS & HISTORY
  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    await loadHistory();
    await loadSettings();
    await recoverFromCrash();
  };

  // === FIX MASALAH 3: recover from crash ===
  const recoverFromCrash = async () => {
    try {
      const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
      if (!raw) return;
      const state: StoredTrackerState = JSON.parse(raw);
      // Kalau ada state "tracking=true" tapi app baru buka
      // berarti app sebelumnya crash → bersihkan state
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
      // Kalau ada pause yang belum selesai, reset
      pausedTotalRef.current = 0;
      pauseStartedAtRef.current = null;
    } catch (e) {
      console.log("recoverFromCrash error:", e);
    }
  };

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.isDark === "boolean") {
          setIsDark(parsed.isDark);
        }
      }
    } catch (e) {
      console.log("Gagal load settings:", e);
    }
  };

  const saveSettings = async (
    overrides: Partial<{ isDark: boolean }> = {}
  ) => {
    const data = {
      isDark,
      ...overrides,
    };
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch {}
  };

  const toggleDarkMode = async (value: boolean) => {
    setIsDark(value);
    await saveSettings({ isDark: value });
  };

  // HISTORY FUNCTIONS
  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed: HistoryItem[] = JSON.parse(raw);
        setHistory(parsed);
      }
    } catch (e) {
      console.log("Gagal load history:", e);
    }
  };

  const saveHistoryItem = async (item: HistoryItem) => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const existing: HistoryItem[] = raw ? JSON.parse(raw) : [];
      // Cegah duplikat by id
      if (existing.some((h) => h.id === item.id)) {
        console.log("Duplicate history item, skip:", item.id);
        return;
      }
      const updated = [item, ...existing].slice(0, MAX_HISTORY);
      setHistory(updated);
      await AsyncStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (e) {
      console.log("Gagal simpan history:", e);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const updated = history.filter((h) => h.id !== id);
      setHistory(updated);
      await AsyncStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (e) {
      console.log("Gagal hapus history:", e);
    }
  };

  const clearAllHistory = async () => {
    Alert.alert(
      "Hapus Semua Riwayat",
      "Yakin mau hapus semua riwayat aktivitas?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
          },
        },
      ]
    );
  };

  // HISTORY STATS
  const historyStats = useMemo(() => {
    const totalSessions = history.length;
    const totalKm = history.reduce((sum, h) => sum + h.distance, 0);
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    const totalCalories = history.reduce((sum, h) => sum + h.calories, 0);
    return { totalSessions, totalKm, totalDuration, totalCalories };
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "Semua") return history;
    return history.filter((h) => h.activityType === historyFilter);
  }, [history, historyFilter]);

  // THEME
  const theme = isDark
    ? {
        background: "#0B1220",
        card: "#151E2E",
        text: "#F1F5F9",
        muted: "#94A3B8",
        border: "#273449",
        input: "#0F172A",
        soft: "#1E293B",
        primary: BRAND.primary,
        result: "#064E3B",
        drawer: "#0B1220",
      }
    : {
        background: "#F8FAFC",
        card: "#FFFFFF",
        text: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        input: "#FFFFFF",
        soft: "#F1F5F9",
        primary: BRAND.primary,
        result: BRAND.primarySoft,
        drawer: "#FFFFFF",
      };

  // PULSE ANIMATION
  useEffect(() => {
    if (isMoving && !isPaused) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isMoving, isPaused, pulseAnim]);

  // SIDEBAR
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

  // BMI
  const calculateBMI = () => {
    if (!weight || !height || !age) {
      Alert.alert(
        "Data belum lengkap",
        "Harap isi usia, berat, dan tinggi badan."
      );
      return;
    }

    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    const userAge = parseInt(age, 10);

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

    const minWeight = 18.5 * (h * h);
    const maxWeight = 24.9 * (h * h);
    setIdealWeight(`${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`);
  };

  const getBmiAdvice = () => {
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

  // DISTANCE & BEARING
  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getBearing = (from: LatLng, to: LatLng) => {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  // SPEAK + NOTIF
  const speakDistance = async (km: number) => {
    void notifyKmReached(km);
    try {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) await Speech.stop();
      Speech.speak(`Jarak sudah ${km} kilometer`, {
        language: "id-ID",
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
      });
    } catch {}
  };

  // UPDATE MAP
  useEffect(() => {
    if (!leafletReady || !currentLocation) return;
    const routeJson = JSON.stringify(route);
    webViewRef.current?.injectJavaScript(`
      if (typeof updateMap === "function") {
        updateMap(${currentLocation.latitude}, ${currentLocation.longitude}, ${routeJson}, ${isTracking && !isPaused}, ${heading});
      }
      true;
    `);
  }, [leafletReady, currentLocation, route, isTracking, isPaused, heading]);

  // SAVE TRACKER
  const saveTrackerState = async (
    overrides: Partial<StoredTrackerState> = {}
  ) => {
    const state: StoredTrackerState = {
      tracking: isTracking,
      paused: isPausedRef.current,
      activityType: activityTypeRef.current,
      weight: parseFloat(weight) > 0 ? parseFloat(weight) : 60,
      distance: distanceRef.current,
      activeDuration,
      lastLocation: lastLocation.current,
      lastTimestamp: Date.now(),
      lastSpokenKm: lastSpokenKmRef.current,
      startedAt: startTimeRef.current,
      ...overrides,
    };
    try {
      await AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(state));
    } catch {}
  };

  // BACKGROUND LOCATION
  const startBackgroundLocation = async () => {
    try {
      const alreadyStarted =
        await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (!alreadyStarted) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "IFit sedang merekam aktivitas",
            notificationBody:
              "GPS tetap aktif untuk menghitung jarak dan kalori.",
            notificationColor: BRAND.primary,
          },
        });
      }
      backgroundTrackingRef.current = true;
    } catch (error) {
      console.log("Gagal start background GPS:", error);
    }
  };

  const stopBackgroundLocation = async () => {
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (started) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (error) {
      console.log("Gagal stop background GPS:", error);
    }
    backgroundTrackingRef.current = false;
  };

  const syncBackgroundTracker = async () => {
    try {
      const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
      if (!raw) return;
      const state: StoredTrackerState = JSON.parse(raw);
      if (!state.tracking) return;

      const newDist = state.distance;
      if (newDist > distanceRef.current) {
        distanceRef.current = newDist;
        setDistance(newDist);
      }

      if (typeof state.lastSpokenKm === "number") {
        lastSpokenKmRef.current = state.lastSpokenKm;
      } else {
        lastSpokenKmRef.current = Math.floor(state.distance);
      }

      setActiveDuration(state.activeDuration);

      if (state.lastLocation) {
        lastLocation.current = state.lastLocation;
        setCurrentLocation(state.lastLocation);
      }

      if (typeof state.paused === "boolean") {
        setIsPaused(state.paused);
        isPausedRef.current = state.paused;
      }
    } catch (e) {
      console.log("syncBackgroundTracker error:", e);
    }
  };

  // === FIX MASALAH 1: restart timer helper ===
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current - pausedTotalRef.current) / 1000
        );
        setDuration(Math.max(0, elapsed));

        if (
          isMovingRef.current &&
          !isPausedRef.current &&
          !autoPausedRef.current
        ) {
          setActiveDuration((prev) => prev + 1);
        }
      }
    }, 1000);
  };

  // START TRACKING
  const startTracking = async () => {
    if (isTracking) return;
    
    // Reset state lengkap
    lastSpokenKmRef.current = 0;
    isMovingRef.current = false;
    isPausedRef.current = false;
    autoPausedRef.current = false;
    movingSamplesRef.current = 0;
    lastMovementAtRef.current = Date.now();
    pausedTotalRef.current = 0;
    pauseStartedAtRef.current = null;
    stoppingRef.current = false;
    setDistance(0);
    distanceRef.current = 0;
    setDuration(0);
    setActiveDuration(0);
    setCalories(0);
    setPace(0);
    setRoute([]);
    setCurrentLocation(null);
    setIsMoving(false);
    setIsPaused(false);

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationStatus("GPS tidak aktif");
        Alert.alert(
          "GPS Tidak Aktif",
          "Aktifkan Lokasi/GPS pada HP terlebih dahulu, lalu tekan Mulai lagi."
        );
        return;
      }

      let foregroundPermission =
        await Location.getForegroundPermissionsAsync();
      if (foregroundPermission.status !== "granted") {
        foregroundPermission =
          await Location.requestForegroundPermissionsAsync();
      }
      if (foregroundPermission.status !== "granted") {
        setLocationStatus("Izin lokasi ditolak");
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Izinkan IFit menggunakan lokasi perangkat agar jarak dan posisi pada peta dapat dihitung."
        );
        return;
      }

      if (Platform.OS === "android") {
        try {
          const backgroundPermission =
            await Location.getBackgroundPermissionsAsync();
          if (backgroundPermission.status !== "granted") {
            await Location.requestBackgroundPermissionsAsync();
          }
        } catch (backgroundError) {
          console.log("Background permission error:", backgroundError);
        }
      }

      setLocationStatus("Mencari lokasi GPS...");
      let firstLocation: Location.LocationObject | null = null;

      try {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 300000,
          requiredAccuracy: 500,
        });
        if (lastKnown) firstLocation = lastKnown;
      } catch (error) {
        console.log("Last known location gagal:", error);
      }

      if (!firstLocation) {
        try {
          setLocationStatus("Mencari posisi GPS...");
          firstLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (error) {
          console.log("Current location Balanced gagal:", error);
        }
      }

      if (!firstLocation) {
        try {
          setLocationStatus("Mencari GPS dengan akurasi tinggi...");
          firstLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } catch (error) {
          console.log("Current location High gagal:", error);
        }
      }

      if (!firstLocation) {
        try {
          setLocationStatus("Menunggu sinyal GPS...");
          firstLocation = await new Promise<Location.LocationObject>(
            async (resolve, reject) => {
              let finished = false;
              let subscription: Location.LocationSubscription | null = null;
              const timeout = setTimeout(() => {
                if (finished) return;
                finished = true;
                if (subscription) subscription.remove();
                reject(new Error("GPS timeout"));
              }, 15000);
              try {
                subscription = await Location.watchPositionAsync(
                  {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 1000,
                    distanceInterval: 1,
                  },
                  (location) => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    if (subscription) subscription.remove();
                    resolve(location);
                  }
                );
              } catch (error) {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                reject(error);
              }
            }
          );
        } catch (error) {
          console.log("Watch position gagal:", error);
        }
      }

      if (!firstLocation) {
        throw new Error("Tidak berhasil mendapatkan koordinat GPS.");
      }

      const firstPoint: LatLng = {
        latitude: firstLocation.coords.latitude,
        longitude: firstLocation.coords.longitude,
      };

      // Generate session ID unik
      const sessionId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      sessionIdRef.current = sessionId;

      setCurrentLocation(firstPoint);
      setRoute([firstPoint]);
      lastLocation.current = firstPoint;

      const firstHeading = firstLocation.coords.heading;
      const initialHeading =
        typeof firstHeading === "number" && firstHeading >= 0
          ? firstHeading
          : 0;
      lastHeadingRef.current = initialHeading;
      setHeading(initialHeading);

      setIsTracking(true);
      setIsPaused(false);
      isPausedRef.current = false;
      setLocationStatus("GPS aktif • Menunggu gerakan");
      startTimeRef.current = Date.now();

      await saveTrackerState({
        tracking: true,
        paused: false,
        activityType,
        weight: parseFloat(weight) > 0 ? parseFloat(weight) : 60,
        distance: 0,
        activeDuration: 0,
        lastLocation: firstPoint,
        lastTimestamp: Date.now(),
        lastSpokenKm: 0,
        startedAt: startTimeRef.current,
      });

      startTimer();

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          // Guard: pastikan session masih sama
          if (sessionIdRef.current !== sessionId) return;
          
          const point: LatLng = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };

          if (lastLocation.current) {
            const dist = getDistance(
              lastLocation.current.latitude,
              lastLocation.current.longitude,
              point.latitude,
              point.longitude
            );

            const speed = newLocation.coords.speed;
            const accuracy = newLocation.coords.accuracy;
            const hasGoodAccuracy = accuracy == null || accuracy <= 30;
            const movingBySpeed = speed != null && speed >= 0.5;
            const movingByDistance =
              (speed == null || speed < 0) && dist >= 0.005;
            const rawMoving =
              hasGoodAccuracy && (movingBySpeed || movingByDistance);

            if (rawMoving) {
              movingSamplesRef.current = Math.min(
                movingSamplesRef.current + 1,
                3
              );
              lastMovementAtRef.current = Date.now();
            } else {
              movingSamplesRef.current = 0;
            }

            const currentlyMoving =
              rawMoving && movingSamplesRef.current >= 2;
            isMovingRef.current = currentlyMoving;
            setIsMoving(currentlyMoving);

            // AUTO-PAUSE
            const idleMs = Date.now() - lastMovementAtRef.current;
            const shouldAutoPause =
              idleMs >= AUTO_PAUSE_MS && currentlyMoving === false;

            if (
              shouldAutoPause &&
              !autoPausedRef.current &&
              !isPausedRef.current
            ) {
              autoPausedRef.current = true;
              console.log("Auto-pause aktif");
            } else if (!shouldAutoPause && autoPausedRef.current) {
              autoPausedRef.current = false;
              console.log("Auto-pause nonaktif");
            }

            const effectivelyPaused =
              isPausedRef.current || autoPausedRef.current;

            if (isPausedRef.current) {
              setLocationStatus("Dijeda • Timer berhenti");
            } else if (autoPausedRef.current) {
              setLocationStatus("Auto-jeda • Diam > 20 detik");
            } else {
              setLocationStatus(
                currentlyMoving
                  ? "GPS aktif • Sedang bergerak"
                  : "GPS aktif • Menunggu gerakan"
              );
            }

            if (currentlyMoving && !effectivelyPaused) {
              const gpsHeading = newLocation.coords.heading;
              let nextHeading = lastHeadingRef.current;
              if (typeof gpsHeading === "number" && gpsHeading >= 0) {
                nextHeading = gpsHeading;
              } else if (dist >= 0.005) {
                nextHeading = getBearing(lastLocation.current, point);
              }
              lastHeadingRef.current = nextHeading;
              setHeading(nextHeading);
            }

            if (
              !effectivelyPaused &&
              hasGoodAccuracy &&
              dist > 0 &&
              dist <= 0.2
            ) {
              const newDistance = distanceRef.current + dist;
              distanceRef.current = newDistance;
              setDistance(newDistance);

              const currentKm = Math.floor(distanceRef.current);
              if (
                currentKm > lastSpokenKmRef.current &&
                currentKm >= 1
              ) {
                lastSpokenKmRef.current = currentKm;
                void saveTrackerState({
                  tracking: true,
                  paused: false,
                  distance: distanceRef.current,
                  activeDuration,
                  lastLocation: lastLocation.current,
                  lastTimestamp: Date.now(),
                  lastSpokenKm: currentKm,
                });
                void speakDistance(currentKm);
              }
            }

            if (
              !effectivelyPaused &&
              currentlyMoving &&
              dist > 0 &&
              dist <= 0.2
            ) {
              setRoute((previousRoute) => {
                if (previousRoute.length > 0) {
                  const lastPoint =
                    previousRoute[previousRoute.length - 1];
                  const pointDistance = getDistance(
                    lastPoint.latitude,
                    lastPoint.longitude,
                    point.latitude,
                    point.longitude
                  );
                  if (pointDistance < 0.001) return previousRoute;
                }
                return [...previousRoute, point];
              });
            }
          } else {
            isMovingRef.current = false;
            movingSamplesRef.current = 0;
            setIsMoving(false);
            setLocationStatus("GPS aktif • Menunggu gerakan");
            setRoute([point]);
          }

          lastLocation.current = point;
          setCurrentLocation(point);
        }
      );

      setLocationSub(subscription);
      console.log("GPS tracking berhasil dimulai");
    } catch (error) {
      console.log("START TRACKING ERROR:", error);
      setIsTracking(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setIsMoving(false);
      isMovingRef.current = false;
      movingSamplesRef.current = 0;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
      sessionIdRef.current = null;
      setLocationStatus("Gagal mendapatkan lokasi");

      Alert.alert(
        "GPS Bermasalah",
        "IFit belum berhasil mendapatkan posisi GPS. Pastikan Lokasi aktif dan izin lokasi untuk IFit sudah diberikan, lalu coba lagi."
      );
    }
  };

  // === FIX MASALAH 1: PAUSE / RESUME dengan timer stop ===
  const pauseTracking = async () => {
    if (!isTracking) return;
    if (isPausedRef.current) return;
    
    setIsPaused(true);
    isPausedRef.current = true;
    pauseStartedAtRef.current = Date.now();
    setLocationStatus("Dijeda • Timer berhenti");
    
    // STOP timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    await saveTrackerState({
      tracking: true,
      paused: true,
      distance: distanceRef.current,
      activeDuration,
      lastLocation: lastLocation.current,
      lastTimestamp: Date.now(),
      lastSpokenKm: lastSpokenKmRef.current,
    });
  };

  const resumeTracking = async () => {
    if (!isTracking) return;
    if (!isPausedRef.current) return;
    
    // Akumulasi waktu pause
    if (pauseStartedAtRef.current !== null) {
      pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    
    setIsPaused(false);
    isPausedRef.current = false;
    autoPausedRef.current = false;
    lastMovementAtRef.current = Date.now();
    setLocationStatus("GPS aktif • Menunggu gerakan");
    
    // RESTART timer
    startTimer();
    
    await saveTrackerState({
      tracking: true,
      paused: false,
      distance: distanceRef.current,
      activeDuration,
      lastLocation: lastLocation.current,
      lastTimestamp: Date.now(),
      lastSpokenKm: lastSpokenKmRef.current,
    });
  };

  // === FIX MASALAH 2 & 3: STOP dengan guard + reset total ===
  const stopTracking = async () => {
    if (stoppingRef.current) return;
    if (!isTracking) return;
    stoppingRef.current = true;

    try {
      // Hitung durasi final
      let finalDuration = duration;
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current - pausedTotalRef.current) / 1000
        );
        finalDuration = Math.max(0, elapsed);
      }
      
      // Snapshot nilai saat ini (biar nggak kena async setState)
      const finalDistance = distanceRef.current;
      const finalActiveDuration = activeDuration;
      const finalCalories = calories;
      const finalPace = pace;
      const finalActivityType = activityTypeRef.current;
      const finalSessionId = sessionIdRef.current;

      // Set state UI
      setIsTracking(false);
      setIsPaused(false);
      isPausedRef.current = false;
      autoPausedRef.current = false;
      isMovingRef.current = false;
      movingSamplesRef.current = 0;
      setIsMoving(false);

      // Clear timer & subscription
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
      pausedTotalRef.current = 0;
      pauseStartedAtRef.current = null;
      locationSub?.remove();
      setLocationSub(null);
      lastLocation.current = null;
      sessionIdRef.current = null;

      await stopBackgroundLocation();

      // Simpan ke riwayat
      if (finalDistance > 0.01 || finalActiveDuration > 5) {
        const historyItem: HistoryItem = {
          id: finalSessionId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: Date.now(),
          activityType: finalActivityType,
          distance: finalDistance,
          duration: finalDuration,
          activeDuration: finalActiveDuration,
          calories: finalCalories,
          pace: finalPace,
        };
        await saveHistoryItem(historyItem);
        console.log("Riwayat disimpan:", historyItem);
      }

      // Reset semua state
      setDistance(0);
      distanceRef.current = 0;
      setDuration(0);
      setActiveDuration(0);
      setCalories(0);
      setPace(0);
      setRoute([]);
      setCurrentLocation(null);
      lastSpokenKmRef.current = 0;
      lastHeadingRef.current = 0;
      setHeading(0);

      webViewRef.current?.injectJavaScript(`
        if (typeof resetMap === "function") { resetMap(); }
        true;
      `);

      try {
        await AsyncStorage.setItem(
          TRACKER_STORAGE_KEY,
          JSON.stringify({
            tracking: false,
            paused: false,
            activityType: finalActivityType,
            weight: parseFloat(weight) > 0 ? parseFloat(weight) : 60,
            distance: 0,
            activeDuration: 0,
            lastLocation: null,
            lastTimestamp: null,
            lastSpokenKm: 0,
            startedAt: null,
          } as StoredTrackerState)
        );
      } catch {}

      setLocationStatus("Pelacakan dihentikan");
    } finally {
      stoppingRef.current = false;
    }
  };

  // RESET TRACKING
  const resetTracking = async () => {
    await stopTracking();
    // State sudah di-reset di stopTracking
    setLocationStatus("Lokasi belum aktif");
  };

  // CALORIES
  useEffect(() => {
    if (activeDuration > 0) {
      const userWeight = parseFloat(weight) > 0 ? parseFloat(weight) : 60;
      const hours = activeDuration / 3600;
      const met = MET_VALUES[activityType];
      setCalories(met * userWeight * hours);
    } else {
      setCalories(0);
    }
  }, [activeDuration, activityType, weight]);

  useEffect(() => {
    if (!isTracking) return;
    saveTrackerState({
      tracking: true,
      paused: isPausedRef.current,
      activityType,
      weight: parseFloat(weight) > 0 ? parseFloat(weight) : 60,
      distance,
      activeDuration,
      lastLocation: lastLocation.current,
      lastTimestamp: Date.now(),
      lastSpokenKm: lastSpokenKmRef.current,
    });
  }, [isTracking, distance, activeDuration, activityType, weight]);

  // PACE
  useEffect(() => {
    if (distance <= 0 || activeDuration <= 0) {
      setPace(0);
      return;
    }
    if (activityType === "Bersepeda") {
      setPace(distance / (activeDuration / 3600));
    } else {
      setPace(activeDuration / 60 / distance);
    }
  }, [distance, activeDuration, activityType]);

  // APP STATE
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        void (async () => {
          const previousState = appStateRef.current;
          appStateRef.current = nextState;

          if (
            previousState === "active" &&
            (nextState === "background" || nextState === "inactive") &&
            isTracking
          ) {
            await saveTrackerState({
              tracking: true,
              paused: isPausedRef.current,
              distance: distanceRef.current,
              activeDuration,
              lastLocation: lastLocation.current,
              lastTimestamp: Date.now(),
              lastSpokenKm: lastSpokenKmRef.current,
            });
            // Cuma start background kalau TIDAK paused
            if (!isPausedRef.current) {
              await startBackgroundLocation();
            }
          }

          if (
            (previousState === "background" ||
              previousState === "inactive") &&
            nextState === "active" &&
            isTracking
          ) {
            if (backgroundSyncInProgressRef.current) return;
            backgroundSyncInProgressRef.current = true;

            await stopBackgroundLocation();
            await syncBackgroundTracker();

            setTimeout(() => {
              void (async () => {
                try {
                  if (lastLocation.current && !isPausedRef.current) {
                    const latest =
                      await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                      });

                    const point: LatLng = {
                      latitude: latest.coords.latitude,
                      longitude: latest.coords.longitude,
                    };

                    const dist = getDistance(
                      lastLocation.current.latitude,
                      lastLocation.current.longitude,
                      point.latitude,
                      point.longitude
                    );

                    if (dist > 0 && dist <= 0.2) {
                      const nextDistance = distanceRef.current + dist;
                      distanceRef.current = nextDistance;
                      setDistance(nextDistance);

                      const currentKm = Math.floor(nextDistance);
                      if (
                        currentKm > lastSpokenKmRef.current &&
                        currentKm >= 1
                      ) {
                        lastSpokenKmRef.current = currentKm;
                        void saveTrackerState({
                          tracking: true,
                          paused: false,
                          distance: nextDistance,
                          activeDuration,
                          lastLocation: point,
                          lastTimestamp: Date.now(),
                          lastSpokenKm: currentKm,
                        });
                        void speakDistance(currentKm);
                      }
                    }

                    lastLocation.current = point;
                    setCurrentLocation(point);
                  }
                } catch (error) {
                  console.log("Gagal sync GPS foreground:", error);
                } finally {
                  backgroundSyncInProgressRef.current = false;
                }
              })();
            }, 150);
          }
        })();
      }
    );
    return () => subscription.remove();
  }, [isTracking, activeDuration]);

  // CLEANUP
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isMovingRef.current = false;
      movingSamplesRef.current = 0;
    };
  }, []);

  useEffect(() => {
    return () => {
      locationSub?.remove();
    };
  }, [locationSub]);

  // FORMAT
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const formatDurationShort = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatClock = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type: ActivityType) => {
    if (type === "Bersepeda") return "bicycle";
    if (type === "Lari") return "running";
    return "walking";
  };

  const advice = getBmiAdvice();

  // ============================================================
  // RENDER
  // ============================================================

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
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          >
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
                Hai, {profileName.split(" ")[0]}!
              </Text>
              <Text
                style={[styles.headerSub, { color: theme.muted }]}
                numberOfLines={1}
              >
                Ayo mulai tracking hari ini
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
          {/* BMI CARD */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: BRAND.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="human-male-height"
                  size={27}
                  color={BRAND.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Kalkulator BMI
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                  Cek indeks massa tubuh
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.genderBtn,
                  {
                    borderColor:
                      gender === "Pria" ? BRAND.male : theme.border,
                    backgroundColor:
                      gender === "Pria" ? BRAND.male : theme.input,
                  },
                ]}
                onPress={() => setGender("Pria")}
              >
                <FontAwesome5
                  name="male"
                  size={20}
                  color={gender === "Pria" ? "#fff" : BRAND.male}
                />
                <Text
                  style={[
                    styles.genderText,
                    {
                      color: gender === "Pria" ? "#fff" : BRAND.male,
                    },
                  ]}
                >
                  Pria
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.genderBtn,
                  {
                    borderColor:
                      gender === "Wanita" ? BRAND.female : theme.border,
                    backgroundColor:
                      gender === "Wanita" ? BRAND.female : theme.input,
                  },
                ]}
                onPress={() => setGender("Wanita")}
              >
                <FontAwesome5
                  name="female"
                  size={20}
                  color={gender === "Wanita" ? "#fff" : BRAND.female}
                />
                <Text
                  style={[
                    styles.genderText,
                    {
                      color: gender === "Wanita" ? "#fff" : BRAND.female,
                    },
                  ]}
                >
                  Wanita
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  Usia
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.input,
                    },
                  ]}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  placeholder="Tahun"
                  placeholderTextColor={theme.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  Berat
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.input,
                    },
                  ]}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Kg"
                  placeholderTextColor={theme.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  Tinggi
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.input,
                    },
                  ]}
                  keyboardType="decimal-pad"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Cm"
                  placeholderTextColor={theme.muted}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
              onPress={calculateBMI}
            >
              <MaterialCommunityIcons
                name="calculator-variant"
                size={19}
                color="#fff"
              />
              <Text style={styles.primaryBtnText}>Hitung BMI</Text>
            </TouchableOpacity>

            {bmiResult && (
              <View
                style={[styles.resultBox, { backgroundColor: theme.result }]}
              >
                <Text style={[styles.resultSmall, { color: theme.muted }]}>
                  HASIL BMI
                </Text>
                <Text style={[styles.resultBmiText, { color: BRAND.primary }]}>
                  {bmiResult}
                </Text>
                <Text style={[styles.resultCategory, { color: theme.text }]}>
                  {bmiCategory}
                </Text>
                <Text style={[styles.resultIdeal, { color: theme.muted }]}>
                  Rentang referensi BMI dewasa: {idealWeight}
                </Text>

                {advice && (
                  <View
                    style={[
                      styles.adviceBox,
                      { borderTopColor: theme.border },
                    ]}
                  >
                    <View style={styles.adviceTitleRow}>
                      <MaterialCommunityIcons
                        name="lightbulb-on-outline"
                        size={20}
                        color={BRAND.warning}
                      />
                      <Text
                        style={[styles.adviceTitle, { color: theme.text }]}
                      >
                        {advice.title}
                      </Text>
                    </View>

                    <Text
                      style={[styles.adviceMessage, { color: theme.muted }]}
                    >
                      {advice.message}
                    </Text>

                    <Text style={[styles.foodTitle, { color: theme.text }]}>
                      Makanan yang dapat dipilih
                    </Text>
                    <View style={styles.chipWrap}>
                      {advice.foods.map((food) => (
                        <View
                          key={food}
                          style={[
                            styles.chip,
                            { backgroundColor: BRAND.primarySoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: BRAND.primaryDark },
                            ]}
                          >
                            {food}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.foodTitle, { color: theme.text }]}>
                      Pilihan minuman
                    </Text>
                    <View style={styles.chipWrap}>
                      {advice.drinks.map((drink) => (
                        <View
                          key={drink}
                          style={[
                            styles.chip,
                            { backgroundColor: BRAND.primarySoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: BRAND.primaryDark },
                            ]}
                          >
                            {drink}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Text
                      style={[styles.disclaimer, { color: theme.muted }]}
                    >
                      Catatan: pada usia di bawah 18 tahun, BMI tidak sebaiknya
                      ditafsirkan dengan kategori dewasa saja. Gunakan hasil
                      ini sebagai informasi awal, bukan diagnosis medis.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* TRACKER CARD */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: BRAND.primarySoft },
                ]}
              >
                <FontAwesome5
                  name="running"
                  size={23}
                  color={BRAND.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Pemantau Jarak Tempuh
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                  Pantau aktivitas secara langsung
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activityScroll}
            >
              {(Object.keys(MET_VALUES) as ActivityType[]).map((act) => (
                <TouchableOpacity
                  key={act}
                  style={[
                    styles.activityBtn,
                    {
                      backgroundColor:
                        activityType === act ? BRAND.primary : theme.soft,
                    },
                  ]}
                  onPress={() => {
                    if (!isTracking) setActivityType(act);
                  }}
                  disabled={isTracking}
                >
                  <Text
                    style={[
                      styles.activityText,
                      {
                        color:
                          activityType === act ? "#fff" : theme.muted,
                      },
                    ]}
                  >
                    {act}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.mapContainer}>
              <WebView
                ref={webViewRef}
                source={{ html: LEAFLET_HTML, baseUrl: "https://example.com" }}
                style={styles.map}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                onMessage={(event) => {
                  if (event.nativeEvent.data === "LEAFLET_READY") {
                    setLeafletReady(true);
                  }
                }}
              />
            </View>

            <View
              style={[
                styles.trackingStatusBox,
                {
                  backgroundColor: theme.soft,
                  borderColor: theme.border,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isPaused
                      ? BRAND.warning
                      : isMoving
                      ? BRAND.primary
                      : isTracking
                      ? BRAND.warning
                      : theme.muted,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.trackingStatusTitle, { color: theme.text }]}
                >
                  {isPaused
                    ? "Dijeda"
                    : isTracking
                    ? isMoving
                      ? "Sedang bergerak"
                      : "Tidak bergerak"
                    : "Pelacakan belum dimulai"}
                </Text>
                <Text
                  style={[styles.trackingStatusText, { color: theme.muted }]}
                >
                  {locationStatus}
                </Text>
              </View>
            </View>

            <View
              style={[styles.statsContainer, { backgroundColor: theme.soft }]}
            >
              <View style={styles.statBox}>
                <FontAwesome5 name="route" size={19} color={theme.muted} />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {distance.toFixed(2)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  KM
                </Text>
              </View>

              <View style={styles.statBox}>
                <FontAwesome5
                  name={
                    activityType === "Bersepeda"
                      ? "tachometer-alt"
                      : "running"
                  }
                  size={19}
                  color={theme.muted}
                />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {activityType === "Bersepeda"
                    ? `${pace.toFixed(1)}`
                    : pace > 0
                    ? `${Math.floor(pace)}:${Math.round((pace % 1) * 60)
                        .toString()
                        .padStart(2, "0")}`
                    : "--"}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  {activityType === "Bersepeda"
                    ? "KM/JAM"
                    : "PACE MIN/KM"}
                </Text>
              </View>

              <View style={styles.statBox}>
                <FontAwesome5
                  name="stopwatch"
                  size={19}
                  color={theme.muted}
                />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {formatTime(duration)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  WAKTU
                </Text>
              </View>

              <View style={styles.statBox}>
                <FontAwesome5
                  name="fire-alt"
                  size={19}
                  color={BRAND.danger}
                />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {calories.toFixed(0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  KCAL
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              {!isTracking ? (
                <TouchableOpacity
                  style={[
                    styles.controlBtn,
                    { backgroundColor: BRAND.primary },
                  ]}
                  onPress={startTracking}
                >
                  <FontAwesome5 name="play" size={14} color="#fff" />
                  <Text style={styles.controlBtnText}>Mulai</Text>
                </TouchableOpacity>
              ) : isPaused ? (
                <TouchableOpacity
                  style={[
                    styles.controlBtn,
                    { backgroundColor: BRAND.primary },
                  ]}
                  onPress={resumeTracking}
                >
                  <FontAwesome5 name="play" size={14} color="#fff" />
                  <Text style={styles.controlBtnText}>Lanjut</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.controlBtn,
                    { backgroundColor: BRAND.warning },
                  ]}
                  onPress={pauseTracking}
                >
                  <FontAwesome5 name="pause" size={14} color="#fff" />
                  <Text style={styles.controlBtnText}>Jeda</Text>
                </TouchableOpacity>
              )}

              {isTracking && (
                <TouchableOpacity
                  style={[
                    styles.controlBtn,
                    { backgroundColor: BRAND.danger },
                  ]}
                  onPress={stopTracking}
                >
                  <FontAwesome5 name="stop" size={14} color="#fff" />
                  <Text style={styles.controlBtnText}>Stop</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  { backgroundColor: "#64748B" },
                ]}
                onPress={resetTracking}
              >
                <FontAwesome5 name="redo" size={14} color="#fff" />
                <Text style={styles.controlBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gpsInfo}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={18}
                color={BRAND.primary}
              />
              <Text style={[styles.gpsInfoText, { color: theme.muted }]}>
                GPS digunakan untuk menghitung jarak dan aktivitas. Auto-jeda
                aktif jika tidak bergerak &gt; 20 detik. Tombol Jeda
                menghentikan timer dan jarak sementara.
              </Text>
            </View>
          </View>

          <Text style={[styles.footer, { color: theme.muted }]}>
            IFit • BMI & Activity Tracker
          </Text>
        </ScrollView>

        {/* SIDEBAR */}
        <Modal
          visible={sidebarVisible}
          transparent
          animationType="none"
          onRequestClose={closeSidebar}
        >
          <View style={styles.modalRoot}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={closeSidebar}
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
                <View
                  style={[styles.avatar, { backgroundColor: BRAND.primary }]}
                >
                  <FontAwesome5 name="user" size={22} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.drawerTitle, { color: theme.text }]}>
                    IFit
                  </Text>
                  <Text
                    style={[styles.drawerSubtitle, { color: theme.muted }]}
                  >
                    Profil & Pengaturan
                  </Text>
                </View>

                <TouchableOpacity onPress={closeSidebar}>
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
                  value={profileName}
                  onChangeText={setProfileName}
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
                    <Text
                      style={[styles.profileLabel, { color: theme.muted }]}
                    >
                      Gender
                    </Text>
                    <Text
                      style={[styles.profileValue, { color: theme.text }]}
                    >
                      {gender}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[styles.profileLabel, { color: theme.muted }]}
                    >
                      Usia
                    </Text>
                    <Text
                      style={[styles.profileValue, { color: theme.text }]}
                    >
                      {age ? `${age} tahun` : "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileInfo}>
                  <View>
                    <Text
                      style={[styles.profileLabel, { color: theme.muted }]}
                    >
                      Berat
                    </Text>
                    <Text
                      style={[styles.profileValue, { color: theme.text }]}
                    >
                      {weight ? `${weight} kg` : "-"}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[styles.profileLabel, { color: theme.muted }]}
                    >
                      Tinggi
                    </Text>
                    <Text
                      style={[styles.profileValue, { color: theme.text }]}
                    >
                      {height ? `${height} cm` : "-"}
                    </Text>
                  </View>
                </View>

                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />

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
                      name={
                        isDark ? "weather-night" : "white-balance-sunny"
                      }
                      size={20}
                      color={BRAND.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.settingTitle, { color: theme.text }]}
                    >
                      Mode {isDark ? "Gelap" : "Terang"}
                    </Text>
                    <Text
                      style={[
                        styles.settingDescription,
                        { color: theme.muted },
                      ]}
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

                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />

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
                        closeSidebar();
                        setTimeout(
                          () => setHistoryModalVisible(true),
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
                      backgroundColor: isDark
                        ? "#064E3B"
                        : BRAND.primarySoft,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: isDark
                        ? "#10B981"
                        : BRAND.primaryLight,
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
                        {historyStats.totalSessions} sesi
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
                          {historyStats.totalKm.toFixed(1)}
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
                          {formatDurationShort(historyStats.totalDuration)}
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
                          {historyStats.totalCalories.toFixed(0)}
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
                  <View
                    style={[
                      styles.aboutBox,
                      { backgroundColor: theme.soft },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="history"
                      size={20}
                      color={theme.muted}
                    />
                    <Text
                      style={[styles.aboutText, { color: theme.muted }]}
                    >
                      Belum ada riwayat. Selesaikan satu sesi tracking lalu
                      tekan "Berhenti" untuk menyimpan riwayat.
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
                              {formatDate(item.date)} •{" "}
                              {formatClock(item.date)}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => deleteHistoryItem(item.id)}
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
                      closeSidebar();
                      setTimeout(
                        () => setHistoryModalVisible(true),
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

                <View
                  style={[
                    styles.aboutBox,
                    { backgroundColor: theme.soft, marginTop: 12 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={20}
                    color={BRAND.primary}
                  />
                  <Text style={[styles.aboutText, { color: theme.muted }]}>
                    IFit membantu menghitung BMI dan memantau aktivitas
                    menggunakan lokasi perangkat. Data profil pada tampilan
                    ini hanya digunakan selama aplikasi berjalan.
                  </Text>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        {/* MODAL RIWAYAT LENGKAP */}
        <Modal
          visible={historyModalVisible}
          animationType="slide"
          onRequestClose={() => setHistoryModalVisible(false)}
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
                onPress={() => setHistoryModalVisible(false)}
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
                  style={{
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: "800",
                  }}
                >
                  Riwayat Lengkap
                </Text>
                <Text
                  style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}
                >
                  {filteredHistory.length} dari {history.length} aktivitas
                </Text>
              </View>

              {history.length > 0 && (
                <TouchableOpacity
                  onPress={clearAllHistory}
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
              {(
                ["Semua", "Joging", "Lari", "Bersepeda"] as HistoryFilter[]
              ).map((f) => {
                const active = historyFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setHistoryFilter(f)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: active
                        ? BRAND.primary
                        : theme.soft,
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
              })}
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
                  { label: "SESI", value: `${historyStats.totalSessions}` },
                  {
                    label: "TOTAL KM",
                    value: historyStats.totalKm.toFixed(1),
                  },
                  {
                    label: "WAKTU",
                    value: formatDurationShort(historyStats.totalDuration),
                  },
                  {
                    label: "KCAL",
                    value: historyStats.totalCalories.toFixed(0),
                  },
                ].map((s) => (
                  <View
                    key={s.label}
                    style={{ alignItems: "center", flex: 1 }}
                  >
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

            {filteredHistory.length === 0 ? (
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
                data={filteredHistory}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 40,
                }}
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
                            {formatDate(item.date)} •{" "}
                            {formatClock(item.date)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => deleteHistoryItem(item.id)}
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
                          style={{
                            color: theme.muted,
                            fontSize: 9,
                            marginTop: 1,
                          }}
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
                          style={{
                            color: theme.muted,
                            fontSize: 9,
                            marginTop: 1,
                          }}
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
                          style={{
                            color: theme.muted,
                            fontSize: 9,
                            marginTop: 1,
                          }}
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },

  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },

  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 8,
  },

  genderText: {
    marginLeft: 4,
    fontWeight: "800",
    fontSize: 14,
  },

  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },

  label: {
    fontSize: 12,
    marginBottom: 5,
    fontWeight: "700",
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    textAlign: "center",
  },

  primaryBtn: {
    padding: 14,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  resultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 13,
    alignItems: "center",
  },

  resultSmall: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  resultBmiText: {
    fontSize: 38,
    fontWeight: "900",
    marginTop: 2,
  },

  resultCategory: {
    fontSize: 19,
    fontWeight: "800",
  },

  resultIdeal: {
    fontSize: 12,
    marginTop: 7,
    textAlign: "center",
  },

  adviceBox: {
    width: "100%",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },

  adviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  adviceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },

  adviceMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  foodTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 13,
    marginBottom: 7,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },

  disclaimer: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 12,
    textAlign: "center",
  },

  activityScroll: {
    marginBottom: 13,
  },

  activityBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },

  activityText: {
    fontWeight: "700",
  },

  trackingStatusBox: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  trackingStatusTitle: {
    fontSize: 13,
    fontWeight: "800",
  },

  trackingStatusText: {
    fontSize: 10,
    marginTop: 2,
  },

  mapContainer: {
    height: 360,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
  },

  map: {
    width: "100%",
    height: "100%",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 13,
    padding: 15,
    marginBottom: 15,
  },

  statBox: {
    alignItems: "center",
    flex: 1,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 7,
  },

  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  controlBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    flexDirection: "row",
    gap: 7,
  },

  controlBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  gpsInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    paddingHorizontal: 3,
  },

  gpsInfoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 7,
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 2,
  },

  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: Math.min(SCREEN_WIDTH * 0.86, 360),
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + 10
        : 45,
    paddingHorizontal: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  drawerTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  drawerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },

  drawerLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 5,
  },

  drawerInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    marginBottom: 15,
  },

  profileInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  profileLabel: {
    fontSize: 10,
    marginBottom: 3,
  },

  profileValue: {
    fontSize: 13,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  settingDescription: {
    fontSize: 11,
    marginTop: 2,
  },

  aboutBox: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },

  aboutText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
    marginLeft: 8,
  },
});