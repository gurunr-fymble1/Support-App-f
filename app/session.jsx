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
import { getSessionBookings } from "../services/BookingMessageService";
import { showToast } from "../services/utils/Toaster";

export default function SessionScreen() {
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
      const data = await getSessionBookings();
      setBookings(data.data || []);
    } catch (err) {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppPress = async (booking) => {
    if (!booking.owner_contact) {
      alert("No contact number available");
      return;
    }

    // Clean the phone number - remove any non-digit characters
    let cleanContact = booking.owner_contact.replace(/\D/g, '');

    // Add country code if not present (default to 91 for India)
    let phone = cleanContact;
    if (cleanContact.length === 10) {
      phone = `91${cleanContact}`;
    }

    const sessionName = booking.sess?.session_name || booking.session_name || 'N/A';
    const scheduledSessions = booking.sess?.scheduled_sessions || booking.scheduled_sessions || [];
    const scheduledSessionsText = Array.isArray(scheduledSessions)
      ? scheduledSessions.join(', ')
      : scheduledSessions;

    let message = '';

    if (booking.pack_size == 5 || booking.pack_size == 10) {
      message = `Hello Business Partner,

This is to inform you that a client has purchased a *${booking.pack_size}- Personal Training Session* package at your *${booking.gym_name || 'N/A'}* Gym, *${booking.gym_area || 'N/A'}* Branch.

This package is valid from *${booking.created_at}* to *${booking.expires_on}*. During this validity period, the client may attend *${booking.pack_size} Personal Training Sessions* in the available session slots that you have created in the Fymble Business App.

You can view the booking details in the Bookings tab of the Fymble Business App.

When the client arrives, please verify their entry by tapping the "Scan Daily Pass & Fitness Class Pass" button on the Home Page and scanning their pass. Alternatively, you can show the attached QR code to the client, and they can scan it using the Fymble App. You may use either method for client check-in.

If you need any assistance, please feel free to reach out.

Thank you
*Team Fymble*`;

    } else if (booking.pack_size == 7 || booking.pack_size == 14) {
      message = `Hello Business Partner,

This is to inform you that a client has purchased a *${booking.pack_size}- ${booking.sess.session_name} Session* package at your *${booking.gym_name || 'N/A'}* Gym, *${booking.gym_area || 'N/A'}* Branch.

This package is valid from *${booking.created_at}* to *${booking.expires_on}*. During this validity period, the client may attend *${booking.pack_size} Personal Training Sessions* in the available session slots that you have created in the Fymble Business App.

You can view the booking details in the Bookings tab of the Fymble Business App.

When the client arrives, please verify their entry by tapping the "Scan Daily Pass & Fitness Class Pass" button on the Home Page and scanning their pass. Alternatively, you can show the attached QR code to the client, and they can scan it using the Fymble App. You may use either method for client check-in.

If you need any assistance, please feel free to reach out.

Thank you
*Team Fymble*`;

    } else {    
    message = `Hello Business Partner,

This is to inform you that there is 1 Session scheduled for *${sessionName}* on *${scheduledSessionsText}*.
The client may visit your gym at any time during your operating hours to *${booking.gym_name || 'N/A'}* (${booking.gym_area || 'N/A'}) Branch.

You can view the booking details in the Bookings tab of the Fymble Business App.

When the client arrives, please verify their entry by tapping the "Scan Daily Pass & Fitness Class Pass" button on the Home Page and scanning their pass. Or Also you can show the following QR to the client and he can scan from Fymble App. You can use any of your convenient methods for client checkin.

If you need any assistance, feel free to reach out.

Thank you
*Team Fymble*`;
    }


    // Use web WhatsApp URL
    const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(webUrl);

      // After opening WhatsApp, update message status for all day_ids
      try {
        const dayIds = booking.sess?.day_ids || booking.day_ids || [];
        if (dayIds.length > 0) {
          await Promise.all(dayIds.map(dayId => updateMessageStatus(dayId)));
        }
        const bookingId = booking.sess?.purchase_id;
        if (bookingId) {
          setBookings(prev =>
            prev.map(b => {
              if (b.sess?.purchase_id === bookingId) {
                return {
                  ...b,
                  sess: {
                    ...b.sess,
                    message_status: true
                  }
                };
              }
              return b;
            })
          );
        }
      } catch (err) {
        showToast("Error", "Failed to update message status: " + (err?.message || ""), "error");
      }
    } catch (err) {
      showToast("Error", "Error opening WhatsApp: " + (err?.message || ""), "error");
      alert("Could not open WhatsApp. Please make sure WhatsApp is installed.");
    }
  };

  const updateMessageStatus = async (dayId) => {
    try {
      // const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
      const payload = { day_id: String(dayId), status: 1 };


      // console.log('Updating message status:', payload);


      const response = await axiosInstance.post(
        `/support/booking-msg/update-session`,
        payload,
      );

      // console.log('Response status:', response);
      return response.data;
    }
    catch (err) {
      showToast("Error", "Error updating message status: " + (err?.message || ""), "error");
      throw new Error('Failed to update status');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getCardStyle = (status) => {
    if (status === 'attended') {
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
          colors={["#8b5cf6", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Session Bookings</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
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
          colors={["#8b5cf6", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Session Bookings</Text>
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
    const isSent = !!booking.sess?.message_status;
    return activeTab === "sent" ? isSent : !isSent;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={["#8b5cf6", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconBg}>
            <Ionicons name="calendar" size={24} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Session Bookings</Text>
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
            <Ionicons name="mail-unread-outline" size={16} color={activeTab === "unsent" ? "#8b5cf6" : "#64748b"} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === "unsent" && styles.activeTabText]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("sent")}
            style={[styles.tab, activeTab === "sent" && styles.activeTab]}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-open-outline" size={16} color={activeTab === "sent" ? "#8b5cf6" : "#64748b"} style={{ marginRight: 6 }} />
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
              <Ionicons name="calendar-outline" size={50} color="#8b5cf6" />
            </View>
            <Text style={styles.emptyTitle}>No Sessions</Text>
            <Text style={styles.emptyText}>
              {activeTab === "sent" 
                ? "You haven't sent any session messages yet" 
                : "You don't have any pending session messages"}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking, index) => {
            const sessionName = booking.sess?.session_name || booking.session_name || 'N/A';
            const scheduledSessions = booking.sess?.scheduled_sessions || booking.scheduled_sessions || [];
            const scheduledSessionsText = Array.isArray(scheduledSessions)
              ? scheduledSessions.join(', ')
              : scheduledSessions;

            return (
              <View
                key={index}
                style={[styles.bookingCard, getCardStyle(booking.sess?.status)]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.passIdBadge}>
                      <Ionicons name="pricetag" size={14} color="#fff" />
                      <Text style={styles.passIdText}>Purchase Id:{booking.sess.purchase_id || 'N/A'}</Text>
                    </View>
                    {(booking.pack_size === 5 || booking.pack_size === 10) &&(
                        <View style={styles.weeklyPTBadge}>
                        <Ionicons name="cube" size={14} color="#fff" />
                        <Text style={styles.attendedText}>{booking.pack_size} PT Pack</Text>
                      </View>
                    )}
                    {(booking.pack_size === 7 || booking.pack_size === 14) &&(
                        <View style={styles.weeklyPassBadge}>
                        <Ionicons name="cube" size={14} color="#fff" />
                        <Text style={styles.attendedText}>{booking.pack_size} Session Pack</Text>
                      </View>
                    )}
                    {/* {booking.sess?.status === 'attended' && (
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
                      <Ionicons name="barbell" size={18} color="#8b5cf6" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Gym</Text>
                      <Text style={styles.infoValue}>{booking.gym_name || 'N/A'}</Text>
                    </View>
                  </View>
                  
                  <View style={{flex:1, flexDirection: "row",width: "100%", marginBottom:10}}>
                      <View style={{flex:1, flexDirection: "row",justifyContent: "flex-start",alignItems: "flex-start"}}>
                        <View style={styles.infoIcon}>
                          <Ionicons name="location" size={18} color="#8b5cf6" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Area</Text>
                          <Text style={styles.infoValue}>{booking.gym_area || 'N/A'}</Text>
                        </View>
                  </View>

                  <View style={{flex:1, flexDirection: "row",justifyContent: "flex-start",alignItems: "flex-start"}}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="calendar" size={18} color="#06b6d4" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Session</Text>
                      <Text style={styles.infoValue}>{sessionName}</Text>
                    </View>
                  </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="calendar" size={18} color="#06b6d4" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>{booking.pack_size < 5 ? "Scheduled Date & Time" : "Valid From"}</Text>
                      <Text style={styles.infoValue}>{booking.pack_size < 5 ? scheduledSessionsText : booking.created_at}</Text>
                    </View>
                    { booking.pack_size >= 5 && (
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Valid To</Text>
                      <Text style={styles.infoValue}>{booking.expires_on}</Text>
                    </View>)
                    }
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="call" size={18} color="#6366f1" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Contact</Text>
                      <Text style={styles.infoValue}>{booking.owner_contact || 'N/A'}</Text>
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
                  <Text style={styles.whatsappButtonText}>{activeTab === 'sent' ? 'Resend Message' : 'Send via WhatsApp'}</Text>
                  <Ionicons name="send" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })
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
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    position: "absolute",
    top: 36,
    left: 16,
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
    backgroundColor: "#8b5cf6",
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
    backgroundColor: "#ede9fe",
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
  sessionBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  sessionBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  attendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    marginLeft: 8,
  },
  weeklyPassBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#798b03ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    marginLeft: 8,
  },
  weeklyPTBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fd2626ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    marginLeft: 8,
  },
  attendedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  bookingInfo: {
    padding: 16,
  },
  
  clientSection: {
    marginTop: 8,
    backgroundColor: "#e5edf5ff",
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
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
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
  passIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8b5cf6",
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
    color: "#8b5cf6",
    fontWeight: "700",
  },
});
