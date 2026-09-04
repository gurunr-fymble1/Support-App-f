import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import { uploadCustomMessageExcel } from "../services/BookingMessageService";
import { showToast } from "../services/utils/Toaster";

export default function CustomMessageScreen() {
  const [loading, setLoading] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState("Hi {gym_name}, greetings from Fymble!");
  const [data, setData] = useState([]);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [fileName, setFileName] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isCancelledRef = useRef(false);

  // Load last session data from AsyncStorage if available
  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem("custom_message_data");
      if (savedData) {
        setData(JSON.parse(savedData));
      }
      const savedFileName = await AsyncStorage.getItem("custom_message_file_name");
      if (savedFileName) {
        setFileName(savedFileName);
      }
      const savedTemplate = await AsyncStorage.getItem("custom_message_template");
      if (savedTemplate) {
        setMessageTemplate(savedTemplate);
      }
    } catch (error) {
      showToast("Error", "Failed to load previous custom message state", "error");
    }
  };

  useEffect(() => {
    loadSavedData();
  }, []);

  // Recalculate message content dynamically when messageTemplate changes
  const getDynamicMessage = (rowData, template) => {
    if (!rowData) return template;
    let msg = template;
    Object.keys(rowData).forEach((key) => {
      // Escape special characters in the key for regex replacement
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      msg = msg.replace(new RegExp(`{${escapedKey}}`, "g"), rowData[key]);
    });
    return msg;
  };

  // Handle template input changes and save template
  const handleTemplateChange = async (text) => {
    setMessageTemplate(text);
    try {
      await AsyncStorage.setItem("custom_message_template", text);
    } catch (e) {
      // ignore storage errors
    }
  };

  const uploadFile = async () => {
    if (!messageTemplate.trim()) {
      showToast("Info", "Please enter a message template first", "info");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setFileName(file.name);

      const sourceFile = new File(file.uri);
      const localFile = new File(Paths.cache, file.name);

      if (localFile.exists) {
        localFile.delete();
      }

      await sourceFile.copy(localFile);

      const localUri = Platform.OS === "android" ? decodeURIComponent(localFile.uri) : localFile.uri;

      const formData = new FormData();
      formData.append("file", {
        uri: localUri,
        name: file.name,
        type: file.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      formData.append("message_template", messageTemplate);

      setLoading(true);
      const results = await uploadCustomMessageExcel(formData);

      if (results.status === 200) {
        await AsyncStorage.setItem("custom_message_file_name", file.name);
        const parsedData = results.data.map((item) => ({
          ...item,
          status: "Pending",
          sent_at: null
        }));
        setData(parsedData);
        await AsyncStorage.setItem("custom_message_data", JSON.stringify(parsedData));
        setTotalMessages(parsedData.length);
        setShowConfirmModal(true);
      } else {
        showToast("Error", results.message, "error");
      }
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsappMessage = async (phone, message) => {
    try {
      let formattedPhone = phone;
      if (phone.length === 10) {
        formattedPhone = "91" + phone;
      } else if (phone.length !== 12 && phone.length !== 10) {
        return {
          status: "Failed",
          error: "Invalid Contact"
        };
      }

      const checkUrl = `whatsapp://send?phone=${formattedPhone}`;
      const openWhats = await Linking.canOpenURL(checkUrl);

      if (!openWhats) {
        return {
          status: "Failed",
          error: "WhatsApp not installed"
        };
      }

      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);

      return {
        status: "Success",
        error: null
      };
    } catch (error) {
      showToast("Error", error.message || error, "error");
      return {
        status: "Failed",
        error: error.message || error
      };
    }
  };

  const startSendingMessages = async () => {
    setTotalMessages(data.length);
    setSendingMessages(true);
    setLoading(true);
    isCancelledRef.current = false;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const updatedResult = [...data];

    try {
      for (let i = 0; i < data.length; i++) {
        if (isCancelledRef.current) {
          showToast("Info", "Sending cancelled by user", "info");
          break;
        }

        const item = data[i];
        
        // Skip already successfully sent messages if any
        if (item.status === "Success") {
          continue;
        }

        setCurrentMessageIndex(i + 1);

        // Get dynamic message content based on the current template state
        const dynamicMsg = getDynamicMessage(item.row_data, messageTemplate);

        const sendResult = await sendWhatsappMessage(item.phone, dynamicMsg);

        updatedResult[i] = {
          ...item,
          message: dynamicMsg,
          sent_at: new Date(),
          status: sendResult ? sendResult.status : "Failed"
        };

        setData([...updatedResult]);
        await AsyncStorage.setItem("custom_message_data", JSON.stringify([...updatedResult]));

        if (i < data.length - 1 && !isCancelledRef.current) {
          // 1 second delay but checked in 500ms intervals to support instant cancellation
          for (let w = 0; w < 2; w++) {
            if (isCancelledRef.current) {
              break;
            }
            await wait(500);
          }
        }
      }
      if (!isCancelledRef.current) {
        showToast("Success", "All messages processed", "success");
      }
    } catch (err) {
      showToast("Error", err.message || "Error while sending messages", "error");
    } finally {
      setSendingMessages(false);
      setLoading(false);
    }
  };

  const clearData = async () => {
    try {
      await AsyncStorage.removeItem("custom_message_data");
      await AsyncStorage.removeItem("custom_message_file_name");
      setData([]);
      setFileName("");
    } catch (error) {
      showToast("Error", "Failed to clear data", "error");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back-outline" size={22} color="#18181b" />
        </TouchableOpacity>
        <Text style={styles.title}>Custom Messenger</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Message Input Template Section */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionLabel}>1. Message Template</Text>
          <Text style={styles.subtitleLabel}>
            Write your message. Wrap column names in braces, e.g. {"{gym_name}"} or {"{client_name}"}.
          </Text>
          <TextInput
            style={styles.textArea}
            multiline={true}
            numberOfLines={4}
            value={messageTemplate}
            onChangeText={handleTemplateChange}
            placeholder="Type your message template here..."
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* File Upload Zone */}
        <Text style={styles.sectionLabel}>2. Upload Excel File</Text>
        <TouchableOpacity
          style={styles.uploadZone}
          onPress={uploadFile}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" />
          ) : (
            <View style={styles.uploadContent}>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="cloud-upload-outline" size={32} color="#4f46e5" />
              </View>
              <Text style={styles.uploadTitle}>Upload Data Spreadsheet</Text>
              <Text style={styles.uploadSubtitle}>Select an Excel file (.xlsx, .xls)</Text>
            </View>
          )}
        </TouchableOpacity>

        {fileName ? (
          <View style={styles.selectedFileContainer}>
            <View style={styles.selectedFileHeader}>
              <View style={styles.excelIconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#166534" />
              </View>
              <View style={styles.selectedFileDetails}>
                <Text style={styles.selectedFileLabel}>Active Spreadsheet</Text>
                <Text style={styles.selectedFileNameText} numberOfLines={1}>
                  {fileName}
                </Text>
              </View>
              <TouchableOpacity onPress={clearData} style={styles.clearFileButton}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <View style={styles.selectedFileStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{data.length} records ready</Text>
            </View>
          </View>
        ) : null}

        {/* Preview Logs */}
        {data && data.length > 0 && (
          <View style={styles.responseContainer}>
            <View style={styles.responseHeader}>
              <Text style={styles.responseTitle}>Message Previews ({data.length})</Text>
              <TouchableOpacity
                style={styles.sendAllButton}
                onPress={() => setShowConfirmModal(true)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                <Text style={styles.sendAllButtonText}>Send WhatsApps</Text>
              </TouchableOpacity>
            </View>

            {data.map((item, index) => {
              const previewMessage = getDynamicMessage(item.row_data, messageTemplate);
              return (
                <View key={`${item.phone}-${index}`} style={styles.previewCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientPhone}>{item.phone || "No Phone"}</Text>
                      {item.row_data?.gym_name && (
                        <Text style={styles.recipientName}>{item.row_data.gym_name}</Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        item.status === "Success"
                          ? styles.badgeSuccess
                          : item.status === "Pending"
                          ? styles.badgePending
                          : styles.badgeFailed
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.status === "Success"
                            ? styles.textSuccess
                            : item.status === "Pending"
                            ? styles.textPending
                            : item.status === "Failed"
                            ? styles.textFailed
                            : styles.textFailed
                        ]}
                      >
                        {item.status || "Pending"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{previewMessage}</Text>
                  </View>

                  {item.sent_at && (
                    <Text style={styles.sentTimeText}>
                      Sent at: {new Date(item.sent_at).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
            </View>
            <Text style={styles.modalTitle}>Send Custom Messages?</Text>
            <Text style={styles.modalDescription}>
              You are about to send custom WhatsApp messages to {data.length} recipients. The app will open WhatsApp sequentially with an 8-second delay.
            </Text>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSendButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                  startSendingMessages();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sending Modal */}
      <Modal visible={sendingMessages} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Sending Messages</Text>
            <Text style={styles.modalDescription}>
              Sending {currentMessageIndex} of {totalMessages}...
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${totalMessages > 0 ? (currentMessageIndex / totalMessages) * 100 : 0}%` }
                ]}
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton, { marginTop: 20, width: "100%" }]}
              onPress={() => {
                isCancelledRef.current = true;
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Cancel Sending</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa"
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "ios" ? 56 : 34,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    elevation: 2
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f4f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e4e7"
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181b",
    textAlign: "center"
  },
  headerRightPlaceholder: {
    width: 40
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20
  },
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    marginBottom: 20,
    elevation: 1
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  subtitleLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 16
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    minHeight: 150,
    textAlignVertical: "top"
  },
  uploadZone: {
    width: "100%",
    height: 140,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    padding: 20
  },
  uploadContent: {
    alignItems: "center",
    justifyContent: "center"
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181b",
    marginBottom: 4
  },
  uploadSubtitle: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center"
  },
  selectedFileContainer: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  selectedFileHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  excelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  selectedFileDetails: {
    flex: 1,
    justifyContent: "center"
  },
  selectedFileLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  selectedFileNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
    paddingRight: 8
  },
  clearFileButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center"
  },
  selectedFileStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
    gap: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#25D366"
  },
  statusText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600"
  },
  responseContainer: {
    marginTop: 10
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181b"
  },
  sendAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6
  },
  sendAllButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  previewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    elevation: 1
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  recipientInfo: {
    flex: 1,
    marginRight: 12
  },
  recipientPhone: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181b"
  },
  recipientName: {
    fontSize: 11,
    color: "#71717a",
    fontWeight: "500",
    marginTop: 2
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  badgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.08)"
  },
  badgePending: {
    backgroundColor: "rgba(245, 158, 11, 0.08)"
  },
  badgeFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.08)"
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  textSuccess: {
    color: "#10b981"
  },
  textPending: {
    color: "#f59e0b"
  },
  textFailed: {
    color: "#ef4444"
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12
  },
  messageBox: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  messageText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18
  },
  sentTimeText: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(24, 24, 27, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    elevation: 8
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(37, 211, 102, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181b",
    marginBottom: 8,
    textAlign: "center"
  },
  modalDescription: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%"
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  modalCancelButton: {
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#e4e4e7"
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#71717a"
  },
  modalSendButton: {
    backgroundColor: "#25D366"
  },
  modalSendButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff"
  },
  progressBarContainer: {
    height: 6,
    width: "100%",
    backgroundColor: "#f4f4f5",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#25D366",
    borderRadius: 3
  }
});
