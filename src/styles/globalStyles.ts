import { Dimensions, Platform, StatusBar, StyleSheet } from "react-native";
import { BRAND } from "./colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const globalStyles = StyleSheet.create({
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
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 45,
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