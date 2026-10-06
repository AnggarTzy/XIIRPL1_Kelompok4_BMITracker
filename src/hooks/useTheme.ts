import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";

import { SETTINGS_STORAGE_KEY } from "../constants/config";

export const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  const load = useCallback(async () => {
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
  }, []);

  const toggle = useCallback(async (value: boolean) => {
    setIsDark(value);
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ isDark: value })
      );
    } catch {}
  }, []);

  return { isDark, setIsDark, load, toggle };
};