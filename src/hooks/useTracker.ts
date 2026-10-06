import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import type { WebView } from "react-native-webview";

import { BRAND } from "../styles/colors";
import {
  AUTO_PAUSE_MS,
  BACKGROUND_LOCATION_TASK,
  MET_VALUES,
  TRACKER_STORAGE_KEY,
} from "../constants/config";
import type {
  ActivityType,
  HistoryItem,
  LatLng,
  StoredTrackerState,
} from "../types";
import { getBearing, getDistanceKm } from "../utils/distance";
import { notifyKmReached } from "../utils/notifications";

type UseTrackerOptions = {
  weight: string;
  isLoggedIn: boolean;
  onSaveHistory: (item: HistoryItem) => Promise<void>;
};

export const useTracker = ({
  weight,
  isLoggedIn,
  onSaveHistory,
}: UseTrackerOptions) => {
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
  const [leafletReady, setLeafletReady] = useState(false);
  const [heading, setHeading] = useState(0);

  const lastLocation = useRef<LatLng | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const webViewRef = useRef<WebView | null>(null);
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
  const pausedTotalRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const activityTypeRef = useRef<ActivityType>("Joging");
  const sessionIdRef = useRef<string | null>(null);
  const activeDurationRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    activityTypeRef.current = activityType;
  }, [activityType]);

  useEffect(() => {
    activeDurationRef.current = activeDuration;
  }, [activeDuration]);

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

  // SPEAK DISTANCE
  const speakDistance = useCallback(async (km: number) => {
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
  }, []);

  // UPDATE MAP
  useEffect(() => {
    if (!leafletReady || !currentLocation) return;
    const routeJson = JSON.stringify(route);
    webViewRef.current?.injectJavaScript(`
      if (typeof updateMap === "function") {
        updateMap(${currentLocation.latitude}, ${currentLocation.longitude}, ${routeJson}, ${
      isTracking && !isPaused
    }, ${heading});
      }
      true;
    `);
  }, [leafletReady, currentLocation, route, isTracking, isPaused, heading]);

  const saveTrackerState = useCallback(
    async (overrides: Partial<StoredTrackerState> = {}) => {
      const state: StoredTrackerState = {
        tracking: isTracking,
        paused: isPausedRef.current,
        activityType: activityTypeRef.current,
        weight: parseFloat(weight) > 0 ? parseFloat(weight) : 60,
        distance: distanceRef.current,
        activeDuration: activeDurationRef.current,
        lastLocation: lastLocation.current,
        lastTimestamp: Date.now(),
        lastSpokenKm: lastSpokenKmRef.current,
        startedAt: startTimeRef.current,
        ...overrides,
      };
      try {
        await AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(state));
      } catch {}
    },
    [isTracking, weight]
  );

  const startBackgroundLocation = useCallback(async () => {
    try {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      );
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
  }, []);

  const stopBackgroundLocation = useCallback(async () => {
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
  }, []);

  const syncBackgroundTracker = useCallback(async () => {
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
  }, []);

  const startTimer = useCallback(() => {
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
  }, []);

  const startTracking = useCallback(async () => {
    if (isTracking) return;

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

      let foregroundPermission = await Location.getForegroundPermissionsAsync();
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
          if (sessionIdRef.current !== sessionId) return;

          const point: LatLng = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };

          if (lastLocation.current) {
            const dist = getDistanceKm(
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

            const currentlyMoving = rawMoving && movingSamplesRef.current >= 2;
            isMovingRef.current = currentlyMoving;
            setIsMoving(currentlyMoving);

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
              if (currentKm > lastSpokenKmRef.current && currentKm >= 1) {
                lastSpokenKmRef.current = currentKm;
                void saveTrackerState({
                  tracking: true,
                  paused: false,
                  distance: distanceRef.current,
                  activeDuration: activeDurationRef.current,
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
                  const lastPoint = previousRoute[previousRoute.length - 1];
                  const pointDistance = getDistanceKm(
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
  }, [isTracking, activityType, weight, saveTrackerState, startTimer, speakDistance]);

  const pauseTracking = useCallback(async () => {
    if (!isTracking) return;
    if (isPausedRef.current) return;

    setIsPaused(true);
    isPausedRef.current = true;
    pauseStartedAtRef.current = Date.now();
    setLocationStatus("Dijeda • Timer berhenti");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await saveTrackerState({
      tracking: true,
      paused: true,
      distance: distanceRef.current,
      activeDuration: activeDurationRef.current,
      lastLocation: lastLocation.current,
      lastTimestamp: Date.now(),
      lastSpokenKm: lastSpokenKmRef.current,
    });
  }, [isTracking, saveTrackerState]);

  const resumeTracking = useCallback(async () => {
    if (!isTracking) return;
    if (!isPausedRef.current) return;

    if (pauseStartedAtRef.current !== null) {
      pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }

    setIsPaused(false);
    isPausedRef.current = false;
    autoPausedRef.current = false;
    lastMovementAtRef.current = Date.now();
    setLocationStatus("GPS aktif • Menunggu gerakan");

    startTimer();

    await saveTrackerState({
      tracking: true,
      paused: false,
      distance: distanceRef.current,
      activeDuration: activeDurationRef.current,
      lastLocation: lastLocation.current,
      lastTimestamp: Date.now(),
      lastSpokenKm: lastSpokenKmRef.current,
    });
  }, [isTracking, saveTrackerState, startTimer]);

  const stopTracking = useCallback(async () => {
    if (stoppingRef.current) return;
    if (!isTracking) return;
    stoppingRef.current = true;

    try {
      let finalDuration = duration;
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current - pausedTotalRef.current) / 1000
        );
        finalDuration = Math.max(0, elapsed);
      }

      const finalDistance = distanceRef.current;
      const finalActiveDuration = activeDurationRef.current;
      const finalCalories = calories;
      const finalPace = pace;
      const finalActivityType = activityTypeRef.current;
      const finalSessionId = sessionIdRef.current;

      setIsTracking(false);
      setIsPaused(false);
      isPausedRef.current = false;
      autoPausedRef.current = false;
      isMovingRef.current = false;
      movingSamplesRef.current = 0;
      setIsMoving(false);

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

      if (finalDistance > 0.01 || finalActiveDuration > 5) {
        const historyItem: HistoryItem = {
          id:
            finalSessionId ??
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: Date.now(),
          activityType: finalActivityType,
          distance: finalDistance,
          duration: finalDuration,
          activeDuration: finalActiveDuration,
          calories: finalCalories,
          pace: finalPace,
        };
        await onSaveHistory(historyItem);
        console.log("Riwayat disimpan:", historyItem);
      }

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
  }, [
    isTracking,
    duration,
    calories,
    pace,
    weight,
    locationSub,
    onSaveHistory,
    stopBackgroundLocation,
  ]);

  const resetTracking = useCallback(async () => {
    await stopTracking();
    setLocationStatus("Lokasi belum aktif");
  }, [stopTracking]);

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

  // SAVE TRACKER STATE
  useEffect(() => {
    if (!isTracking) return;
    void saveTrackerState({
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
  }, [isTracking, distance, activeDuration, activityType, weight, saveTrackerState]);

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
    if (!isLoggedIn) return;
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
              activeDuration: activeDurationRef.current,
              lastLocation: lastLocation.current,
              lastTimestamp: Date.now(),
              lastSpokenKm: lastSpokenKmRef.current,
            });
            if (!isPausedRef.current) {
              await startBackgroundLocation();
            }
          }

          if (
            (previousState === "background" || previousState === "inactive") &&
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
                    const latest = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.High,
                    });

                    const point: LatLng = {
                      latitude: latest.coords.latitude,
                      longitude: latest.coords.longitude,
                    };

                    const dist = getDistanceKm(
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
                          activeDuration: activeDurationRef.current,
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
  }, [
    isTracking,
    isLoggedIn,
    saveTrackerState,
    startBackgroundLocation,
    stopBackgroundLocation,
    syncBackgroundTracker,
    speakDistance,
  ]);

  // CLEANUP TIMER
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

  // CLEANUP LOCATION SUB
  useEffect(() => {
    return () => {
      locationSub?.remove();
    };
  }, [locationSub]);

  return {
    // state
    isTracking,
    isPaused,
    activityType,
    setActivityType,
    distance,
    duration,
    activeDuration,
    isMoving,
    calories,
    pace,
    currentLocation,
    route,
    locationStatus,
    heading,
    leafletReady,
    setLeafletReady,
    pulseAnim,
    // refs
    webViewRef,
    // actions
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking,
  };
};