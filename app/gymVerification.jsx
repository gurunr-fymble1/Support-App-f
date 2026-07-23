import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    StyleSheet, Text,
    TextInput,
    StatusBar,
    TouchableOpacity, View,
    FlatList
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GetGymVerification, UpdateGymVerification, UnverifyGymVerification } from "../services/gymVerification";
import { showToast } from "../services/utils/Toaster";

export default function GymVerificationScreen() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedCard, setExpandedCard] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [unverifyModalVisible, setUnverifyModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [updating, setUpdating] = useState(false);

    // pagination & search states
    const [cursor, setCursor] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const limit = 20;

    const [loadingMore, setLoadingMore] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [verifiedTab, setVerifiedTab] = useState(false);
    const [gymTypeInput, setGymTypeInput] = useState("red");

    const handleVerify = async () => {
        if (!selectedItem?.gym_id) return;
        try {
            setUpdating(true);
            await UpdateGymVerification(selectedItem.gym_id);
            showToast("Success", "Gym has been verified successfully!", "success");
            setModalVisible(false);
            fetchData(debouncedSearch, true);
        } catch (err) {
            showToast("Error", err?.response?.data?.detail ?? "Failed to verify gym. Please try again.", "error");
        } finally {
            setUpdating(false);
        }
    };

    const handleUnverify = async () => {
        if (!selectedItem?.gym_id) return;
        try {
            setUpdating(true);
            await UnverifyGymVerification(selectedItem.gym_id, gymTypeInput);
            showToast("Success", "Gym has been unverified successfully!", "success");
            setUnverifyModalVisible(false);
            fetchData(debouncedSearch, true);
        } catch (err) {
            showToast("Error", err?.response?.data?.detail ?? "Failed to unverify gym. Please try again.", "error");
        } finally {
            setUpdating(false);
        }
    };

    const toggleExpandCard = (gymId) => {
        setExpandedCard(expandedCard === gymId ? null : gymId);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchData(debouncedSearch, true);
    }, [debouncedSearch, verifiedTab]);

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
            const responseData = await GetGymVerification(search, currentCursor, limit, verifiedTab);
            const newData = responseData.data || [];
            const next = responseData.next_cursor || null;

            setData(prev => {
                if (isInitial) {
                    return newData;
                }
                return [...prev, ...newData];
            });

            if (next !== null && next !== undefined) {
                setHasMore(true);
                setCursor(next);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            showToast("Error", "Failed to fetch gyms data: " + (err?.message || ""), "error");
            if (isInitial) {
                setError("Failed to load gyms");
                setData([]);
            } else {
                showToast("Error", "Failed to load more Gyms", "error");
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // const handleSearch = () => {
    //     fetchData(searchQuery, true);
    // };

    return (
        <View style={Styles.container}>
            {/* ── Search ────────────────────────────────────────────────── */}
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={Styles.header}>
                <Text style={Styles.headerText}>Gym Verification</Text>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                <View style={Styles.searchContainer}>
                    <TextInput
                        style={[
                            Styles.searchInput,
                            isFocused && Styles.searchInputFocused
                        ]}
                        placeholder="Enter Gym ID or Gym name"
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />
                </View>
                <View style={{ paddingHorizontal: 2, paddingBottom: 1, flexDirection: "row", justifyContent: "center", shadowColor: "#000" }}>
                    <Text style={Styles.searchContanerText}>{data.length} Gyms Found</Text>
                </View>
            </View>

            {/* ── Segmented Control / Tabs ──────────────────────────────── */}
            <View style={Styles.tabContainer}>
                <TouchableOpacity 
                    style={[Styles.tabButton, !verifiedTab && Styles.activeTabButton]}
                    onPress={() => setVerifiedTab(false)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close-circle-outline" size={16} color={!verifiedTab ? "#ffffff" : "#64748b"} />
                    <Text style={[Styles.tabText, !verifiedTab && Styles.activeTabText]}>Unverified Gyms</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[Styles.tabButton, verifiedTab && Styles.activeTabButton]}
                    onPress={() => setVerifiedTab(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="checkmark-circle-outline" size={16} color={verifiedTab ? "#ffffff" : "#64748b"} />
                    <Text style={[Styles.tabText, verifiedTab && Styles.activeTabText]}>Verified Gyms</Text>
                </TouchableOpacity>
            </View>

            {/* ── Gyms List ─────────────────────────────────────────────── */}

            {loading ? (
                <ActivityIndicator size="large" color="#eedfdfff" style={{ marginTop: 40 }} />
            ) : error ? (
                <Text style={{ color: "red", textAlign: "center", fontSize: 20, fontWeight: "bold", fontFamily: "Ubuntu_500Medium", marginTop: 40 }}>{error}</Text>
            ) : data.length === 0 ? (
                <Text style={[Styles.searchText, { color: "#64748b", textAlign: "center", marginTop: 40 }]}>No data found</Text>
            ) : (
                <FlatList 
                    data={data}
                    keyExtractor={(item) => item.gym_id.toString()}
                    style={Styles.listContainer}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    renderItem={({ item }) => (         
                        <TouchableOpacity
                            style={Styles.card}
                            onPress={() => toggleExpandCard(item.gym_id)}
                            activeOpacity={0.7}
                        >
                            {/* ── Header (always visible) ────────────────────── */}
                            <View style={Styles.cardHeader}>
                                <Text style={Styles.cardTitle}>{item.gym_name}</Text>
                            </View>
                            <LinearGradient
                                colors={["#6366f1", "#a855f7"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={Styles.cardAccent}
                            />
                            
                            {/* ── Collapsed Summary ──────────────────────────── */}
                            {expandedCard !== item.gym_id ? (
                                <View style={Styles.cardSummary}>
                                    <Text style={Styles.cardText}>ID: {item.gym_id}</Text>
                                    <Text style={Styles.cardText}>Type: {item.gym_type}</Text>
                                    <Text style={Styles.cardText}>Area: {item.gym_area}</Text>
                                </View>
                            ) : (
                                <View style={Styles.cardDetails}>
                                    <Text style={Styles.cardText}>Gym ID: {item.gym_id}</Text>
                                    <Text style={Styles.cardText}>Gym Name: {item.gym_name}</Text>
                                    <Text style={Styles.cardText}>Gym Type: {item.gym_type}</Text>
                                    <Text style={Styles.cardText}>Operating Hours:{Array.isArray(item.operating_hours) &&
                                        item.operating_hours.map((hour, index) => (
                                            <Text key={index}>
                                                {"\n"}
                                                {hour.day} : {new Date(hour.startTime).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: false,
                                                })}
                                                {" - "}
                                                {new Date(hour.endTime).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: false,
                                                })}
                                            </Text>
                                        ))}
                                    </Text>
                                    <Text style={Styles.cardText}>Area: {item.gym_area}</Text>
                                    <Text style={Styles.cardText}>Location: {item.location}</Text>
                                   {!verifiedTab && (
                                        <>
                                        <Text style={Styles.cardText}>Latitude: {item.latitude}</Text>
                                        <Text style={Styles.cardText}>Longitude: {item.longitude}</Text>
                                        </>
                                    )} 
                                    
                                    
                                    {item.gym_pic ? (
                                        <View style={{ marginVertical: 8 }}>
                                            <Text style={Styles.cardText}>Gym Pic:</Text>
                                            <Image
                                                source={{ uri: item.gym_pic }}
                                                style={{
                                                    width: "100%",
                                                    height: 200,
                                                    borderRadius: 16,
                                                    marginTop: 8,
                                                    borderWidth: 1,
                                                    borderColor: "#f1f5f9",
                                                }}
                                                resizeMode="cover"
                                            />
                                        </View>
                                    ) : <Text style={{color:"#ff0c0cff",textAlign:"center",marginTop:10,fontSize:14}}>Gym Location pic Not Uploaded</Text>}

                                    {verifiedTab ? (
                                        <TouchableOpacity
                                            style={[Styles.rescheduleButton, { backgroundColor: "#f43f5e" }]}
                                            onPress={() => {
                                                setSelectedItem(item);
                                                setGymTypeInput("red"); // reset to default
                                                setUnverifyModalVisible(true);
                                            }}
                                        >
                                            <Text style={Styles.rescheduleText}>Unverify</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={Styles.rescheduleButton}
                                            onPress={() => {
                                                setSelectedItem(item);
                                                setModalVisible(true);
                                            }}
                                        >
                                            <Text style={Styles.rescheduleText}>Verify</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                    onEndReached={() => {
                        if (hasMore && !loading && !loadingMore) {
                            fetchData(debouncedSearch, false);
                        }
                    }}
                    onEndReachedThreshold={0.2}
                    ListFooterComponent={() => {
                        if (!loadingMore) return null;
                        return (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color="#6366f1" />
                            </View>
                        );
                    }}
                />
            )}

            {/* ── Verify Modal ─────────────────────────────────────────── */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={Styles.modalOverlay}>
                    <View style={Styles.modalContent}>
                        <Text style={Styles.modalTitle}>Verify Gym</Text>
                        <Text style={Styles.modalText}>Gym ID: {selectedItem?.gym_id}{"\n"}Gym: {selectedItem?.gym_name}</Text>
                        <View style={Styles.modalButtons}>
                            <TouchableOpacity
                                style={[Styles.modalButton, Styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={Styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[Styles.modalButton, Styles.updateButton]}
                                onPress={handleVerify}
                                disabled={updating}
                            >
                                <Text style={Styles.modalButtonText}>
                                    {updating ? "Updating..." : "Verify"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Unverify Modal ────────────────────────────────────────── */}
            <Modal
                visible={unverifyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setUnverifyModalVisible(false)}
            >
                <View style={Styles.modalOverlay}>
                    <View style={Styles.modalContent}>
                        <Text style={Styles.modalTitle}>Unverify Gym</Text>
                        <Text style={Styles.modalText}>Gym ID: {selectedItem?.gym_id}{"\n"}Gym: {selectedItem?.gym_name}</Text>
                        
                        <Text style={Styles.inputLabel}>Select Status Type:</Text>
                        <View style={Styles.typeOptionsContainer}>
                            {["red", "yellow", "green", "hold"].map((typeVal) => (
                                <TouchableOpacity
                                    key={typeVal}
                                    style={[
                                        Styles.typeOptionChip,
                                        gymTypeInput === typeVal && Styles.activeTypeOptionChip
                                    ]}
                                    onPress={() => setGymTypeInput(typeVal)}
                                >
                                    <Text style={[
                                        Styles.typeOptionText,
                                        gymTypeInput === typeVal && Styles.activeTypeOptionText
                                    ]}>
                                        {typeVal}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={Styles.inputLabel}>Or Enter Custom Type:</Text>
                        <TextInput
                            style={Styles.typeTextInput}
                            value={gymTypeInput}
                            onChangeText={setGymTypeInput}
                            placeholder="e.g. red, yellow, block"
                            placeholderTextColor="#94a3b8"
                        />

                        <View style={Styles.modalButtons}>
                            <TouchableOpacity
                                style={[Styles.modalButton, Styles.cancelButton]}
                                onPress={() => setUnverifyModalVisible(false)}
                            >
                                <Text style={Styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[Styles.modalButton, Styles.updateButton, { backgroundColor: "#f43f5e" }]}
                                onPress={handleUnverify}
                                disabled={updating}
                            >
                                <Text style={Styles.modalButtonText}>
                                    {updating ? "Updating..." : "Unverify"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const Styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingTop: Platform.OS === "ios" ? 50 : 35,
    },
    headerText: {
        color: "#0f172a",
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    BackButton: {
        color: "#f43f5e",
        fontSize: 20,
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
    searchText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
    searchButton: {
        backgroundColor: "#6366f1",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    searchContanerText: {
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
    },
    cardStatus: {
        color: "#94a3b8",
        fontSize: 14,
    },
    cardSummary: {
        marginBottom: 4,
        gap: 6,
    },
    cardDetails: {
        marginBottom: 4,
        gap: 8,
    },
    cardText: {
        color: "#475569",
        fontSize: 14,
        marginBottom: 4,
        fontWeight: "500",
    },
    rescheduleButton: {
        backgroundColor: "#10b981",
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 15,
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    rescheduleText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "800",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    modalContent: {
        backgroundColor: "#ffffff",
        padding: 24,
        borderRadius: 24,
        width: "100%",
        maxWidth: 320,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 20,
        },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    modalTitle: {
        color: "#0f172a",
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 10,
        textAlign: "center",
    },
    modalText: {
        color: "#475569",
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 20,
        textAlign: "center",
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#f43f5e",
    },
    updateButton: {
        backgroundColor: "#10b981",
    },
    modalButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#f1f5f9",
        padding: 4,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 6,
        borderRadius: 10,
    },
    activeTabButton: {
        backgroundColor: "#6366f1",
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748b",
    },
    activeTabText: {
        color: "#ffffff",
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#475569",
        marginBottom: 6,
        alignSelf: "flex-start",
    },
    typeOptionsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
        width: "100%",
    },
    typeOptionChip: {
        backgroundColor: "#f1f5f9",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    activeTypeOptionChip: {
        backgroundColor: "#f43f5e",
        borderColor: "#f43f5e",
    },
    typeOptionText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
        textTransform: "capitalize",
    },
    activeTypeOptionText: {
        color: "#ffffff",
    },
    typeTextInput: {
        width: "100%",
        backgroundColor: "#f8fafc",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: "#0f172a",
        marginBottom: 20,
    },
});