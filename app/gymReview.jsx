import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { AddGymReview, GetGymReviews, GetGyms } from "../services/gymReview";
import { showToast } from "../services/utils/Toaster";

export default function GymReviewScreen() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Search and Pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [cursor, setCursor] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const limit = 20;

    // Review Modal States
    const [selectedGym, setSelectedGym] = useState(null);
    const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    // Form inputs for new review
    const [actionInput, setActionInput] = useState("");
    const [descriptionInput, setDescriptionInput] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Handle search query debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when search changes
    useEffect(() => {
        fetchData(debouncedSearch, true);
    }, [debouncedSearch]);

    const fetchData = async (search = "", isInitial = true) => {
        try {
            if (isInitial) {
                setLoading(true);
                setError(null);
                setCursor(0);
                setHasMore(true);
            } else {
                setLoadingMore(true);
            }

            const currentCursor = isInitial ? 0 : cursor;
            const responseData = await GetGyms(search, currentCursor, limit);
            const newData = responseData || [];

            setData((prev) => {
                if (isInitial) return newData;
                return [...prev, ...newData];
            });

            // If length is less than limit, we reached the end
            if (newData.length === limit) {
                setHasMore(true);
                // The minimum ID is the last gym's ID since order is DESC
                const minId = newData[newData.length - 1].gym_id;
                setCursor(minId);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            showToast("Error", "Failed to fetch gyms data: " + (err?.message || ""), "error");
            if (isInitial) {
                setError("Failed to load gyms");
                setData([]);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSelectGym = async (gym) => {
        setSelectedGym(gym);
        setReviewsModalVisible(true);
        setActionInput("");
        setDescriptionInput("");
        await fetchReviews(gym.gym_id);
    };

    const fetchReviews = async (gymId) => {
        try {
            setLoadingReviews(true);
            const reviewsData = await GetGymReviews(gymId);
            setReviews(reviewsData || []);
        } catch (err) {
            showToast("Error", "Failed to fetch reviews: " + (err?.message || ""), "error");
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!selectedGym?.gym_id) return;
        if (!actionInput.trim()) {
            Alert.alert("Required", "Please specify an action.");
            return;
        }
        if (!descriptionInput.trim()) {
            Alert.alert("Required", "Please specify a description/review.");
            return;
        }

        try {
            setSubmittingReview(true);
            await AddGymReview(selectedGym.gym_id, actionInput.trim(), descriptionInput.trim());
            showToast("Success", "Review has been submitted successfully!", "success");

            // Clear inputs
            setActionInput("");
            setDescriptionInput("");

            // Reload reviews list
            await fetchReviews(selectedGym.gym_id);
        } catch (err) {
            showToast("Error", err?.response?.data?.detail ?? "Failed to submit review. Please try again.", "error");
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <View style={styles.container}><StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Gym Reviews</Text>
            <View style={{ width: 24 }} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
            <View style={styles.searchContainer}>
                <TextInput style={[styles.searchInput, isFocused && styles.searchInputFocused, searchQuery !== "" && { paddingRight: 40 }]} placeholder="Enter Gym ID or Gym name" placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} />
                {searchQuery !== "" && (
                    <TouchableOpacity onPress={() => setSearchQuery("")} style={{ position: "absolute", right: 16 }}>
                        <Ionicons name="close-circle" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={{ paddingHorizontal: 2, paddingBottom: 1, flexDirection: "row", justifyContent: "center" }}>
                <Text style={styles.searchContainerText}>{`${data.length} Gyms Found`}</Text>
                </View>
                </View>
                {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : data.length === 0 ? (
                <Text style={styles.noDataText}>No gyms found</Text>
            ) : (
                <FlatList 
                    data={data} 
                    keyExtractor={(item) => item.gym_id.toString()} 
                    style={styles.listContainer} 
                    contentContainerStyle={{ paddingBottom: 50 }} 
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleSelectGym(item)} activeOpacity={0.7}>
                            <LinearGradient colors={["#3b82f6", "#8b5cf6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardAccent} />
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <View style={[styles.badge,item.verified ? styles.badgeVerified : styles.badgeUnverified]}>
                                    <Text style={[styles.badgeText,item.verified ? styles.badgeVerifiedText : styles.badgeUnverifiedText]}>{item.verified ? "Verified" : "Unverified"}</Text>
                                </View>
                            </View>
                            <View style={styles.cardSummary}>
                                <Text style={styles.cardText}><Text style={styles.boldLabel}>Gym ID: </Text>{item.gym_id}</Text>
                                <Text style={styles.cardText}><Text style={styles.boldLabel}>City: </Text>{item.city || "N/A"}</Text>
                                <Text style={styles.cardText}><Text style={styles.boldLabel}>State: </Text>{item.state || "N/A"}</Text>
                                <Text style={styles.cardText}><Text style={styles.boldLabel}>Area: </Text>{item.area || "N/A"}</Text>
                            </View>
                        </TouchableOpacity>
                    )} 
                    onEndReached={() => {
                        if (hasMore && !loading && !loadingMore) {
                            fetchData(debouncedSearch, false);
                        }
                    }} onEndReachedThreshold={0.2} ListFooterComponent={() => {
                        if (!loadingMore) return null;
                        return (
                            <View style={{ paddingVertical: 20 }}><ActivityIndicator size="small" color="#6366f1" /></View>
                        );
                    }} />
            )}<Modal 
                visible={reviewsModalVisible} 
                animationType="slide" 
                transparent={true} 
                onRequestClose={() => setReviewsModalVisible(false)}>
                    <View style={styles.modalOverlay}>  
                        <View style={styles.modalContent}>   
                            <View style={styles.modalHeader}>  
                                <Text style={styles.modalTitle} numberOfLines={1}>{selectedGym?.name || ""}</Text>
                                <TouchableOpacity 
                                    onPress={() => setReviewsModalVisible(false)} 
                                    style={styles.modalCloseButton}>
                                        <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView 
                                style={styles.modalBody} 
                                contentContainerStyle={{ paddingBottom: 30 }} 
                                showsVerticalScrollIndicator={false}>  
                                <Text style={styles.sectionHeader}>Reviews History</Text>
                                {loadingReviews ? (
                                    <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 20 }} />
                                ) : reviews.length === 0 ? (
                                    <View style={styles.noReviewsContainer}>
                                        <Ionicons name="chatbox-ellipses-outline" size={32} color="#94a3b8" />
                                        <Text style={styles.noReviewsText}>No reviews found for this gym.</Text>
                                </View>
                            ) : (
                                reviews.map((reviewItem, index) => (
                                    <View key={index} style={styles.reviewCard}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.actionBadge}>
                                                <Text style={styles.actionBadgeText}>{reviewItem.action || ""}</Text>
                                            </View>
                                            <Text style={styles.reviewDate}>{reviewItem.reviewed_on ? new Date(reviewItem.reviewed_on).toLocaleDateString() : ""}</Text>
                                        </View>
                                        <Text style={styles.reviewText}>{reviewItem.review || ""}</Text>
                                    </View>
                                ))
                            )}<View style={styles.modalDivider} />
                            <Text style={styles.sectionHeader}>Write behavioral review</Text>
                            <Text style={styles.inputLabel}>Action Type</Text>
                            <TextInput 
                                style={styles.textInput} 
                                value={actionInput} 
                                onChangeText={setActionInput} 
                                placeholder="e.g. Unverifiy, Price Change...." 
                                placeholderTextColor="#94a3b8" />
                                <Text style={styles.inputLabel}>Description / Notes</Text>
                                <TextInput 
                                    style={[styles.textInput, styles.textAreaInput]} 
                                    value={descriptionInput} 
                                    onChangeText={setDescriptionInput} 
                                    placeholder="Write description detail..." 
                                    placeholderTextColor="#94a3b8" 
                                    multiline={true} 
                                    numberOfLines={4} />
                                    <TouchableOpacity 
                                        style={[styles.submitButton, submittingReview && styles.disabledButton]} 
                                        onPress={handleSubmitReview} 
                                        disabled={submittingReview}> 
                                        {submittingReview ? (
                                            <ActivityIndicator size="small" color="#ffffff" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>Submit Review</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingTop: Platform.OS === "ios" ? 50 : 35,
    },
    backButton: {
        padding: 4,
    },
    headerText: {
        color: "#0f172a",
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 15,
        marginBottom: 10,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        color: "#0f172a",
        backgroundColor: "#ffffff",
        fontSize: 14,
        fontWeight: "500",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInputFocused: {
        borderColor: "#6366f1",
        shadowColor: "#6366f1",
        shadowOpacity: 0.1,
    },
    searchContainerText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4f46e5",
        backgroundColor: "#eef2ff",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: "hidden",
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    cardAccent: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    card: {
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        shadowColor: "#0f172a",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.03,
        shadowRadius: 15,
        elevation: 3,
        overflow: "hidden",
        position: "relative",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        marginTop: 4,
    },
    cardTitle: {
        color: "#0f172a",
        fontSize: 17,
        fontWeight: "800",
        flex: 1,
        marginRight: 10,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeVerified: {
        backgroundColor: "#e6f4ea",
    },
    badgeUnverified: {
        backgroundColor: "#fce8e6",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    badgeVerifiedText: {
        color: "#137333",
    },
    badgeUnverifiedText: {
        color: "#c5221f",
    },
    cardSummary: {
        marginBottom: 4,
        gap: 6,
    },
    cardText: {
        color: "#475569",
        fontSize: 14,
        fontWeight: "500",
    },
    boldLabel: {
        fontWeight: "700",
        color: "#1e293b",
    },
    errorText: {
        color: "#ef4444",
        textAlign: "center",
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 40,
    },
    noDataText: {
        color: "#64748b",
        textAlign: "center",
        fontSize: 15,
        fontWeight: "500",
        marginTop: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        width: "100%",
        height: "85%",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    modalTitle: {
        color: "#0f172a",
        fontSize: 18,
        fontWeight: "800",
        flex: 1,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 15,
    },
    sectionHeader: {
        fontSize: 15,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 10,
        marginTop: 0,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    noReviewsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 30,
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "dashed",
    },
    noReviewsText: {
        color: "#64748b",
        fontSize: 14,
        fontWeight: "500",
        marginTop: 8,
    },
    reviewCard: {
        backgroundColor: "#f8fafc",
        padding: 10,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    actionBadge: {
        backgroundColor: "#f4f4f4ff",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    actionBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0d18f0ff",
        textTransform: "uppercase",
    },
    reviewDate: {
        fontSize: 11,
        color: "#060606ff",
        fontWeight: "500",
    },
    reviewText: {
        fontSize: 12,
        color: "#334155",
        lineHeight: 20,
        fontWeight: "500",
    },
    modalDivider: {
        height: 1,
        backgroundColor: "#f1f5f9",
        marginVertical: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#475569",
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: "#0f172a",
        marginBottom: 16,
    },
    textAreaInput: {
        height: 100,
        textAlignVertical: "top",
    },
    submitButton: {
        backgroundColor: "#6366f1",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
        marginTop: 10,
    },
    disabledButton: {
        backgroundColor: "#a5b4fc",
    },
    submitButtonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
});
