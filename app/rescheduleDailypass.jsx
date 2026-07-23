import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator, Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity, View
} from "react-native";
import Toast from "react-native-toast-message";
import {
    GetAvailableSessionSlots,
    GetGymsWithDailypassPrice, RescheduleDailyPass, RescheduleSession,
    RescheduleSessionBooking,
    UpdateRescheduleDailyPass
} from "../services/reschedule";
import { showToast, toastConfig } from "../services/utils/Toaster";

const getDay = (date) => {
    if (date) {
        let day = new Date(date).getDay();
        if (day === 0) {
            day = 6;
        } else {
            day = day - 1;
        }
        return day;
    }
    return null;
};

export default function RescheduleDailyPassScreen() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("daily pass");
    const [contactNumber, setContactNumber] = useState("");
    const [focusedInput, setFocusedInput] = useState(null);

    // session
    const [sessionData, setSessionData] = useState([]);
    const [loadingSession, setLoadingSession] = useState(false);
    const [errorSession, setErrorSession] = useState(null);
    const [sessionModalVisible, setSessionModalVisible] = useState(false);
    const [selectedSessionItem, setSelectedSessionItem] = useState(null);
    const [selectedScheduled_Id, setSelectedScheduled_Id] = useState("");
    const [selectedSessionPassId, setSelectedSessionPassId] = useState("");
    const [selectedSessionDayDate, setSelectedSessionDayDate] = useState("");
    const [selectedSessionTimeSlot, setSelectedSessionTimeSlot] = useState("");
    const [newSessionDate, setNewSessionDate] = useState("");
    const [newSessionTimeSlot, setNewSessionTimeSlot] = useState("");
    // const [newScheduleId, setNewScheduleId] = useState(selectedScheduled_Id);
    const [sessionUpdating, setSessionUpdating] = useState(false);
    const [day, setDay] = useState("");
    //--slots
    const [availableSessionSlots, setAvailableSessionSlots] = useState([]);
    const [loadingSessionSlots, setLoadingSessionSlots] = useState(false);
    const [errorSessionSlots, setErrorSessionSlots] = useState(null);
    const [timeSlotModalVisible, setTimeSlotModalVisible] = useState(false);

    // ── Modal state ──────────────────────────────────────────────────────────
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);    // full card item
    const [selectedDayId, setSelectedDayId] = useState("");    // DailypassDays.id to reschedule
    const [selectedDayDate, setSelectedDayDate] = useState(""); // existing scheduled_date for that id
    const [newDate, setNewDate] = useState("");                // user-entered new date
    const [updating, setUpdating] = useState(false);

    // Modal state for Update Gym
    const [updateGymModalVisible, setUpdateGymModalVisible] = useState(false);
    const [gymData, setGymData] = useState([]);
    const [loadingGym, setLoadingGym] = useState(false);
    const [errorGym, setErrorGym] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [gymCursor, setGymCursor] = useState(0);
    const [hasMoreGyms, setHasMoreGyms] = useState(true);
    const [loadingMoreGyms, setLoadingMoreGyms] = useState(false);
    const onEndReachedCalledDuringMomentum = useRef(false);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [newSelectedDayDate, setNewSelectedDayDate] = useState("");


    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery])


    useEffect(() => {
        if (updateGymModalVisible) {
            fetchGym(debouncedSearch)
        }
    }, [debouncedSearch])

    useEffect(() => {
        setNewSessionTimeSlot("")
        setTimeSlotModalVisible(false);
        if (newSessionDate && newSessionDate.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(newSessionDate.trim())) {
                const computedDay = getDay(newSessionDate.trim());
                if (computedDay !== null && computedDay !== undefined && !isNaN(computedDay)) {
                    setDay(computedDay);

                }
            }
        }
    }, [newSessionDate]);

    // useEffect(() => {
    //     if (contactNumber.trim() !== "" && contactNumber.length === 10) {
    //         if (activeTab === "daily pass") {
    //             fetchData(contactNumber);
    //         } else if (activeTab === "session") {
    //             fetchSessionData(contactNumber);
    //         }
    //     }
    // }, [activeTab]);

    const handleContact = async (text) => {
        let cleaned = text.replace(/\D/g, "");
        cleaned = cleaned.slice(-10);
        setContactNumber(cleaned);
    };

    const handleOnclickDP = () => setActiveTab("daily pass");
    const handleOnclickS = () => setActiveTab("session");

    const handleSearch = () => {
        if (contactNumber.length < 10) {
            return showToast("Validation", "Please enter a valid 10-digit contact number.", "error");
        }
        if (contactNumber.trim() !== "" && activeTab === "daily pass") fetchData(contactNumber);
        else if (contactNumber.trim() !== "" && activeTab === "session") fetchSessionData(contactNumber);
    };

    const openUpdateGymModal = (item) => {
        setSelectedItem(item);
        setSearchQuery("");
        fetchGym("");
    };

    const fetchGym = async (search = "", isInitial = true) => {
        try {
            if (isInitial) {
                setLoadingGym(true);
                setErrorGym(null);
                setGymCursor(0);
                setHasMoreGyms(true);
            } else {
                setLoadingMoreGyms(true);
            }

            const currentCursor = isInitial ? 0 : gymCursor;
            const responseData = await GetGymsWithDailypassPrice(search, currentCursor, 20);

            if (isInitial) {
                setGymData(responseData.data || []);
            } else {
                setGymData(prev => [...prev, ...(responseData.data || [])]);
            }

            if (responseData.next_cursor !== null && responseData.next_cursor !== undefined) {
                setGymCursor(responseData.next_cursor);
                setHasMoreGyms(true);
            } else {
                setHasMoreGyms(false);
            }

            setUpdateGymModalVisible(true);
        } catch (err) {
            showToast("Error", "Failed to fetch gyms: " + (err?.message || ""), "error");
            if (isInitial) {
                setErrorGym("Failed to load gyms. Please try again.");
                setGymData([]);
            } else {
                showToast("Error", "Failed to load more gyms.", "error");
            }
        } finally {
            if (isInitial) {
                setLoadingGym(false);
            } else {
                setLoadingMoreGyms(false);
            }
        }
    };

    const renderGymFooter = () => {
        if (!loadingMoreGyms) return null;
        return (
            <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#412df3" />
            </View>
        );
    };

    const handleSelectGym = async (gym) => {
        if (!selectedItem) {
            showToast("Error", "No daily pass selected.", "error");
            return;
        }

        const firstId = selectedItem?.scheduled_date?.[0]?.id?.toString() ?? "";
        const firstDate = selectedItem?.scheduled_date?.[0]?.date ?? "";
        const selectedDate = Array.isArray(selectedItem?.pass?.selected_date)
            ? selectedItem?.pass?.selected_date.join(", ") : selectedItem?.pass?.selected_date ?? "N/A";

        Alert.alert(
            "Confirm Update",
            `Are you sure you want to update the "${selectedItem.pass.gym}" gym to "${gym.gym}" for Daily Pass`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            setUpdating(true);
                            setUpdateGymModalVisible(false);
                            const payload = {
                                id: firstId,
                                pass_id: selectedItem.pass_id.toString(),
                                scheduled_date: [firstDate],
                                reschedule_date: [firstDate],
                                gym_id: selectedItem.pass.gym_id.toString(),
                                new_gym_id: gym.gym_id.toString(),
                                client_id: selectedItem.pass.client_id.toString(),
                                selected_date: selectedDate
                                    ? selectedDate.split(",").map(d => d.trim())
                                    : [],
                                status: selectedItem.pass.status,
                                type: "Gym Update"
                            };
                            // console.log("Updating gym payload:", payload);
                            const responseData = await UpdateRescheduleDailyPass(payload);
                            if (responseData && responseData.status !== 200) {
                                showToast("Error", responseData.message || "Failed to update gym. Please try again.", "error");
                                return;
                            }
                            showToast("Success", "Gym has been updated successfully!", "success");
                            if (contactNumber.trim()) fetchData(contactNumber);
                        } catch (err) {
                            showToast(
                                "Error",
                                err?.response?.data?.detail ?? "Failed to update gym. Please try again.",
                                "error"
                            );
                        } finally {
                            setUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    // dailypass data fetch
    const fetchData = async (contact) => {
        try {
            setLoading(true);
            setError(null);
            const responseData = await RescheduleDailyPass(contact);
            setData(responseData.data);
        } catch (err) {
            showToast("Error", "Failed to load reschedule data: " + (err?.message || ""), "error");
            setError("Failed to load reschedule data. Please try again.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // Open the modal pre-filled with the first scheduled date of the item
    const openRescheduleModal = (item) => {
        if (activeTab === "daily pass") {

            setSelectedItem(item);
            const firstId = item?.scheduled_date?.[0]?.id?.toString() ?? "";
            const firstDate = item?.scheduled_date?.[0]?.date ?? "";
            const selectedDate = Array.isArray(item?.scheduled_date)
                ? item?.scheduled_date?.map(dateObj => dateObj?.date).join(", ") : item?.scheduled_date ?? "N/A";

            setSelectedDayId(firstId);
            setSelectedDayDate(firstDate);
            setNewDate("");
            setNewSelectedDayDate(selectedDate);
            setModalVisible(true);
        }
        else {
            setSelectedSessionItem(item);
            setSelectedSessionPassId(item?.scheduled_date?.[0]?.pass_id?.toString() ?? "");
            setSelectedSessionDayDate(item?.scheduled_date?.[0]?.date ?? "");
            setSelectedSessionTimeSlot(item?.scheduled_date?.[0]?.time ?? "");
            setSelectedScheduled_Id(item?.scheduled_date?.[0]?.schedule_id?.toString() ?? "");
            setNewSessionDate("");
            setSessionModalVisible(true);
            setTimeSlotModalVisible(false)
            setDay(getDay(item?.scheduled_date?.[0]?.date));
        }
    };


    const handleUpdate = async () => {
        if (!newDate.trim()) {
            showToast("Validation", "Please enter a new reschedule date.", "error");
            return;
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(newDate.trim())) {
            showToast("Validation", "Date must be in YYYY-MM-DD format.", "error");
            return;
        }
        try {
            setUpdating(true);
            const payload = {
                id: selectedDayId,
                pass_id: selectedItem.pass_id.toString(),
                scheduled_date: [selectedDayDate],
                reschedule_date: [newDate.trim()],
                gym_id: selectedItem.pass.gym_id.toString(),
                // new_gym_id: null,
                client_id: selectedItem.pass.client_id.toString(),
                pack_size: selectedItem.pass.pack_size ?? 1,
                selected_date: newSelectedDayDate
                    ? newSelectedDayDate.split(",").map(d => d.trim())
                    : [],
                status: selectedItem.pass.status,
                type: 'Daily-Pass Date update',
            };
            // console.log(payload);
            const responseData = await UpdateRescheduleDailyPass(payload);
            if (responseData && responseData.status !== 200) {
                // console.log("error", responseData)
                showToast("Error", responseData.message || "Failed to reschedule. Please try again.", "error")
                // Alert.alert("Error", responseData.message || "Failed to reschedule. Please try again.");
                return;
            }
            setModalVisible(false);
            if (contactNumber.trim()) fetchData(contactNumber);
            setTimeout(() => {
                showToast("Success", "Daily pass has been rescheduled successfully!", "success");
            }, 400);
        } catch (err) {
            // console.log("error11111", err)
            if (err?.response) {
                showToast("Error", err?.message, "error")
            }
            showToast("Error", err?.response?.data?.detail ?? "Failed to reschedule. Please try again.", "error")
        } finally {
            setUpdating(false);
        }
    };

    // fetch session data
    const fetchSessionData = async (contact) => {
        try {
            setLoadingSession(true);
            setErrorSession(null);
            const responseData = await RescheduleSession(contact);
            setSessionData(responseData.data);
        } catch (err) {
            showToast("Error", "Failed to load session data: " + (err?.message || ""), "error");
            setErrorSession("Failed to load session data. Please try again.");
            setSessionData([]);
        } finally {
            setLoadingSession(false);
        }
    };

    //fetching Available session slots 
    const fetchAvailableSessionSlots = async () => {
        try {
            setLoadingSessionSlots(true);
            setErrorSessionSlots(null);
            const data = {
                gym_id: selectedSessionItem?.gym_id?.toString(),
                session_id: selectedSessionItem?.session_id?.toString(),
                trainer_id: selectedSessionItem?.trainer_id?.toString(),
                weekday: day,
            }
            const responseData = await GetAvailableSessionSlots(data);
            setAvailableSessionSlots(responseData.data || []);
        } catch (err) {
            showToast("Error", "Failed to load available session slots: " + (err?.message || ""), "error");
            setErrorSessionSlots("Failed to load available session slots. Please try again.");
            setAvailableSessionSlots([]);
        } finally {
            setTimeSlotModalVisible(true);
            setNewSessionTimeSlot("");
            setLoadingSessionSlots(false);
        }
    };


    const handleSessionUpdate = async () => {
        if (!newSessionDate && !newSessionTimeSlot) {
            showToast("Alert", "Please select a new date or time slot.", "error")
            // Alert.alert("Alert", "Please select a new date or time slot.");
            return;
        }
        if ((newSessionDate === "" || newSessionDate === selectedSessionDayDate) && newSessionTimeSlot === selectedSessionTimeSlot) {
            showToast("Alert", "Please select a new date or time slot.", "error")
            // Alert.alert("Alert", "Please select a new date or time slot.");
            return;
        }
        if (newSessionDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(newSessionDate.trim())) {
                showToast("Alert", "Date must be in YYYY-MM-DD format.", "error");
                return;
            }
        }
        if (!newSessionTimeSlot && newSessionDate) {
            showToast("Alert", "Please select a time slot for new reschedule date.", "error");
            return;
        }

        try {
            setUpdating(true);
            const payload = {
                purchase_id: selectedSessionItem?.purchase_id.toString(),
                pass_id: selectedSessionPassId.toString(),
                scheduled_date: selectedSessionDayDate,
                start_time: selectedSessionTimeSlot,
                reschedule_time: newSessionTimeSlot ? newSessionTimeSlot : selectedSessionTimeSlot,
                reschedule_date: newSessionDate.trim() ? newSessionDate.trim() : selectedSessionDayDate,
                gym_id: selectedSessionItem?.gym_id?.toString(),
                client_id: selectedSessionItem?.client_id?.toString(),
                pack_size: selectedSessionItem?.pack_size,
                schedule_id: selectedScheduled_Id.toString(),
                trainer_id: selectedSessionItem?.trainer_id?.toString() ?? null,
                type: 'Session Date update',
            };
            const responseData = await RescheduleSessionBooking(payload);
            if (responseData && responseData.status !== 200) {
                showToast("Error", responseData.message || "Failed to reschedule. Please try again.", "error");
                return;
            }
            setSessionModalVisible(false);
            setNewSessionTimeSlot("")
            // setTimeSlotModalVisible(false);
            if (contactNumber.trim()) fetchSessionData(contactNumber);
            setTimeout(() => {
                showToast("Success", "Session has been rescheduled successfully!", "success");
            }, 400);

        } catch (err) {
            showToast("Error", err?.response?.data?.detail ?? "Failed to reschedule. Please try again.", "error");
        } finally {
            setUpdating(false);
        }
    };

    const handleTimeSlotSelection = (slot) => {
        setNewSessionTimeSlot(slot.start_time);
        setSelectedScheduled_Id(slot.id);
    };

    // const getStatusStyle = (status) => {
    //     const lowerStatus = (status || "").toLowerCase();
    //     if (lowerStatus === "available") {
    //         return {
    //             bg: "#e6f9f3",
    //             text: "#10b981",
    //             label: "Available"
    //         };
    //     } else if (lowerStatus === "scheduled" || lowerStatus === "rescheduled") {
    //         return {
    //             bg: "#eff6ff",
    //             text: "#2563eb",
    //             label: status
    //         };
    //     } else {
    //         return {
    //             bg: "#fff3cd",
    //             text: "#d97706",
    //             label: status || "Pending"
    //         };
    //     }
    // };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={Styles.container}>

                {/* ── Custom Header ────────────────────────────────────────── */}
                <View style={Styles.appHeader}>
                    <TouchableOpacity
                        style={Styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#0f172a" />
                    </TouchableOpacity>
                    <Text style={Styles.headerTitle}>Reschedule Booking</Text>
                    <View style={Styles.headerRightSpacer}>
                        <Ionicons name="calendar-outline" size={22} color="#6366f1" />
                    </View>
                </View>



                {/* ── Search Container ─────────────────────────────────────── */}
                <View style={Styles.searchSection}>
                    <Text style={Styles.searchLabel}>Search client bookings by contact number</Text>
                    <View style={Styles.searchRow}>
                        <View style={[
                            Styles.inputWrapper,
                            focusedInput === "contact" && Styles.inputWrapperFocused
                        ]}>
                            <Ionicons name="call-outline" size={18} color={focusedInput === "contact" ? "#6366f1" : "#94a3b8"} style={Styles.inputIcon} />
                            <TextInput
                                style={Styles.searchInput}
                                placeholder="Enter contact number"
                                placeholderTextColor="#94a3b8"
                                value={contactNumber}
                                onChangeText={handleContact}
                                keyboardType="phone-pad"
                                onFocus={() => setFocusedInput("contact")}
                                onBlur={() => setFocusedInput(null)}
                            />
                            {contactNumber.length > 0 && (
                                <TouchableOpacity onPress={() => setContactNumber("")} style={Styles.clearIcon}>
                                    <Ionicons name="close-circle" size={16} color="#cbd5e1" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity activeOpacity={0.85} onPress={handleSearch}>
                            <LinearGradient
                                colors={["#6366f1", "#4f46e5"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={Styles.searchButton}
                            >
                                <Ionicons name="search-outline" size={20} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Segmented Tab Control ─────────────────────────────────── */}
                <View style={Styles.tabContainer}>
                    <View style={Styles.tabBar}>
                        <TouchableOpacity
                            onPress={handleOnclickDP}
                            style={[Styles.tab, activeTab === "daily pass" && Styles.activeTab]}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="ticket-outline" size={16} color={activeTab === "daily pass" ? "#6366f1" : "#64748b"} style={{ marginRight: 6 }} />
                            <Text style={[Styles.tabText, activeTab === "daily pass" && Styles.activeTabText]}>
                                Daily Pass
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleOnclickS}
                            style={[Styles.tab, activeTab === "session" && Styles.activeTab]}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="time-outline" size={16} color={activeTab === "session" ? "#6366f1" : "#64748b"} style={{ marginRight: 6 }} />
                            <Text style={[Styles.tabText, activeTab === "session" && Styles.activeTabText]}>
                                Session
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Content Area ─────────────────────────────────────────── */}
                {(activeTab === "daily pass" ? loading : loadingSession) ? (
                    <View style={Styles.stateContainer}>
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text style={Styles.stateText}>Fetching {activeTab === "daily pass" ? "passes" : "sessions"}...</Text>
                    </View>
                ) : (activeTab === "daily pass" ? error : errorSession) ? (
                    <View style={Styles.stateContainer}>
                        <View style={Styles.errorIconContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                        </View>
                        <Text style={Styles.errorText}>{activeTab === "daily pass" ? error : errorSession}</Text>
                        <TouchableOpacity style={Styles.retryButton} onPress={handleSearch}>
                            <Text style={Styles.retryButtonText}>Retry Search</Text>
                        </TouchableOpacity>
                    </View>
                ) : activeTab === "daily pass" ? (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={Styles.scrollContent}>
                        {(!data || !Array.isArray(data) || data.length === 0) ? (
                            <View style={Styles.emptyStateContainer}>
                                <View style={Styles.emptyIconContainer}>
                                    <Ionicons name={contactNumber.length < 10 ? "phone-portrait-outline" : "search-outline"} size={48} color="#94a3b8" />
                                </View>
                                <Text style={Styles.emptyStateTitle}>
                                    {contactNumber.length < 10 ? "Start Rescheduling" : "No Passes Found"}
                                </Text>
                                <Text style={Styles.emptyStateSub}>
                                    {contactNumber.length < 10
                                        ? "Please enter a valid 10-digit mobile number above to fetch active passes."
                                        : "We couldn't find any active passes associated with this contact number."}
                                </Text>
                            </View>
                        ) : (
                            data.map((item, index) => {
                                return (
                                    <View key={index} style={Styles.cardContainer}>
                                        <View style={Styles.card}>
                                            {/* Card Top Border Accent */}
                                            <LinearGradient
                                                colors={["#6366f1", "#a855f7"]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={Styles.cardAccent}
                                            />

                                            {/* Header Row */}
                                            <View style={Styles.cardHeaderRow}>
                                                {(item.pass.pack_size < 7) ? (
                                                    <View style={Styles.passIdBadge}>
                                                        <Ionicons name="pricetag-outline" size={12} color="#4f46e5" style={{ marginRight: 4 }} />
                                                        <Text style={Styles.passIdText}>ID: {item?.pass_id ?? "N/A"}</Text>
                                                    </View>
                                                ) : (
                                                    <View style={Styles.weeklyPassBadge}>
                                                        <Ionicons name="cube" size={14} color="#fff" />
                                                        <Text style={{ color: "#ffffff", marginLeft: 5, fontFamily: "Poppins-Bold", fontSize: 12, fontWeight: 800 }}>
                                                            {item?.pass?.pack_size} Days Pack ({item.pass.days_used}/{item.pass.pack_size})</Text>
                                                    </View>
                                                )}

                                                {(item.pass.pack_size < 7) && (
                                                    <View style={Styles.rescheduleButton}>
                                                        <TouchableOpacity onPress={() => openUpdateGymModal(item)} style={{ padding: 8, backgroundColor: '#6366f1', borderRadius: 8, height: 40, justifyContent: 'center' }} >
                                                            <Text style={{ color: "white", fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Update Gym</Text></TouchableOpacity>
                                                    </View>
                                                )
                                                }

                                            </View>

                                            {/* Body Info */}
                                            <View style={Styles.cardBody}>
                                                <View style={{ flex: 1, flexDirection: "row", gap: 30 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={Styles.infoRow}>
                                                            <Ionicons name="person-circle-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                            <View style={Styles.infoContent}>
                                                                <Text style={Styles.infoLabel}>Client Name</Text>
                                                                <Text style={Styles.infoValue}>{item?.pass?.client_name ?? "N/A"}</Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <View style={{ flex: 1 }}>
                                                        <View style={Styles.infoRow}>
                                                            <Ionicons name="people-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                            <View style={Styles.infoContent}>
                                                                <Text style={Styles.infoLabel}>Head Count</Text>
                                                                <Text style={Styles.infoValue}>
                                                                    {item?.pass?.head_count}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>



                                                <View style={Styles.infoRow}>
                                                    <Ionicons name="business-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                    <View style={Styles.infoContent}>
                                                        <Text style={Styles.infoLabel}>Gym</Text>
                                                        <Text style={Styles.infoValue}>{item?.pass?.gym ?? "N/A"}</Text>
                                                    </View>
                                                </View>

                                                <View style={{ flex: 1, flexDirection: 'row' }}>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={Styles.infoRow}>
                                                            <Ionicons name="business-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                            <View style={Styles.infoContent}>
                                                                <Text style={Styles.infoLabel}>Pass Price</Text>
                                                                <Text style={Styles.infoValue}>{item?.pass?.discount_price ?? "N/A"}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={Styles.infoRow}>
                                                            <Ionicons name="cash-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                            <View style={Styles.infoContent}>
                                                                <Text style={Styles.infoLabel}>Amount Paid</Text>
                                                                <Text style={Styles.infoValue}>{item?.pass?.amount_paid ?? "N/A"}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>

                                                {item?.pass?.pack_size > 1 &&
                                                    <View style={{ flex: 1, flexDirection: 'row' }}>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={Styles.infoRow}>
                                                                <Ionicons name="calendar" size={18} color="#64748b" style={Styles.infoIcon} />
                                                                <View style={Styles.infoContent}>
                                                                    <Text style={Styles.infoLabel}>Valid from</Text>
                                                                    <Text style={Styles.infoValue}>{item?.pass?.valid_from ?? "N/A"}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={Styles.infoRow}>
                                                                <Ionicons name="" size={18} color="#64748b" style={Styles.infoIcon} />
                                                                <View style={Styles.infoContent}>
                                                                    <Text style={Styles.infoLabel}>Valid until</Text>
                                                                    <Text style={Styles.infoValue}>{item?.pass?.valid_until ?? "N/A"}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </View>
                                                }

                                                <View style={Styles.infoRow}>
                                                    <Ionicons name="calendar-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                    <View style={Styles.infoContent}>
                                                        <Text style={Styles.infoLabel}>Scheduled Date</Text>
                                                        <Text style={Styles.infoValue}>
                                                            {item?.scheduled_date?.length
                                                                ? item.scheduled_date.map((d, index) => (
                                                                    <Text key={index}>
                                                                        {d.date} : {d.status}
                                                                        {"\n"}
                                                                    </Text>
                                                                ))
                                                                : "N/A"}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Reschedule CTA */}
                                            <TouchableOpacity
                                                activeOpacity={0.9}
                                                style={Styles.rescheduleButton}
                                                onPress={() => openRescheduleModal(item)}
                                            >
                                                <LinearGradient
                                                    colors={["#4f46e5", "#6366f1"]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={Styles.buttonGradient}
                                                >
                                                    <Ionicons name="calendar-clear-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                                                    <Text style={Styles.rescheduleButtonText}>Reschedule Pass</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                ) : (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={Styles.scrollContent}>
                        {(!sessionData || !Array.isArray(sessionData) || sessionData.length === 0) ? (
                            <View style={Styles.emptyStateContainer}>
                                <View style={Styles.emptyIconContainer}>
                                    <Ionicons name={contactNumber.length < 10 ? "phone-portrait-outline" : "search-outline"} size={48} color="#94a3b8" />
                                </View>
                                <Text style={Styles.emptyStateTitle}>
                                    {contactNumber.length < 10 ? "Start Rescheduling" : "No Sessions Found"}
                                </Text>
                                <Text style={Styles.emptyStateSub}>
                                    {contactNumber.length < 10
                                        ? "Please enter a valid 10-digit mobile number above to fetch active sessions."
                                        : "We couldn't find any active sessions associated with this contact number."}
                                </Text>
                            </View>
                        ) : (
                            sessionData.map((item, index) => {
                                return (
                                    <View key={index} style={Styles.cardContainer}>
                                        <View style={Styles.card}>
                                            {/* Card Top Border Accent */}
                                            <LinearGradient
                                                colors={["#6366f1", "#a855f7"]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={Styles.cardAccent}
                                            />

                                            {/* Header Row */}
                                            <View style={Styles.cardHeaderRow}>

                                                <View style={Styles.passIdBadge}>
                                                    <Ionicons name="pricetag-outline" size={12} color="#4f46e5" style={{ marginRight: 4 }} />
                                                    <Text style={Styles.passIdText}>Purchase ID: {item?.purchase_id ?? "N/A"}</Text>
                                                </View>
                                                {/* ):( */}
                                                {(item?.pack_size > 4) && (
                                                    <View style={Styles.weeklyPassBadge}>
                                                        <Ionicons name="cube" size={14} color="#fff" />
                                                        <Text style={{ color: "#ffffff", marginLeft: 5, fontFamily: "Poppins-Bold", fontSize: 12, fontWeight: 800 }}>
                                                            {item?.pack_size} {item?.pack_size === (5 || 10) ? "PT Pack" : "Days Pack"}({item.sessions_used}/{item.pack_size})</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Body Info */}
                                            <View style={Styles.cardBody}>
                                                <View style={Styles.infoRow}>
                                                    <Ionicons name="person-circle-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                    <View style={Styles.infoContent}>
                                                        <Text style={Styles.infoLabel}>Client Name</Text>
                                                        <Text style={Styles.infoValue}>{item?.client_name ?? "N/A"}</Text>
                                                    </View>
                                                </View>

                                                <View style={Styles.infoRow}>
                                                    <Ionicons name="business-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                    <View style={Styles.infoContent}>
                                                        <Text style={Styles.infoLabel}>Gym</Text>
                                                        <Text style={Styles.infoValue}>{item?.gym ?? "N/A"}</Text>
                                                    </View>
                                                </View>

                                                <View style={[Styles.infoRow, {gap: 10}]}>
                                                    <View style={{ flex: 1, flexDirection : "row" }}>
                                                        <Ionicons name="sparkles-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                        <View style={Styles.infoContent}>
                                                            <Text style={Styles.infoLabel}>Session</Text>
                                                            <Text style={Styles.infoValue}>{item?.session ?? "N/A"}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ flex: 1, flexDirection : "row"}}>
                                                        <Ionicons name="card-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                        <View style={Styles.infoContent}>
                                                            <Text style={Styles.infoLabel}>Session Price</Text>
                                                            <Text style={Styles.infoValue}>{item?.price != null ? `₹${item.price}` : "N/A"}</Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                {item.pack_size > 1 &&
                                                <View style={[Styles.infoRow, {gap: 10}]}>
                                                    <View style={{ flex: 1, flexDirection : "row" }}>
                                                        <Ionicons name="calendar" size={18} color="#64748b" style={Styles.infoIcon} />
                                                        <View style={Styles.infoContent}>
                                                            <Text style={Styles.infoLabel}>Valid From</Text>
                                                            <Text style={Styles.infoValue}>{item?.created_at ?? "N/A"}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ flex: 1, flexDirection : "row"}}>
                                                        {/* <Ionicons name="card-outline" size={18} color="#64748b" style={Styles.infoIcon} /> */}
                                                        <View style={Styles.infoContent}>
                                                            <Text style={Styles.infoLabel}>Valid Until</Text>
                                                            <Text style={Styles.infoValue}>{item?.expires_on ?? "N/A"}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                }

                                                <View style={Styles.infoRow}>
                                                    <Ionicons name="calendar-outline" size={18} color="#64748b" style={Styles.infoIcon} />
                                                    <View style={Styles.infoContent}>
                                                        <Text style={Styles.infoLabel}>Scheduled Date</Text>
                                                        <Text style={Styles.infoValue}>
                                                            {item?.scheduled_date?.length
                                                                ? item.scheduled_date.map((d, idx) => (
                                                                    <Text key={idx}>
                                                                        {d.date} at {d.time} ({d.status})
                                                                        {"\n"}
                                                                    </Text>
                                                                ))
                                                                : "N/A"}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Reschedule CTA */}
                                            <TouchableOpacity
                                                activeOpacity={0.9}
                                                style={Styles.rescheduleButton}
                                                onPress={() => { openRescheduleModal(item) }}
                                            >
                                                <LinearGradient
                                                    colors={["#0338e7ff", "#12cdcaff"]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={Styles.buttonGradient}
                                                >
                                                    <Ionicons name="calendar-clear-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                                                    <Text style={Styles.rescheduleButtonText}>Reschedule Session</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}

                {/* Update Gym Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={updateGymModalVisible}
                    onRequestClose={() => setUpdateGymModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={{ flex: 1 }}
                    >
                        <View style={Styles.modalOverlay}>
                            <View style={Styles.modalCard}>
                                <Text style={Styles.modalTitle}>Update Gym</Text>

                                <View style={Styles.modalContent}>
                                    <Text style={Styles.modalLabel}>Select New Gym</Text>
                                    <View style={Styles.inputContainer}>
                                        <Ionicons name="search-outline" size={20} color="#9ca3af" style={Styles.inputIcon} />
                                        <TextInput
                                            style={Styles.input}
                                            placeholder="Search for a gym with name"
                                            placeholderTextColor="#9ca3af"
                                            value={searchQuery}
                                            onChangeText={(text) => {
                                                setSearchQuery(text);
                                                // fetchGym(text);
                                            }}
                                            onFocus={() => setFocusedInput("search")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                </View>

                                {loadingGym ? (
                                    <View style={Styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#6366f1" />
                                    </View>
                                ) : errorGym ? (
                                    <Text style={Styles.errorText}>{errorGym}</Text>
                                ) : gymData.length === 0 ? (
                                    <View style={Styles.emptyGymContainer}>
                                        <Text style={Styles.emptyGymText}>No gyms found</Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={gymData}
                                        keyExtractor={(item) => item.gym_id.toString()}
                                        style={Styles.gymList}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={Styles.gymItem}
                                                onPress={() => handleSelectGym(item)}
                                            >
                                                <View style={Styles.gymInfo}>
                                                    <Text style={Styles.gymName}>{item.gym}</Text>
                                                    <Text style={Styles.gymLocation}>ID: {item.gym_id}</Text>
                                                    <Text style={Styles.gymLocation}>Area: {item.area}</Text>
                                                </View>
                                                <View style={Styles.gymPrice}>
                                                    <Text style={Styles.gymPriceText}>₹{item.discount_price}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}

                                        onMomentumScrollBegin={() => {
                                            onEndReachedCalledDuringMomentum.current = false;
                                        }}

                                        onEndReached={() => {
                                            if (hasMoreGyms && !loadingGym && !loadingMoreGyms) {
                                                fetchGym(searchQuery, false);
                                            }
                                        }}

                                        onEndReachedThreshold={0.2}
                                        ListFooterComponent={renderGymFooter}
                                    />
                                )}

                                <View style={Styles.modalButtons}>
                                    <TouchableOpacity
                                        style={Styles.cancelButton}
                                        onPress={() => setUpdateGymModalVisible(false)}
                                    >
                                        <Text style={Styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        <Toast config={toastConfig} />
                    </KeyboardAvoidingView>
                </Modal>


                {/* ── Reschedule Modal ─────────────────────────────────────── */}
                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="slide"
                    statusBarTranslucent
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={{ flex: 1 }}
                    >
                        <View style={Styles.modalOverlay}>
                            <TouchableOpacity
                                style={Styles.modalBackgroundDismiss}
                                activeOpacity={1}
                                onPress={() => setModalVisible(false)}
                            />
                            <View style={Styles.modalCard}>
                                <View style={Styles.modalHeaderIndicator} />

                                <Text style={Styles.modalTitle}>Reschedule Details</Text>
                                <Text style={Styles.modalSubtitle}>Change scheduled date for Daily Pass #{selectedItem?.pass_id}</Text>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

                                    {/* Date Selector Pills */}
                                    <Text style={Styles.modalLabel}>Select original scheduled date to change</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={Styles.datePillScroll}
                                        contentContainerStyle={{ paddingRight: 16 }}
                                    >
                                        {selectedItem?.scheduled_date?.map((dayObj, i) => {
                                            const dayId = dayObj.id?.toString();
                                            const d = dayObj.date;
                                            const status = dayObj.status;
                                            const isActive = selectedDayId === dayId;
                                            return (
                                                <TouchableOpacity
                                                    key={i}
                                                    style={[Styles.datePill, isActive && Styles.datePillActive, isActive && status === "attended" && { backgroundColor: "#51cd41ff" }]}
                                                    onPress={() => {
                                                        setSelectedDayId(dayId);
                                                        setSelectedDayDate(d);
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="calendar" size={12} color={isActive ? "#fff" : status === "attended" ? "#51cd41ff" : "#6366f1"} style={{ marginRight: 4 }} />
                                                    <Text style={[Styles.datePillText, isActive && Styles.datePillTextActive, !isActive && status === "attended" && { color: "#51cd41ff" }]}>
                                                        {d}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    {/* Current Details Display */}
                                    <View style={Styles.gridDetails}>
                                        <View style={Styles.gridHalf}>
                                            <Text style={Styles.modalLabel}>Selected Date</Text>
                                            <View style={Styles.readonlyField}>
                                                <Ionicons name="calendar-sharp" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                <Text style={Styles.readonlyText}>{selectedDayDate || "—"}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Form Input: New Date */}
                                    <Text style={Styles.modalLabel}>New Scheduled Date (YYYY-MM-DD)</Text>
                                    <View style={[
                                        Styles.modalInputWrapper,
                                        focusedInput === "newDate" && Styles.modalInputWrapperFocused
                                    ]}>
                                        <Ionicons name="create-outline" size={16} color={focusedInput === "newDate" ? "#6366f1" : "#94a3b8"} style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={Styles.modalInput}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#94a3b8"
                                            value={newDate}
                                            onChangeText={setNewDate}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedInput("newDate")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>

                                    {/* Form Input: New Selected Date List */}
                                    <Text style={Styles.modalLabel}>New Selected Dates (Comma separated)</Text>
                                    <View style={[
                                        Styles.modalInputWrapper,
                                        focusedInput === "newSelectedDate" && Styles.modalInputWrapperFocused
                                    ]}>
                                        <Ionicons name="options-outline" size={16} color={focusedInput === "newSelectedDate" ? "#6366f1" : "#94a3b8"} style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={Styles.modalInput}
                                            placeholder="Date list e.g. YYYY-MM-DD"
                                            placeholderTextColor="#94a3b8"
                                            value={newSelectedDayDate}
                                            keyboardType="numeric"
                                            onChangeText={setNewSelectedDayDate}
                                            onFocus={() => setFocusedInput("newSelectedDayDate")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>

                                    {selectedItem?.pass?.pack_size > 1 && (
                                        <View style={Styles.gridDetails} >
                                            <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={Styles.modalLabel}>Valid From</Text>
                                                    <View style={Styles.readonlyField}>
                                                        <Ionicons name="calendar-sharp" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                        <Text style={Styles.readonlyText}>{selectedItem.pass.valid_from}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={Styles.modalLabel}>Valid Until</Text>
                                                    <View style={Styles.readonlyField}>
                                                        <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                        <Text style={Styles.readonlyText}>{selectedItem.pass.valid_until}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {/* Modal Actions */}
                                    <View style={Styles.modalActions}>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={Styles.cancelButton}
                                            onPress={() => setModalVisible(false)}
                                            disabled={updating}
                                        >
                                            <Text style={Styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={Styles.updateButton}
                                            onPress={handleUpdate}
                                            disabled={updating}
                                        >
                                            {updating ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : (
                                                <LinearGradient
                                                    colors={["#2b2eddff", "#4f46e5"]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={Styles.updateButtonGradient}
                                                >
                                                    <Text style={Styles.updateButtonText}>Confirm Change</Text>
                                                </LinearGradient>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                </ScrollView>
                            </View>
                        </View>
                        <Toast config={toastConfig} />
                    </KeyboardAvoidingView>
                </Modal>



                {/* ------------------------ Session Reschedule Modal ----------------------------*/}

                <Modal
                    visible={sessionModalVisible}
                    animationType="slide"
                    transparent
                    statusBarTranslucent
                    onRequestClose={() => setSessionModalVisible(false)}
                >

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={{ flex: 1 }}
                    >
                        <View style={Styles.modalOverlay}>
                            <TouchableOpacity
                                style={Styles.modalBackgroundDismiss}
                                activeOpacity={1}
                                onPress={() => setSessionModalVisible(false)}
                            >
                            </TouchableOpacity>

                            <View style={Styles.modalCard}>
                                <View style={Styles.modalHeaderIndicator} />
                                <View style={Styles.modalHeader}>
                                    <Text style={Styles.modalTitle}>Reschedule Session</Text>
                                    <Text style={Styles.modalSubtitle}>Reschedule session Date and Time</Text>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} style={Styles.modalContent} contentContainerStyle={{ paddingBottom: 24 }}>
                                    <Text style={Styles.modalLabel}>Sessions Scheduled Dates</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={Styles.datePillScroll}
                                        contentContainerStyle={{ paddingVertical: 10 }}
                                    >

                                        {selectedSessionItem?.scheduled_date.map((date, index) => {
                                            const sessionDate = date.date;
                                            const passId = date.pass_id;
                                            const TimeSlot = date.time;
                                            const status = date.status;
                                            const schedule_id = date.schedule_id;
                                            const isActive = sessionDate === selectedSessionDayDate;
                                            return (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[Styles.datePill, isActive && Styles.datePillActive, isActive && status == "attended" && { backgroundColor: "#00d629ff" }]}
                                                    onPress={() => {
                                                        setSelectedSessionDayDate(sessionDate);
                                                        setSelectedSessionTimeSlot(TimeSlot);
                                                        setSelectedSessionPassId(passId);
                                                        setDay(getDay(sessionDate));
                                                        setSelectedScheduled_Id(schedule_id);
                                                        setNewSessionDate("");
                                                        setTimeSlotModalVisible(false)
                                                        setNewSessionTimeSlot("")
                                                    }}
                                                    activeOpacity={0.8}>
                                                    <Ionicons name="calendar" size={12} color={isActive ? "#fff" : status == 'attended' ? "#00d629ff" : "#6366f1"} style={{ marginRight: 4 }} />
                                                    <Text style={[Styles.datePillText, isActive && Styles.datePillTextActive, status == "attended" && { color: "#00d629ff" }, isActive && status == "attended" && { color: "#ffffffff" }]}>
                                                        {sessionDate}
                                                    </Text>
                                                </TouchableOpacity>
                                            )
                                        })}

                                    </ScrollView>

                                    {/* selected session date */}
                                    <View style={Styles.gridDetails} >
                                        <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={Styles.modalLabel}>Selected Date</Text>
                                                <View style={Styles.readonlyField}>
                                                    <Ionicons name="calendar-sharp" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                    <Text style={Styles.readonlyText}>{selectedSessionDayDate}</Text>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={Styles.modalLabel}>Session</Text>
                                                <View style={Styles.readonlyField}>
                                                    <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                    <Text style={Styles.readonlyText}>{selectedSessionItem?.session}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    
                                    {selectedSessionItem?.pack_size > 1 &&
                                    <View style={Styles.gridDetails} >
                                        <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={Styles.modalLabel}>Valid From</Text>
                                                <View style={Styles.readonlyField}>
                                                    <Ionicons name="calendar" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                    <Text style={Styles.readonlyText}>{selectedSessionItem?.created_at}</Text>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={Styles.modalLabel}>Valid Until</Text>
                                                <View style={Styles.readonlyField}>
                                                    <Ionicons name="" size={14} color="#64748b" style={{ marginRight: 6 }} />
                                                    <Text style={Styles.readonlyText}>{selectedSessionItem?.expires_on}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    }   

                                    {/* Form Input: New Date */}
                                    <Text style={Styles.modalLabel}>New Scheduled Date (YYYY-MM-DD)</Text>
                                    <View style={[
                                        Styles.modalInputWrapper,
                                        focusedInput === "newSessionDate" && Styles.modalInputWrapperFocused
                                    ]}>
                                        <Ionicons name="create-outline" size={16} color={focusedInput === "newSessionDate" ? "#6366f1" : "#94a3b8"} style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={Styles.modalInput}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#94a3b8"
                                            value={newSessionDate}
                                            onChangeText={setNewSessionDate}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedInput("newSessionDate")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>

                                    {/* Form Input: New Time Slot */}
                                    <View style={Styles.gridDetails}>
                                        <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={Styles.modalLabel}>Selected Time Slot</Text>
                                                <View style={Styles.readonlyField}>
                                                    <Ionicons name="time" size={16} color="#6366f1" style={{ marginRight: 8 }} />
                                                    <Text style={Styles.readonlyText}>{selectedSessionTimeSlot}</Text>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={Styles.modalLabel}></Text>
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    style={Styles.updateButton}
                                                    onPress={() => { fetchAvailableSessionSlots(); }}
                                                    disabled={loadingSessionSlots}
                                                >

                                                    <LinearGradient
                                                        colors={["#4e7ed1ff", "#121912ff"]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                        style={Styles.updateButtonGradient}

                                                    >
                                                        <Text style={Styles.updateButtonText}>Show Available Slots</Text>
                                                    </LinearGradient>

                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    {/* time selection model */}
                                    {timeSlotModalVisible && (
                                        <View style={{ marginVertical: 10 }}>
                                            <Text style={Styles.modalLabel}>Select a Time Slot ({newSessionDate.length > 9 ? newSessionDate : selectedSessionDayDate})</Text>
                                            {availableSessionSlots && availableSessionSlots.length > 0 ? (
                                                <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ paddingVertical: 4 }}>
                                                    {availableSessionSlots.map((slot) => (
                                                        <TouchableOpacity
                                                            key={slot.id}
                                                            style={[
                                                                Styles.timeSlotButton,
                                                                selectedSessionTimeSlot === (slot.start_time) && Styles.timeSlotSelected,
                                                                newSessionTimeSlot === (slot.start_time) && Styles.timeSlotButtonNew,
                                                            ]}
                                                            onPress={() => handleTimeSlotSelection(slot)}
                                                            disabled={loadingSessionSlots}
                                                        >
                                                            <Text
                                                                style={[
                                                                    Styles.timeSlotText,
                                                                    selectedSessionTimeSlot === slot.start_time && Styles.timeSlotTextSelected,
                                                                    newSessionTimeSlot === (slot.start_time) && Styles.timeSlotTextSelected,
                                                                ]}
                                                            >
                                                                {slot.start_time}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            ) : (
                                                <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600", marginTop: 4 }}>
                                                    No available slots found for this day.
                                                </Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Modal Actions */}
                                    <View style={Styles.modalActions}>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={Styles.cancelButton}
                                            onPress={() => setSessionModalVisible(false)}
                                            disabled={updating}
                                        >
                                            <Text style={Styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={Styles.updateButton}
                                            onPress={handleSessionUpdate}
                                            disabled={updating}
                                        >
                                            {updating ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : (
                                                <LinearGradient
                                                    colors={["#6366f1", "#4f46e5"]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={Styles.updateButtonGradient}
                                                >
                                                    <Text style={Styles.updateButtonText}>Confirm Change</Text>
                                                </LinearGradient>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                </ScrollView>
                            </View>


                        </View>
                        <Toast config={toastConfig} />
                    </KeyboardAvoidingView>
                </Modal>

            </View>
        </KeyboardAvoidingView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const Styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },

    // Header Styling
    appHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 48 : 36,
        paddingBottom: 12,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
    },
    headerRightSpacer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#eef2ff",
        alignItems: "center",
        justifyContent: "center",
    },

    // Search Styling
    searchSection: {
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 15,
        elevation: 8,
        marginBottom: 8,
    },
    searchLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    inputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        height: 52,
        backgroundColor: "#f1f5f9",
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "transparent",
        paddingHorizontal: 16,
        marginRight: 12,
    },
    inputWrapperFocused: {
        borderColor: "#6366f1",
        backgroundColor: "#ffffff",
    },
    inputIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: "100%",
        color: "#0f172a",
        fontSize: 15,
        fontWeight: "500",
    },
    clearIcon: {
        padding: 4,
    },
    searchButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },

    weeklyPassBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "hsla(115, 100%, 38%, 1.00)",
        fontWeight: "700",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        gap: 4,
    },

    // Segmented Tab Styling
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
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        color: "#64748b",
        fontWeight: "600",
        fontSize: 13,
    },
    activeTabText: {
        color: "#6366f1",
        fontWeight: "700",
    },

    // Loader & States Styling
    stateContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    stateText: {
        marginTop: 12,
        color: "#64748b",
        fontSize: 15,
        fontWeight: "600",
    },
    errorIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#fee2e2",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    errorText: {
        fontSize: 15,
        color: "#ef4444",
        textAlign: "center",
        fontWeight: "600",
        lineHeight: 22,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: "#0f172a",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    retryButtonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 14,
    },

    // Empty State Styling
    emptyStateContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#334155",
        marginBottom: 8,
    },
    emptyStateSub: {
        fontSize: 13,
        color: "#94a3b8",
        textAlign: "center",
        lineHeight: 20,
    },

    // Scroll List Styling
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        flexGrow: 1,
    },

    // Premium Card Styling
    cardContainer: {
        marginBottom: 16,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 20,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.03,
        shadowRadius: 15,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        overflow: "hidden",
    },
    cardAccent: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    passIdBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#eef2ff",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    passIdText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4f46e5",
    },
    statusBadge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    cardBody: {
        gap: 12,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoIcon: {
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: "#94a3b8",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#334155",
        marginTop: 2,
    },
    rescheduleButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#4f46e5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    buttonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
    },
    rescheduleButtonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 14,
    },

    // Modal Sheet Styling
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        justifyContent: "flex-end",
    },
    modalBackgroundDismiss: {
        flex: 1,
    },
    modalCard: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 10,
        maxHeight: "85%",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 24,
    },
    modalHeaderIndicator: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#cbd5e1",
        alignSelf: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0f172a",
        textAlign: "center",
    },
    modalSubtitle: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "500",
        textAlign: "center",
        marginTop: 4,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    datePillScroll: {
        marginBottom: 16,
    },
    datePill: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: "#f8fafc",
    },
    datePillActive: {
        backgroundColor: "#6366f1",
        borderColor: "#6366f1",
    },
    datePillText: {
        color: "#6366f1",
        fontWeight: "600",
        fontSize: 13,
    },
    datePillTextActive: {
        color: "#ffffff",
        fontWeight: "700",
    },
    gridDetails: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    gridHalf: {
        flex: 1,
    },
    readonlyField: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    readonlyText: {
        color: "#475569",
        fontSize: 13,
        fontWeight: "600",
    },
    modalInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        borderWidth: 1.5,
        borderColor: "#cbd5e1",
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: "#f8fafc",
        marginBottom: 16,
    },
    modalInputWrapperFocused: {
        borderColor: "#6366f1",
        backgroundColor: "#ffffff",
    },
    modalInput: {
        flex: 1,
        height: "100%",
        fontSize: 14,
        color: "#0f172a",
        fontWeight: "500",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        height: 50,
        borderWidth: 1.5,
        borderColor: "#cbd5e1",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
    },
    cancelButtonText: {
        color: "#475569",
        fontWeight: "700",
        fontSize: 14,
    },
    updateButton: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        overflow: "hidden",
    },
    updateButtonGradient: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    updateButtonText: {
        color: "#ffffff",
        fontWeight: "800",
        fontSize: 14,
    },
    // Update Gym Modal Styling
    modalContent: {
        marginTop: 12,
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        borderWidth: 1.5,
        borderColor: "#cbd5e1",
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: "#f8fafc",
        marginTop: 8,
    },
    input: {
        flex: 1,
        height: "100%",
        fontSize: 14,
        color: "#0f172a",
        fontWeight: "500",
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyGymContainer: {
        paddingVertical: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyGymText: {
        color: "#64748b",
        fontSize: 14,
        fontWeight: "500",
    },
    gymList: {
        maxHeight: 950,
        marginBottom: 16,
    },
    gymItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        borderRadius: 14,
        backgroundColor: "#f8fafc",
        marginBottom: 10,
    },
    gymInfo: {
        flex: 1,
        marginRight: 12,
    },
    gymName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1e293b",
    },
    gymLocation: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    gymPrice: {
        backgroundColor: "#eef2ff",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    gymPriceText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#4f46e5",
    },
    modalButtons: {
        marginTop: 8,
        marginBottom: 20,
    },
    timeSlotButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },
    timeSlotSelected: {
        backgroundColor: "#6366f1",
        borderColor: "#6366f1",
    },
    timeSlotButtonNew: {

        backgroundColor: "#ff0303ff",
        borderColor: "#ffffffff",
    },
    timeSlotText: {
        color: "#475569",
        fontSize: 13,
        fontWeight: "600",
    },
    timeSlotTextSelected: {
        color: "#ffffff",
        fontWeight: "700",
    },
});