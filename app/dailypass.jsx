import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import axiosInstance from "../services/axiosInstance";
import { getDailyPassBookings } from "../services/BookingMessageService";
import { showToast } from "../services/utils/Toaster";

export default function DailyPassScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("unsent"); // "unsent" | "sent"

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await getDailyPassBookings();
      // console.log("data", data)
      // { data?.length ? setBookings(data.data) : setBookings([]) }
      setBookings(data.data || []);
    } catch (err) {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppPress = async (booking) => {
    // Clean the phone number - remove any non-digit characters
    let cleanContact = booking.owner_contact.replace(/\D/g, "");

    // Add country code if not present (default to 91 for India)
    let phone = cleanContact;
    if (cleanContact.length === 10) {
      phone = `91${cleanContact}`;
    }

    const daysText =
      booking.pass.days_total > 1 ? `(${booking.pass.days_total} days)` : "";
    let message = '';
    if (booking.pack_size < 7) {
      message = `Hello Business Partner,

This is to inform you that there is 1 Daily Pass booking${daysText} scheduled for ${booking.scheduled_dates} for *${booking.pass.head_count} members*.
The client may visit your gym at any time during your operating hours to *${booking.gym_name}* ( ${booking.gym_area}) Branch.

You can view the booking details in the Bookings tab of the Fymble Business App.

When the client arrives, please verify their entry by tapping the "Scan Daily Pass & Fitness Class Pass" button on the Home Page and scanning their pass. Or Also you can show the following QR to the client and he can scan from Fymble App. You can use any of your convenient methods for client checkin.

If you need any assistance, feel free to reach out.

Please Refer the attached Video and QR code.

Thank you.
*Team Fymble*`
    } else if (booking.pack_size >= 7) {
      message = `Hello Business Partner,

This is to inform you that a *${booking.pack_size}-Day Pass* booking has been happend at your *${booking.gym_name}* Gym, *${booking.gym_area}* Branch.

This pass allows the client to utilize *${booking.pack_size} visits* within the validity period from *${booking.valid_from}* to *${booking.valid_until}*.

The client may visit your gym at any time during your operating hours.

You can view the booking details in the Bookings tab of the Fymble Business App.

When the client arrives, please verify their entry by tapping the **"Scan Daily Pass & Fitness Class Pass"** button on the Home Page and scanning their pass. Alternatively, you can show the QR code below to the client, and they can scan it using the Fymble App. You may use whichever method is most convenient for the client check-in process.

If you need any assistance, please feel free to reach out.

Please refer to the attached video and QR code.

Thank you.
*Team Fymble*`
    };

    // Use web WhatsApp URL
    const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(webUrl);

      // After opening WhatsApp, update message status for all day_ids
      try {
        const dayIds = booking.day_ids.split(",").map((id) => id.trim());
        await Promise.all(dayIds.map((id) => updateMessageStatus(id)));
        setBookings((prev) =>
          prev.map((b) => {
            if (b.pass.id === booking.pass.id) {
              return {
                ...b,
                pass: {
                  ...b.pass,
                  message_status: true
                }
              };
            }
            return b;
          })
        );
      } catch (err) {
        showToast("Error", "Failed to update message status: " + (err?.message || ""), "error");
      }
    } catch (err) {
      showToast("Error", "Error opening WhatsApp: " + (err?.message || ""), "error");
      alert("Could not open WhatsApp. Please make sure WhatsApp is installed.");
    }
  };

  const updateMessageStatus = async (dayId) => {
    // const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
    try {
      const payload = { day_id: dayId, status: 1 };

      // console.log("Updating message status:", payload);

      const response = await axiosInstance.post(
        `/support/booking-msg/update-dailypass`,
        payload,
      );

      // console.log("Response status:", response.data);
      return response.data;

    } catch (error) {
      showToast(
        "Error",
        "Failed to update message status: " + (error?.message || ""),
        "error"
      );
      return null;
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getCardStyle = (status) => {
    if (status === "attended") {
      return {
        backgroundColor: "#d4edda",
        borderWidth: 1,
        borderColor: "#28a745",
      };
    }
    return {};
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <LinearGradient
          colors={["#f59e0b", "#d97706"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="pricetags" size={24} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Daily Pass Bookings</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <LinearGradient
          colors={["#f59e0b", "#d97706"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="pricetags" size={24} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Daily Pass Bookings</Text>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={50} color="#ef4444" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }


  const filteredBookings = bookings.filter((booking) => {
    const isSent = !!booking.pass?.message_status;
    return activeTab === "sent" ? isSent : !isSent;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={["#f59e0b", "#d97706"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconBg}>
            <Ionicons name="pricetags" size={24} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Daily Pass Bookings</Text>
        </View>
      </LinearGradient>

      {/* ── Segmented Tab Control ─────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab("unsent")}
            style={[styles.tab, activeTab === "unsent" && styles.activeTab]}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-unread-outline" size={16} color={activeTab === "unsent" ? "#f59e0b" : "#64748b"} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === "unsent" && styles.activeTabText]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("sent")}
            style={[styles.tab, activeTab === "sent" && styles.activeTab]}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-open-outline" size={16} color={activeTab === "sent" ? "#f59e0b" : "#64748b"} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === "sent" && styles.activeTabText]}>
              Sent
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={50} color="#f59e0b" />
            </View>
            <Text style={styles.emptyTitle}>No Bookings</Text>
            <Text style={styles.emptyText}>
              {activeTab === "sent" 
                ? "You haven't sent any booking messages yet" 
                : "You don't have any pending booking messages"}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking, index) => (
            <View
              key={index}
              style={[styles.bookingCard, getCardStyle(booking.status)]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.passIdBadge}>
                    <Ionicons name="pricetag" size={14} color="#fff" />
                    <Text style={styles.passIdText}>{booking.pass.id}</Text>
                  </View>
                  {(booking.pack_size === 7 || booking.pack_size === 14) &&(
                      <View style={styles.weeklyPassBadge}>
                      <Ionicons name="cube" size={14} color="#fff" />
                      <Text style={styles.attendedText}>{booking.pack_size} Days Pack</Text>
                    </View>
                  )}
                  {/* {booking.status === "attended" && (
                    <View style={styles.attendedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      <Text style={styles.attendedText}>Attended</Text>
                    </View>
                  )} */}
                </View>
              </View>

              <View style={styles.bookingInfo}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="barbell" size={18} color="#f59e0b" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Gym</Text>
                    <Text style={styles.infoValue}>{booking.gym_name}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="location" size={18} color="#8b5cf6" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Area</Text>
                    <Text style={styles.infoValue}>{booking.gym_area}</Text>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", width: "40%", borderRadius: 10 }}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="person" size={18} color="#6366f1" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Count</Text>
                      <Text style={styles.infoValue}>{booking.pass.head_count}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar" size={18} color="#06b6d4" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{booking.pack_size < 7 ? "Scheduled Date" : "Valid From"}</Text>
                    <Text style={styles.infoValue}>{booking.pack_size < 7 ? booking.scheduled_dates : booking.valid_from}</Text>
                  </View>
                  {booking.pack_size >= 7 && (
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Valid Upto</Text>
                      <Text style={styles.infoValue}>{booking.valid_until}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.infoRowInline}>
                  <View style={styles.infoItemInline}>
                    <View style={styles.infoIconSmall}>
                      <Ionicons name="time" size={16} color="#10b981" />
                    </View>
                    <Text style={styles.infoValueSmall}>{booking.pass.days_total} days</Text>
                  </View>
                  <View style={styles.infoItemInline}>
                    <View style={styles.infoIconSmall}>
                      <Ionicons name="call" size={16} color="#6366f1" />
                    </View>
                    <Text style={styles.infoValueSmall}>{booking.owner_contact}</Text>
                  </View>

                </View>

                <View style={styles.clientSection}>
                  <View style={styles.clientHeader}>
                    <Ionicons name="person" size={16} color="#06b6d4" />
                    <Text style={styles.clientHeaderTitle}>Client Details</Text>
                  </View>
                  <View style={styles.clientDetails}>
                    <View style={styles.clientDetailRow}>
                      <Text style={styles.clientDetailLabel}>Name</Text>
                      <Text style={styles.clientDetailValue}>{booking.client}</Text>
                    </View>
                    <View style={styles.clientDetailRow}>
                      <Text style={styles.clientDetailLabel}>Contact</Text>
                      <Text style={styles.clientDetailValue}>{booking.client_contact}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() => handleWhatsAppPress(booking)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.whatsappButtonText}>Send via WhatsApp</Text>
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerGradient: {
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    position: "absolute",
    top: 36,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingTop: 80,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: "#ef4444",
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    flexDirection: "row",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  passIdText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  attendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  weeklyPassBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#437cffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  attendedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  bookingInfo: {
    padding: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  clientSection: {
    marginTop: 8,
    backgroundColor: "#e1eaf4ff",
    borderRadius: 12,
    padding: 12,
  },
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  clientHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#06b6d4",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clientDetails: {
    gap: 8,
  },
  clientDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientDetailLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  clientDetailValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  infoRowInline: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  infoItemInline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  infoIconSmall: {
    marginRight: 8,
  },
  infoValueSmall: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  whatsappButton: {
    flexDirection: "row",
    backgroundColor: "#25D366",
    paddingVertical: 14,
    paddingHorizontal: 20,
    margin: 16,
    marginTop: 0,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  whatsappButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
    textAlign: "center",
  },
  // Segmented Tab Control Styles
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabBar: {
    flexDirection: "row",
    height: 46,
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabText: {
    color: "#f59e0b",
    fontWeight: "700",
  },
});
