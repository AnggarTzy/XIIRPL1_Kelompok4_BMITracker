import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { HISTORY_STORAGE_KEY, MAX_HISTORY } from "../constants/config";
import type { HistoryFilter, HistoryItem } from "../types";

export const useHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("Semua");

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed: HistoryItem[] = JSON.parse(raw);
        setHistory(parsed);
      }
    } catch (e) {
      console.log("Gagal load history:", e);
    }
  }, []);

  const saveItem = useCallback(async (item: HistoryItem) => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const existing: HistoryItem[] = raw ? JSON.parse(raw) : [];
      if (existing.some((h) => h.id === item.id)) {
        console.log("Duplicate history item, skip:", item.id);
        return;
      }
      const updated = [item, ...existing].slice(0, MAX_HISTORY);
      setHistory(updated);
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.log("Gagal simpan history:", e);
    }
  }, []);

  const deleteItem = useCallback(
    async (id: string) => {
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
    },
    [history]
  );

  const clearAll = useCallback(() => {
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
  }, []);

  const stats = useMemo(() => {
    const totalSessions = history.length;
    const totalKm = history.reduce((sum, h) => sum + h.distance, 0);
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    const totalCalories = history.reduce((sum, h) => sum + h.calories, 0);
    return { totalSessions, totalKm, totalDuration, totalCalories };
  }, [history]);

  const filtered = useMemo(() => {
    if (historyFilter === "Semua") return history;
    return history.filter((h) => h.activityType === historyFilter);
  }, [history, historyFilter]);

  return {
    history,
    historyModalVisible,
    setHistoryModalVisible,
    historyFilter,
    setHistoryFilter,
    stats,
    filtered,
    load,
    saveItem,
    deleteItem,
    clearAll,
  };
};