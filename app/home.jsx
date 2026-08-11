import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import { Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import logo_home from "../assets/images/logo_home.png";
import { HomePageStats } from "../services/BookingMessageService";
import { showToast } from "../services/utils/Toaster";


export default function HomeScreen() {
  // const params= useLocalSearchParams();
  // const user = params.user ? JSON.parse(params.user) : { name: "" };

  const [user, setUser] = useState("");

  const [countD, setCountD] = useState(0);
  const [countS, setCountS] = useState(0);
  const [countM, setCountM] = useState(0);

  const [logoutBtn, setLogoutBtn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchbookings();
      UserName();
    }, [])
  );

  const UserName = async () => {
    try {
      const name = await SecureStore.getItemAsync("name")
      setUser(name)
    }
    catch (error) {
      showToast("error", "Error", "Unable to fetch user name!")
    }
  }

  const fetchbookings = async () => {
    try {
      const data = await HomePageStats();
      setCountD(data.data[0]);
      setCountS(data.data[1]);
      setCountM(data.data[2]);
    } catch (error) {
      showToast("error", "Error", "Unable to fetch  bookings counts!");
    }
  };


  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("admin_id");
      await SecureStore.deleteItemAsync("role");
      await SecureStore.deleteItemAsync("name");

      router.replace("/login");

      showToast({
        type: "info",
        title: "Logged Out",
        desc: "Your session has expired. Please log in again.",
      });
    } catch (error) {
      router.replace("/");
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {logoutBtn && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setLogoutBtn(false)}
          />
          <View style={styles.dropdown}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutItem} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <LinearGradient
        colors={["#ffffff", "#f8fafc"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTopRow}>
          <Text style={styles.logoText}>
            <Text style={styles.logoRed}>Fy</Text>
            <Text style={styles.logoCharcoal}>mble Support</Text>
          </Text>

          <TouchableOpacity
            onPress={() => setLogoutBtn(!logoutBtn)}
            style={styles.headerIconContainer}
            activeOpacity={0.85}
          >
            <Image source={logo_home} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.onlineBadge} />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeContainer}>
          <Text style={styles.greeting}>Welcome back  <Text style={{ color: "#f43f5e", fontSize: 18, fontWeight: "bold", textTransform: "capitalize", }}>{user || "Support Admin"}</Text></Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(244, 63, 94, 0.08)" }]}>
              <Ionicons name="pricetags-outline" size={20} color="#f43f5e" />
            </View>
            <Text style={styles.statNumber}>{countD}</Text>
            <Text style={styles.statLabel}>Daily Pass</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(139, 92, 246, 0.08)" }]}>
              <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.statNumber}>{countS}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(6, 182, 212, 0.08)" }]}>
              <Ionicons name="barbell-outline" size={20} color="#06b6d4" />
            </View>
            <Text style={styles.statNumber}>{countM}</Text>
            <Text style={styles.statLabel}>Membership</Text>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.sectionDivider} />
        </View>

        {/* QR Scanner Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/scan")}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(16, 185, 129, 0.08)" }]}>
              <Ionicons name="qr-code-outline" size={24} color="#10b981" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>QR Code Scanner</Text>
              <Text style={styles.cardSubtitle}>Scan and verify Gym QR's</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
          </View>
        </TouchableOpacity>

        {/* Daily Pass Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/dailypass")}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(244, 63, 94, 0.08)" }]}>
              <Ionicons name="pricetags-outline" size={24} color="#f43f5e" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Daily Pass</Text>
              <Text style={styles.cardSubtitle}>View & manage daily passes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
          </View>
        </TouchableOpacity>

        {/* Session Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/session")}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(139, 92, 246, 0.08)" }]}>
              <Ionicons name="calendar-outline" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Sessions</Text>
              <Text style={styles.cardSubtitle}>View & manage sessions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
          </View>
        </TouchableOpacity>

        {/* Membership Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/membership")}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(6, 182, 212, 0.08)" }]}>
              <Ionicons name="barbell-outline" size={24} color="#06b6d4" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Memberships</Text>
              <Text style={styles.cardSubtitle}>View client membership details</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footerView}>
        <TouchableOpacity
          onPress={() => router.push("/rescheduleDailypass")}
          style={styles.footerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={22} color="#71717a" style={styles.footerIcon} />
          <Text style={styles.footerText}>Reschedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/gymVerification")}
          style={styles.footerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#71717a" style={styles.footerIcon} />
          <Text style={styles.footerText}>Gym Verify</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/payment-message")}
          style={styles.footerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="wallet-outline" size={22} color="#71717a" style={styles.footerIcon} />
          <Text style={styles.footerText}>Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/refund")}
          style={styles.footerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="cash-outline" size={22} color="#71717a" style={styles.footerIcon} />
          <Text style={styles.footerText}>Refund</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 56 : 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  welcomeContainer: {
    marginTop: 0,
  },
  dropdown: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 84,
    right: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 6,
    width: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 999,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  logoutIcon: {
    marginRight: 6,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  greeting: {
    fontSize: 16,
    color: "#71717a",
    fontWeight: "500",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#18181b",
    marginTop: 2,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logoRed: {
    color: "#f43f5e",
  },
  logoCharcoal: {
    color: "#18181b",
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f4f4f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  headerLogo: {
    width: 28,
    height: 24,
  },
  onlineBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181b",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10
    ,
    color: "#71717a",
    marginTop: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181b",
    marginRight: 12,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e4e4e7",
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181b",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#71717a",
  },
  footerView: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    height: 72,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingHorizontal: 12,
  },
  footerButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
  },
  footerIcon: {
    marginBottom: 4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#71717a",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
    zIndex: 998,
    backgroundColor: "transparent",
  }
});
