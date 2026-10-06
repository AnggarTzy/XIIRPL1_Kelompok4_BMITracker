import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ============================================================
// NOTIFIKASI PENCAPAIAN KM
// ============================================================

export const notifyKmReached = async (km: number) => {
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