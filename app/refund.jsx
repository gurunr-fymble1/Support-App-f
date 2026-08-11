import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { getBookingDetails, updateStatus } from "../services/BookingMessageService";
import { showToast } from "../services/utils/Toaster";
import { router } from "expo-router";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback
} from "react-native";

export default function RefundBookingScreen() {
    const [loading, setLoading] = useState(false)
    const [bookingDetails, setBookingDetails] = useState([])
    const [selectedBooking, setSelectedBooking] = useState(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchBookingDetails()
    }, [])

    const fetchBookingDetails = async () => {
        try {
            setLoading(true)
            const data = await getBookingDetails()
            setBookingDetails(data.data || [])
        } catch (error) {
            showToast("Error", error.message, "error")
        } finally {
            setLoading(false)
        }
    };

    const handleRefund = async () => {
        try {
            setLoading(true)
            const res = await updateStatus({payment_id: selectedBooking.payment_id})
            // console.log(res.data)
            
            // Axios returns the response body in res.data, which has our FastAPI wrapper status (200 or 400)
            if (res.data && res.data.status !== 200) {
                throw new Error(res.data.message || "Failed to update status");
            }
            
            if (res.status !== 200) {
                throw new Error("HTTP request failed with status: " + res.status);
            }
 
            // Fetch updated data from backend
            await fetchBookingDetails()
            setSelectedBooking(null)
            
            showToast("Success", "Booking refunded successfully", "success")
        } catch (error) {
            showToast("Error", error.message || "Failed to refund booking", "error")
        } finally {
            setLoading(false)
            setShowConfirmModal(false)
        }
    }

    const filteredBookings = bookingDetails.filter(booking => {
        const name = (booking.client_name || "").toLowerCase();
        const gym = (booking.gym_name || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || gym.includes(query);
    });

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#1e293b" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Refund Booking</Text>
                    <View style={{ width: 32 }} />
                </View>

                <View style={styles.content}>
                    {loading && bookingDetails.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#e11d48" />
                        </View>
                    ) : (
                        <>
                            {/* Search Bar */}
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
                                <TextInput
                                    placeholder="Search by Client Name / Gym Name"
                                    placeholderTextColor="#94a3b8"
                                    style={styles.searchInput}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery !== "" && (
                                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                                        <Ionicons name="close-circle" size={20} color="#94a3b8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Booking List */}
                            {filteredBookings.length === 0 ? (
                                <Text style={styles.noBookingText}>No booking found</Text>
                            ) : (
                                <>
                                    <ScrollView  nestedScrollEnabled={true}>
                                        {filteredBookings.map((booking, index) => {
                                            const isSelected = selectedBooking?.payment_id === booking.payment_id;
                                            return (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.bookingItem,
                                                        isSelected && styles.selectedBookingItem
                                                    ]}
                                                    onPress={() => setSelectedBooking(booking)}
                                                >
                                                    <View style={styles.bookingInfo}>
                                                        <Text style={styles.bookingName}>{booking.client_name}</Text>
                                                        <Text style={styles.bookingDetail}>
                                                            ID: {booking.payment_id} • {booking.gym_name}
                                                        </Text>
                                                        <View style={styles.statusRow}>
                                                            <View style={[
                                                                styles.statusBadge,
                                                                booking.status?.toLowerCase() === "refunded" ? styles.statusRefunded : styles.statusSuccess
                                                            ]}>
                                                                <Text style={styles.statusText}>{booking.status}</Text>
                                                            </View>
                                                            <Text style={styles.bookingDetailDate}>
                                                                {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : ""}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Selected Booking Details Modal */}
            <Modal
                visible={selectedBooking !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedBooking(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedBooking(null)}
                >
                    <TouchableWithoutFeedback>
                        <View style={styles.detailsModalContent}>
                            {selectedBooking && (
                                <>
                                    <View style={styles.detailsModalHeader}>
                                        <Text style={styles.selectedBookingTitle}>Booking Details</Text>
                                        <TouchableOpacity onPress={() => setSelectedBooking(null)} style={styles.closeButton}>
                                            <Ionicons name="close" size={24} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Payment ID</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.payment_id}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Client Name</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.client_name}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Gym Name</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.gym_name}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Source Type</Text>
                                        <Text style={styles.detailValue}>{selectedBooking.source_type || "N/A"}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Payment Status</Text>
                                        <View style={[
                                            styles.statusBadge,
                                            selectedBooking.status?.toLowerCase() === "refunded" ? styles.statusRefunded : styles.statusSuccess
                                        ]}>
                                            <Text style={styles.statusText}>{selectedBooking.status}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Created At</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString() : "N/A"}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.refundButton,
                                            selectedBooking.status?.toLowerCase() === "refunded" && styles.disabledRefundButton
                                        ]}
                                        onPress={() => setShowConfirmModal(true)}
                                        disabled={loading || selectedBooking.status?.toLowerCase() === "refunded"}
                                    >
                                        <Text style={styles.refundButtonText}>
                                            {selectedBooking.status?.toLowerCase() === "refunded" ? "Already Refunded" : "Refund Booking"}
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                animationType="fade"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Refund</Text>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to refund this booking? This action cannot be undone.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowConfirmModal(false)}
                                disabled={loading}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleRefund}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.modalButtonConfirmText}>Confirm Refund</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    container: {
        flexGrow: 1,
        paddingBottom: 0,
    },
    header: {
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight: 35,
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: "#ffffff",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1e293b",
        fontFamily: "Poppins_600SemiBold",
    },
    content: {
        padding: 20,
    },
    loadingContainer: {
        height: 300,
        justifyContent: "center",
        alignItems: "center",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#1e293b",
        paddingVertical: 0,
    },
    noBookingText: {
        textAlign: "center",
        fontSize: 16,
        color: "#64748b",
        marginTop: 40,
    },
    listContainer: {
        maxHeight: 320,
        marginBottom: 20,
    },
    bookingItem: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    selectedBookingItem: {
        borderColor: "#e11d48",
        backgroundColor: "#fff1f2",
    },
    bookingInfo: {
        flex: 1,
        marginRight: 12,
    },
    bookingName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 4,
    },
    bookingDetail: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 6,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "flex-start",
    },
    statusSuccess: {
        backgroundColor: "#dcfce7",
    },
    statusRefunded: {
        backgroundColor: "#ffe4e6",
    },
    statusText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#1e293b",
        textTransform: "uppercase",
    },
    bookingDetailDate: {
        fontSize: 12,
        color: "#94a3b8",
    },
    detailsModalContent: {
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    detailsModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingBottom: 10,
    },
    closeButton: {
        padding: 4,
    },
    selectedBookingTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    detailLabel: {
        fontSize: 14,
        color: "#64748b",
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 14,
        color: "#1e293b",
        fontWeight: "600",
    },
    refundButton: {
        backgroundColor: "#e11d48",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
    },
    disabledRefundButton: {
        backgroundColor: "#cbd5e1",
    },
    refundButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 12,
    },
    modalMessage: {
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: "row",
        width: "100%",
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    confirmButton: {
        backgroundColor: "#e11d48",
    },
    modalButtonCancelText: {
        color: "#475569",
        fontWeight: "600",
    },
    modalButtonConfirmText: {
        color: "#ffffff",
        fontWeight: "600",
    },
});
