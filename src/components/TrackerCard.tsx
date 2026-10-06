import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

import { BRAND } from "../styles/colors";
import { globalStyles as styles } from "../styles/globalStyles";
import type { Theme } from "../styles/theme";
import { DEFAULT_REGION, MET_VALUES } from "../constants/config";
import type { ActivityType } from "../types";
import type { useTracker } from "../hooks/useTracker";
import { formatTime } from "../utils/format";

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

type TrackerCardProps = {
  theme: Theme;
  tracker: ReturnType<typeof useTracker>;
};

export const TrackerCard = ({ theme, tracker }: TrackerCardProps) => (
  <View style={[styles.card, { backgroundColor: theme.card }]}>
    <View style={styles.cardHeader}>
      <View
        style={[styles.iconCircle, { backgroundColor: BRAND.primarySoft }]}
      >
        <FontAwesome5 name="running" size={23} color={BRAND.primary} />
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
                tracker.activityType === act ? BRAND.primary : theme.soft,
            },
          ]}
          onPress={() => {
            if (!tracker.isTracking) tracker.setActivityType(act);
          }}
          disabled={tracker.isTracking}
        >
          <Text
            style={[
              styles.activityText,
              {
                color: tracker.activityType === act ? "#fff" : theme.muted,
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
        ref={tracker.webViewRef}
        source={{ html: LEAFLET_HTML, baseUrl: "https://example.com" }}
        style={styles.map}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={(event) => {
          if (event.nativeEvent.data === "LEAFLET_READY") {
            tracker.setLeafletReady(true);
          }
        }}
      />
    </View>

    <View
      style={[
        styles.trackingStatusBox,
        { backgroundColor: theme.soft, borderColor: theme.border },
      ]}
    >
      <Animated.View
        style={[
          styles.statusDot,
          {
            backgroundColor: tracker.isPaused
              ? BRAND.warning
              : tracker.isMoving
                ? BRAND.primary
                : tracker.isTracking
                  ? BRAND.warning
                  : theme.muted,
            transform: [{ scale: tracker.pulseAnim }],
          },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.trackingStatusTitle, { color: theme.text }]}>
          {tracker.isPaused
            ? "Dijeda"
            : tracker.isTracking
              ? tracker.isMoving
                ? "Sedang bergerak"
                : "Tidak bergerak"
              : "Pelacakan belum dimulai"}
        </Text>
        <Text style={[styles.trackingStatusText, { color: theme.muted }]}>
          {tracker.locationStatus}
        </Text>
      </View>
    </View>

    <View style={[styles.statsContainer, { backgroundColor: theme.soft }]}>
      <View style={styles.statBox}>
        <FontAwesome5 name="route" size={19} color={theme.muted} />
        <Text style={[styles.statValue, { color: theme.text }]}>
          {tracker.distance.toFixed(2)}
        </Text>
        <Text style={[styles.statLabel, { color: theme.muted }]}>KM</Text>
      </View>

      <View style={styles.statBox}>
        <FontAwesome5
          name={tracker.activityType === "Bersepeda" ? "tachometer-alt" : "running"}
          size={19}
          color={theme.muted}
        />
        <Text style={[styles.statValue, { color: theme.text }]}>
          {tracker.activityType === "Bersepeda"
            ? `${tracker.pace.toFixed(1)}`
            : tracker.pace > 0
              ? `${Math.floor(tracker.pace)}:${Math.round(
                  (tracker.pace % 1) * 60
                )
                  .toString()
                  .padStart(2, "0")}`
              : "--"}
        </Text>
        <Text style={[styles.statLabel, { color: theme.muted }]}>
          {tracker.activityType === "Bersepeda" ? "KM/JAM" : "PACE MIN/KM"}
        </Text>
      </View>

      <View style={styles.statBox}>
        <FontAwesome5 name="stopwatch" size={19} color={theme.muted} />
        <Text style={[styles.statValue, { color: theme.text }]}>
          {formatTime(tracker.duration)}
        </Text>
        <Text style={[styles.statLabel, { color: theme.muted }]}>WAKTU</Text>
      </View>

      <View style={styles.statBox}>
        <FontAwesome5 name="fire-alt" size={19} color={BRAND.danger} />
        <Text style={[styles.statValue, { color: theme.text }]}>
          {tracker.calories.toFixed(0)}
        </Text>
        <Text style={[styles.statLabel, { color: theme.muted }]}>KCAL</Text>
      </View>
    </View>

    <View style={styles.row}>
      {!tracker.isTracking ? (
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: BRAND.primary }]}
          onPress={tracker.startTracking}
        >
          <FontAwesome5 name="play" size={14} color="#fff" />
          <Text style={styles.controlBtnText}>Mulai</Text>
        </TouchableOpacity>
      ) : tracker.isPaused ? (
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: BRAND.primary }]}
          onPress={tracker.resumeTracking}
        >
          <FontAwesome5 name="play" size={14} color="#fff" />
          <Text style={styles.controlBtnText}>Lanjut</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: BRAND.warning }]}
          onPress={tracker.pauseTracking}
        >
          <FontAwesome5 name="pause" size={14} color="#fff" />
          <Text style={styles.controlBtnText}>Jeda</Text>
        </TouchableOpacity>
      )}

      {tracker.isTracking && (
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: BRAND.danger }]}
          onPress={tracker.stopTracking}
        >
          <FontAwesome5 name="stop" size={14} color="#fff" />
          <Text style={styles.controlBtnText}>Stop</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.controlBtn, { backgroundColor: "#64748B" }]}
        onPress={tracker.resetTracking}
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
        GPS digunakan untuk menghitung jarak dan aktivitas. Auto-jeda aktif jika
        tidak bergerak &gt; 20 detik. Tombol Jeda menghentikan timer dan jarak
        sementara.
      </Text>
    </View>
  </View>
);