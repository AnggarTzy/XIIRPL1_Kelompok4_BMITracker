import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import {
  SESSION_STORAGE_KEY,
  STREAK_STORAGE_KEY,
  USER_STORAGE_KEY,
} from "../constants/config";
import type { SessionState, StreakData, UserAccount } from "../types";
import { todayKey, yesterdayKey } from "../utils/format";

type UseAuthOptions = {
  onLoginSuccess: (newUserName?: string) => Promise<void>;
};

export const useAuth = ({ onLoginSuccess }: UseAuthOptions) => {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [streakData, setStreakData] = useState<StreakData>({
    current: 0,
    longest: 0,
    lastLoginDate: "",
    totalLoginDays: 0,
  });

  const [loginName, setLoginName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const updateStreak = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
      const today = todayKey();
      const yesterday = yesterdayKey();

      const data: StreakData = raw
        ? JSON.parse(raw)
        : {
            current: 0,
            longest: 0,
            lastLoginDate: "",
            totalLoginDays: 0,
          };

      if (data.lastLoginDate === today) {
        console.log("Streak: sudah login hari ini");
      } else if (data.lastLoginDate === yesterday) {
        data.current += 1;
        data.totalLoginDays += 1;
        data.lastLoginDate = today;
        if (data.current > data.longest) data.longest = data.current;
        console.log("Streak naik ke:", data.current);
      } else {
        data.current = 1;
        data.totalLoginDays += 1;
        data.lastLoginDate = today;
        if (data.current > data.longest) data.longest = data.current;
        console.log("Streak reset ke 1");
      }

      setStreakData(data);
      await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.log("updateStreak error:", e);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const sessionRaw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

      setHasAccount(!!userRaw);

      if (sessionRaw) {
        const session: SessionState = JSON.parse(sessionRaw);
        setCurrentUser(session.name);
        setIsLoggedIn(true);
        await updateStreak();
        await onLoginSuccess();
      }
    } catch (e) {
      console.log("checkSession error:", e);
    } finally {
      setIsCheckingSession(false);
    }
  }, [updateStreak, onLoginSuccess]);

  const handleLogin = useCallback(async () => {
    setLoginError("");

    const name = loginName.trim();
    const pin = loginPin.trim();

    if (!name || !pin) {
      setLoginError("Nama dan PIN harus diisi.");
      return;
    }

    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setLoginError("PIN harus 4-6 digit angka.");
      return;
    }

    try {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);

      if (raw) {
        const user: UserAccount = JSON.parse(raw);
        if (user.name.toLowerCase() !== name.toLowerCase()) {
          setLoginError("Nama tidak ditemukan. Coba lagi.");
          return;
        }
        if (user.pin !== pin) {
          setLoginError("PIN salah. Coba lagi.");
          return;
        }

        await AsyncStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            name: user.name,
            loggedInAt: Date.now(),
          } as SessionState)
        );

        setCurrentUser(user.name);
        setIsLoggedIn(true);

        await updateStreak();
        await onLoginSuccess();
      } else {
        setIsRegistering(true);
      }
    } catch (e) {
      console.log("handleLogin error:", e);
      setLoginError("Terjadi kesalahan. Coba lagi.");
    }
  }, [loginName, loginPin, updateStreak, onLoginSuccess]);

  const handleRegister = useCallback(async () => {
    setLoginError("");

    const name = loginName.trim();
    const pin = loginPin.trim();
    const confirm = confirmPin.trim();

    if (!name || !pin || !confirm) {
      setLoginError("Semua field harus diisi.");
      return;
    }

    if (name.length < 3) {
      setLoginError("Nama minimal 3 karakter.");
      return;
    }

    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setLoginError("PIN harus 4-6 digit angka.");
      return;
    }

    if (pin !== confirm) {
      setLoginError("PIN dan konfirmasi PIN tidak sama.");
      return;
    }

    try {
      const user: UserAccount = {
        name,
        pin,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          name: user.name,
          loggedInAt: Date.now(),
        } as SessionState)
      );

      setCurrentUser(user.name);
      setIsLoggedIn(true);
      setIsRegistering(false);

      const initialStreak: StreakData = {
        current: 1,
        longest: 1,
        lastLoginDate: todayKey(),
        totalLoginDays: 1,
      };
      setStreakData(initialStreak);
      await AsyncStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify(initialStreak)
      );

      await onLoginSuccess(name);
    } catch (e) {
      console.log("handleRegister error:", e);
      setLoginError("Gagal mendaftar. Coba lagi.");
    }
  }, [loginName, loginPin, confirmPin, onLoginSuccess]);

  const handleLogout = useCallback((closeSidebar: () => void) => {
    Alert.alert("Keluar", "Yakin mau keluar dari akun ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
            setIsLoggedIn(false);
            setCurrentUser(null);
            setLoginName("");
            setLoginPin("");
            setConfirmPin("");
            setLoginError("");
            setIsRegistering(false);
            closeSidebar();
          } catch (e) {
            console.log("Logout error:", e);
          }
        },
      },
    ]);
  }, []);

  return {
    isCheckingSession,
    isLoggedIn,
    currentUser,
    hasAccount,
    streakData,
    loginName,
    setLoginName,
    loginPin,
    setLoginPin,
    confirmPin,
    setConfirmPin,
    loginError,
    setLoginError,
    isRegistering,
    setIsRegistering,
    checkSession,
    handleLogin,
    handleRegister,
    handleLogout,
    updateStreak,
    setStreakData,
  };
};