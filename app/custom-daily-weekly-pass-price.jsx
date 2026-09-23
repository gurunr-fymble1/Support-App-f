import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GetGymDetailsForPass, UpdateCustomPassPrices } from "../services/customPassService";
import { showToast } from "../services/utils/Toaster";

export default function CustomDailyWeeklyPassPriceScreen() {
  const router = useRouter();

  // Search & List State
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingGym, setLoadingGym] = useState(false);
  const [gymList, setGymList] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);

  // Prices State
  const [price1Day, setPrice1Day] = useState("");
  const [price7Days, setPrice7Days] = useState("");
  const [price14Days, setPrice14Days] = useState("");
  const [updating, setUpdating] = useState(false);

  // Helper to extract prices list
  const getGymPricesList = (gym) => {
    if (!gym) return [];
    if (Array.isArray(gym.prices)) return gym.prices;
    if (Array.isArray(gym.packs)) return gym.packs;
    return [];
  };

  // Fetch Gym List / Details
  const handleFetchGyms = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      showToast("Validation", "Please enter a Gym ID or Gym Name", "info");
      return;
    }

    // Reset selection and prices on search click
    setSelectedGym(null);
    setPrice1Day("");
    setPrice7Days("");
    setPrice14Days("");

    try {
      setLoadingGym(true);
      const data = await GetGymDetailsForPass(trimmed);

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.gyms)) {
        list = data.gyms;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      } else if (data && typeof data === "object") {
        list = [data];
      }

      if (list.length === 0) {
        showToast("Not Found", "No gyms found matching your query", "error");
        setGymList([]);
        setSelectedGym(null);
        setIsDropdownOpen(false);
        return;
      }

      setGymList(list);
      if (list.length === 1) {
        selectGymItem(list[0]);
        setIsDropdownOpen(false);
        showToast("Success", `Loaded ${list[0].name}`, "success");
      } else {
        setIsDropdownOpen(true);
        showToast("Found", `Gyms fetched successfully. Please select one from the dropdown.`, "info");
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch gym details. Please try again.";
      showToast("Error", errorMsg, "error");
      setGymList([]);
      setSelectedGym(null);
      setIsDropdownOpen(false);
    } finally {
      setLoadingGym(false);
    }
  };

  // Select a gym from the dropdown
  const selectGymItem = (gym) => {
    setSelectedGym(gym);
    setIsDropdownOpen(false);

    // Pre-fill prices from prices/packs array using owner_payout if available, fallback to legacy keys
    const packsList = getGymPricesList(gym);
    const pack1 = packsList.find((p) => p.days === 1);
    const pack7 = packsList.find((p) => p.days === 7);
    const pack14 = packsList.find((p) => p.days === 14);

    const day1 =
      pack1?.owner_payout ??
      pack1?.customer_price ??
      pack1?.price ??
      gym?.price_1_day ??
      gym?.daily_pass_price ??
      gym?.pass_1_day ??
      gym?.one_day_price ??
      "";
    const day7 =
      pack7?.owner_payout ??
      pack7?.customer_price ??
      pack7?.price ??
      gym?.price_7_days ??
      gym?.weekly_pass_price ??
      gym?.pass_7_days ??
      gym?.seven_day_price ??
      "";
    const day14 =
      pack14?.owner_payout ??
      pack14?.customer_price ??
      pack14?.price ??
      gym?.price_14_days ??
      gym?.two_week_pass_price ??
      gym?.pass_14_days ??
      gym?.fourteen_day_price ??
      "";

    setPrice1Day(day1 !== "" && day1 !== null ? String(day1) : "");
    setPrice7Days(day7 !== "" && day7 !== null ? String(day7) : "");
    setPrice14Days(day14 !== "" && day14 !== null ? String(day14) : "");
  };

  // Submit Updated Pass Prices
  const handleUpdatePrices = async () => {
    if (!selectedGym) {
      showToast("Warning", "Please select a gym first", "info");
      return;
    }

    if (price1Day === "" && price7Days === "" && price14Days === "") {
      showToast("Validation", "Please enter at least one pass price to update", "info");
      return;
    } else if (price1Day === "") {
      showToast("Validation", "One day pass price is required", "info");
      return;
    } else if (
      (price7Days === "" && price14Days !== "") ||
      (price14Days === "" && price7Days !== "")
    ) {
      showToast("Validation", "Seven day pass and Fourteen day pass prices are required", "info");
      return;
    }

    let update_type = "weeklypass";

    if (price1Day !== "" && price7Days === "" && price14Days === "") {
      update_type = "dailypass";
    } else if (price1Day !== "" && price7Days !== "" && price14Days !== "") {
      update_type = "weeklypass";
      // price validation
      if (parseFloat(price1Day) > parseFloat(price7Days)) {
        showToast(
          "Validation",
          "Seven day pass price must be greater than or equal to one day pass price",
          "info"
        );
        return;
      }
      if (parseFloat(price14Days) < parseFloat(price7Days)) {
        showToast(
          "Validation",
          "Fourteen day pass price must be greater than or equal to seven day pass price",
          "info"
        );
        return;
      }
    }

    const num1 = price1Day !== "" ? parseFloat(price1Day) : null;
    const num7 = price7Days !== "" ? parseFloat(price7Days) : null;
    const num14 = price14Days !== "" ? parseFloat(price14Days) : null;

    if (
      (num1 !== null && (isNaN(num1) || num1 < 0)) ||
      (num7 !== null && (isNaN(num7) || num7 < 0)) ||
      (num14 !== null && (isNaN(num14) || num14 < 0))
    ) {
      showToast("Validation", "Prices must be valid positive numbers", "error");
      return;
    }

    const payload = {
      gym_id: selectedGym.gym_id,
      price_1_day: num1,
      price_7_days: num7,
      price_14_days: num14,
      update_type: update_type,
    };

    try {
      setUpdating(true);
      const res = await UpdateCustomPassPrices(payload);
      showToast("", res?.message || "Pass prices updated successfully!", "success");

      // Re-fetch fresh gym details and packs from backend
      try {
        const freshData = await GetGymDetailsForPass(selectedGym.gym_id);
        let list = [];
        if (Array.isArray(freshData)) {
          list = freshData;
        } else if (Array.isArray(freshData?.gyms)) {
          list = freshData.gyms;
        } else if (Array.isArray(freshData?.data)) {
          list = freshData.data;
        } else if (freshData && typeof freshData === "object") {
          list = [freshData];
        }

        if (list.length > 0) {
          const freshGym = list.find((g) => g.gym_id === selectedGym.gym_id) || list[0];
          selectGymItem(freshGym);
          // Also update in gymList
          setGymList((prevList) =>
            prevList.map((g) => (g.gym_id === freshGym.gym_id ? freshGym : g))
          );
        } else if (res?.gym || res?.data) {
          const updated = {
            ...selectedGym,
            ...(res.gym || res.data),
            price_1_day: num1,
            price_7_days: num7,
            price_14_days: num14,
          };
          setSelectedGym(updated);
        }
      } catch (fetchErr) {
        console.log("Failed to re-fetch gym after update", fetchErr);
        if (res?.gym || res?.data) {
          const updated = {
            ...selectedGym,
            ...(res.gym || res.data),
            price_1_day: num1,
            price_7_days: num7,
            price_14_days: num14,
          };
          setSelectedGym(updated);
        }
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update pass prices. Please try again.";
      showToast("Error", errorMsg, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setGymList([]);
    setSelectedGym(null);
    setIsDropdownOpen(false);
    setPrice1Day("");
    setPrice7Days("");
    setPrice14Days("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Custom Pass Price</Text>
            <Text style={styles.headerSubtitle}>Search, select gym & set 1, 7, 14 days prices</Text>
          </View>
          <TouchableOpacity
            onPress={handleReset}
            style={styles.resetHeaderButton}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="search-outline" size={20} color="#2563eb" />
              <Text style={styles.cardTitle}>Find Gym</Text>
            </View>
            <Text style={styles.inputHelper}>Enter Gym ID or Gym Name to search</Text>

            <View style={styles.searchRow}>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={15} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Gym ID or Gym Name"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleFetchGyms}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.fetchButton, loadingGym && styles.disabledButton]}
                onPress={handleFetchGyms}
                disabled={loadingGym}
                activeOpacity={0.8}
              >
                {loadingGym ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color="#ffffff" />
                    <Text style={styles.fetchButtonText}>Search</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Dropdown Selector */}
            {gymList.length > 0 && (
              <View style={styles.dropdownSection}>
                <TouchableOpacity
                  style={styles.dropdownHeader}
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownHeaderLeft}>
                    <Ionicons name="list" size={18} color="#2563eb" />
                    <Text style={styles.dropdownHeaderText}>
                      {selectedGym
                        ? `Selected: ${selectedGym.name}`
                        : `Select Gym (${gymList.length} found)`}
                    </Text>
                  </View>
                  <Ionicons
                    name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>

                {isDropdownOpen && (
                  <ScrollView
                    style={styles.dropdownList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {gymList.map((item, index) => {
                      const isSelected = selectedGym?.gym_id === item.gym_id;
                      const itemPrices = getGymPricesList(item);
                      return (
                        <TouchableOpacity
                          key={item.gym_id || index}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                            index === gymList.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => selectGymItem(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dropdownItemInfo}>
                            <View style={styles.dropdownTitleRow}>
                              <Text
                                style={[
                                  styles.dropdownItemName,
                                  isSelected && styles.dropdownItemNameSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {item.name || "Unnamed Gym"}
                              </Text>
                              <View style={styles.dropdownIdBadge}>
                                <Text style={styles.dropdownIdBadgeText}>ID: {item.gym_id}</Text>
                              </View>
                            </View>

                            <View style={styles.dropdownSubRow}>
                              <Text style={styles.dropdownLocationText} numberOfLines={1}>
                                {[item.area, item.city].filter(Boolean).join(", ") || "No location"}
                              </Text>

                              {item.daily_pass && (
                                <View
                                  style={[
                                    styles.miniBadge,
                                    item.daily_pass === "Enabled"
                                      ? styles.miniBadgeEnabled
                                      : styles.miniBadgeDisabled,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.miniBadgeText,
                                      item.daily_pass === "Enabled"
                                        ? styles.miniTextEnabled
                                        : styles.miniTextDisabled,
                                    ]}
                                  >
                                    Pass: {item.daily_pass}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Dropdown Packs Summary */}
                            {itemPrices.length > 0 && (
                              <View style={styles.dropdownPacksRow}>
                                {itemPrices.map((p, pIdx) => (
                                  <View key={pIdx} style={styles.dropdownPackChip}>
                                    <Text style={styles.dropdownPackChipDays}>
                                      {p.label || `${p.days}D`}:
                                    </Text>
                                    <Text style={styles.dropdownPackChipPrice}>
                                      ₹{Number(p.customer_price ?? p.price ?? p.owner_payout ?? 0).toLocaleString("en-IN")}
                                    </Text>
                                    {p.owner_payout !== undefined && (
                                      <Text style={styles.dropdownPackChipPayout}>
                                        (Payout: ₹{Number(p.owner_payout).toLocaleString("en-IN")})
                                      </Text>
                                    )}
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>

                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Selected Gym Card */}
          {selectedGym && (
            <View style={styles.gymCard}>
              <LinearGradient
                colors={["#2563eb", "#4f46e5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gymCardAccent}
              />
              <View style={styles.gymCardHeader}>
                <View style={styles.gymTitleRow}>
                  <Text style={styles.gymName} numberOfLines={2}>
                    {selectedGym.name}
                  </Text>
                  <View style={styles.gymIdBadge}>
                    <Text style={styles.gymIdBadgeText}>ID: {selectedGym.gym_id}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {selectedGym.verified !== undefined && (
                    <View
                      style={[
                        styles.statusBadge,
                        selectedGym.verified
                          ? styles.statusBadgeVerified
                          : styles.statusBadgeUnverified,
                      ]}
                    >
                      <Ionicons
                        name={selectedGym.verified ? "checkmark-circle" : "alert-circle"}
                        size={14}
                        color={selectedGym.verified ? "#16a34a" : "#ca8a04"}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedGym.verified
                            ? styles.statusTextVerified
                            : styles.statusTextUnverified,
                        ]}
                      >
                        {selectedGym.verified ? "Verified" : "Unverified"}
                      </Text>
                    </View>
                  )}

                  {selectedGym.daily_pass && (
                    <View
                      style={[
                        styles.statusBadge,
                        selectedGym.daily_pass === "Enabled"
                          ? styles.statusBadgeVerified
                          : styles.statusBadgeUnverified,
                      ]}
                    >
                      <Ionicons
                        name={selectedGym.daily_pass === "Enabled" ? "flash" : "flash-off"}
                        size={14}
                        color={selectedGym.daily_pass === "Enabled" ? "#16a34a" : "#ca8a04"}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedGym.daily_pass === "Enabled"
                            ? styles.statusTextVerified
                            : styles.statusTextUnverified,
                        ]}
                      >
                        Daily Pass: {selectedGym.daily_pass}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.gymDetailsGrid}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Location: </Text>
                    {[selectedGym.area, selectedGym.city, selectedGym.state]
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </Text>
                </View>

                {/* Ultra-Compact Current Pass Prices & Breakdown */}
                {(() => {
                  const pricesList = getGymPricesList(selectedGym);
                  if (pricesList.length === 0) return null;

                  return (
                    <View style={styles.packsSectionContainer}>
                      <View style={styles.packsSectionHeader}>
                        <Ionicons name="pricetags-outline" size={13} color="#2563eb" />
                        <Text style={styles.packsSectionTitle}>Current Pass Pricing & Breakdown</Text>
                      </View>

                      <View style={styles.packsCompactRow}>
                        {pricesList.map((pack, idx) => (
                          <View key={idx} style={styles.compactPackCard}>
                            {/* Header: Title + Discount */}
                            <View style={styles.compactCardTop}>
                              <Text style={styles.compactCardTitle} numberOfLines={1}>
                                {pack.label || `${pack.days} Day`}
                              </Text>
                              {/* {pack.discount_percent > 0 && (
                                <View style={styles.compactDiscountBadge}>
                                  <Text style={styles.compactDiscountText}>
                                    {pack.discount_percent}%
                                  </Text>
                                </View>
                              )} */}
                            </View>


                            {/* Owner Payout Row */}
                            <View style={styles.compactDetailRow}>
                              <Text style={styles.compactDetailLabel}>Owner:</Text>
                              <Text style={styles.compactPayoutVal}>
                                ₹{pack.owner_payout !== undefined ? Number(pack.owner_payout).toLocaleString("en-IN") : "-"}
                              </Text>
                            </View>

                            
                            {/* Customer Price Row */}
                            <View style={styles.compactDetailRow}>
                              <Text style={styles.compactDetailLabel}>Customer:</Text>
                              <Text style={styles.compactPriceVal}>
                                ₹{pack.customer_price !== undefined ? Number(pack.customer_price).toLocaleString("en-IN") : "-"}
                              </Text>
                            </View>

                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </View>
            </View>
          )}

          {/* Pricing Form Section */}
          {selectedGym ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="pricetags-outline" size={20} color="#16a34a" />
                <Text style={styles.cardTitle}>Set Custom Pass Prices</Text>
              </View>
              <Text style={styles.inputHelper}>Configure custom pricing for 1 day, 7 days, and 14 days</Text>

              {/* 1 Day Pass Price */}
              <View style={styles.priceInputGroup}>
                <View style={styles.priceLabelRow}>
                  <Text style={styles.priceLabel}>1 Day Pass Price</Text>
                  <Text style={styles.priceTagSub}>Daily Pass</Text>
                </View>
                <View style={styles.priceInputContainer}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencySymbol}>₹</Text>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="e.g. 150"
                    placeholderTextColor="#94a3b8"
                    value={price1Day}
                    onChangeText={setPrice1Day}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>/ 1 Day</Text>
                </View>
              </View>

              {/* 7 Days Pass Price */}
              <View style={styles.priceInputGroup}>
                <View style={styles.priceLabelRow}>
                  <Text style={styles.priceLabel}>7 Days Pass Price</Text>
                  <Text style={styles.priceTagSub}>1 Week Pass</Text>
                </View>
                <View style={styles.priceInputContainer}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencySymbol}>₹</Text>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="e.g. 700"
                    placeholderTextColor="#94a3b8"
                    value={price7Days}
                    onChangeText={setPrice7Days}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>/ 7 Days</Text>
                </View>
              </View>

              {/* 14 Days Pass Price */}
              <View style={styles.priceInputGroup}>
                <View style={styles.priceLabelRow}>
                  <Text style={styles.priceLabel}>14 Days Pass Price</Text>
                  <Text style={styles.priceTagSub}>2 Weeks Pass</Text>
                </View>
                <View style={styles.priceInputContainer}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencySymbol}>₹</Text>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="e.g. 1200"
                    placeholderTextColor="#94a3b8"
                    value={price14Days}
                    onChangeText={setPrice14Days}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>/ 14 Days</Text>
                </View>
              </View>

              {/* Update Button */}
              <TouchableOpacity
                style={[styles.submitButton, updating && styles.disabledButton]}
                onPress={handleUpdatePrices}
                disabled={updating}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#2563eb", "#1d4ed8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Update Pass Prices</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* Empty State */
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ticket-outline" size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyStateTitle}>No Gym Selected</Text>
              <Text style={styles.emptyStateDesc}>
                Search by Gym ID or Name above, select a gym from the dropdown, and set custom 1-day, 7-days, and 14-days pass pricing.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  resetHeaderButton: {
    padding: 6,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  inputHelper: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
    height: "100%",
  },
  fetchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
  },
  fetchButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Dropdown Styles
  dropdownSection: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  dropdownHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dropdownHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1d4ed8",
    flex: 1,
  },
  dropdownList: {
    backgroundColor: "#ffffff",
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownItemSelected: {
    backgroundColor: "#f0f7ff",
  },
  dropdownItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  dropdownTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  dropdownItemNameSelected: {
    color: "#2563eb",
    fontWeight: "700",
  },
  dropdownIdBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropdownIdBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  dropdownSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownLocationText: {
    fontSize: 12,
    color: "#64748b",
    flex: 1,
  },
  dropdownPacksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  dropdownPackChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dropdownPackChipDays: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  dropdownPackChipPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  dropdownPackChipPayout: {
    fontSize: 10,
    fontWeight: "500",
    color: "#059669",
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeEnabled: {
    backgroundColor: "#f0fdf4",
  },
  miniBadgeDisabled: {
    backgroundColor: "#fefce8",
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  miniTextEnabled: {
    color: "#16a34a",
  },
  miniTextDisabled: {
    color: "#ca8a04",
  },

  // Gym Card
  gymCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  gymCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  gymCardHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  gymTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  gymName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  gymIdBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  gymIdBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeVerified: {
    backgroundColor: "#f0fdf4",
  },
  statusBadgeUnverified: {
    backgroundColor: "#fefce8",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextVerified: {
    color: "#16a34a",
  },
  statusTextUnverified: {
    color: "#ca8a04",
  },
  gymDetailsGrid: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  detailLabel: {
    fontWeight: "600",
    color: "#475569",
  },

  // Ultra-Compact Current Pass Pricing Breakdown
  packsSectionContainer: {
    marginTop: 1,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  packsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 9,
  },
  packsSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  packsCompactRow: {
    flexDirection: "row",
    gap: 5,
    maxWidth: 300,
  },
  compactPackCard: {
    flex: 1,
    maxWidth: 95,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  compactCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 1,
    gap: 1,
  },
  compactCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
    flexShrink: 1,
  },
  compactDiscountBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 2,
  },
  compactDiscountText: {
    fontSize: 7.5,
    fontWeight: "700",
    color: "#dc2626",
  },
  compactDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 1,
  },
  compactDetailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  compactPriceVal: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  compactPayoutVal: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#059669",
  },

  // Price Form Group
  priceInputGroup: {
    marginBottom: 16,
  },
  priceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  priceTagSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    overflow: "hidden",
    height: 48,
  },
  currencyBadge: {
    backgroundColor: "#f1f5f9",
    height: "100%",
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    height: "100%",
  },
  unitText: {
    paddingRight: 14,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  submitButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  emptyStateDesc: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },
});
