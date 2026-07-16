import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { router } from "expo-router";



import * as DocumentPicker from "expo-document-picker";
import { uploadPaymentMessageExcel, exportPaymentStatusExcel } from "../services/BookingMessageService";
import { showToast } from "../services/utils/Toaster";
import apiConfig from "../services/apiConfig";

export default function PaymentMessageScreen() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState([])
  const [data, setData] = useState([])
  const [sendingMessages, setSendingMessages] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [fileName, setFileName] = useState("");

  const storeLoadedData = async () => {
    try {
      const storageData = await AsyncStorage.getItem("payment_status")
      if (storageData) {
        setData(JSON.parse(storageData))
      }
      const storedFileName = await AsyncStorage.getItem("uploaded_file_name")
      if (storedFileName) {
        setFileName(storedFileName)
      }
    } catch (error) {
      showToast("Error", "Failed to get previous payment data", "error")
      // console.log(error)
    }
  }

  useEffect(() => {
    storeLoadedData();
  }, [])




  const uploadFile = async () => {
    try {
      // console.log("uploading file")
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"],
        copyToCacheDirectory: true,
      });
      // console.log("result", result)
      if (result.canceled) {
        return;
      }


      const file = result.assets[0];
      setFileName(file.name);

      const formData = new FormData();

      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      setLoading(true)
      const results = await uploadPaymentMessageExcel(formData);

      if (results.status == 200) {
        await AsyncStorage.setItem("uploaded_file_name", file.name);
        setTotalMessages(results.data.length);
        setSendingMessages(true);

        const wait = (ms) =>
          new Promise(resolve =>
            setTimeout(resolve, ms)
          );

        const updatedResult = []
        setCurrentMessageIndex(updatedResult.length + 1)

        for (const item of results.data) {

          const message =
        `Hi Business Partner,

Greetings from Fymble.

We would like to inform you that ${item.booking_count} ${item.booking_type} Booking had been happened at your gym, ${item.gym}, ${item.date_at ? `on ${item.date_at}` : `from ${item.date_from} to ${item.date_to}`} .

The payout amount for this booking is ₹${item.amount}.
Your payment has been successfully processed.

Please feel free to reach out if you require any additional details.

Thank you for your continued partnership.

Team Fymble`;

      const sendResult = await sendWhatsappMessage(item.phone, message);

      updatedResult.push({
        ...item,
        message: message,
        sent_at: new Date(),
        status: sendResult.status
      })

      setData([...updatedResult])
      await AsyncStorage.setItem("payment_status", JSON.stringify([...updatedResult]))

      await wait(8000);
    }

      }
      else {
        setResponse("")
        const storedFileName = await AsyncStorage.getItem("uploaded_file_name");
        setFileName(storedFileName || "");
      }
      setResponse(response.data)

      if (results?.status == 200) {
        showToast("Success", results.message, "success")
      } else {
        showToast("Error", results.message, "error")
      }
    } catch (error) {
      showToast("Error", error.message, "error")
      const storedFileName = await AsyncStorage.getItem("uploaded_file_name");
      setFileName(storedFileName || "");
    } finally {
      setLoading(false)
    }

  };


  const sendWhatsappMessage = async (phone, message) => {
    try {
      let formattedPhone;
      if (phone.length == 10) {
        formattedPhone = "91" + phone;
      }
      else if (phone.length != 10) {
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
      }
    } catch (error) {
      showToast("Error", error, "error")
    }
  }


  const downloadExcel = async () => {
    try {
      if (!data || data.length === 0) {
        showToast("Info", "No status details available to download.", "info");
        return;
      }
      setLoading(true);
      const res = await exportPaymentStatusExcel(data);
      // console.log("Res", res)
      if (res.status === 200 && res.data && res.data[0]?.download_url) {
        const downloadUrl = `${apiConfig.API_URL}${res.data[0].download_url}`;
        const token = await SecureStore.getItemAsync("access_token");
        const filename = `payment_status_${Date.now()}.xlsx`;
        const destination = new File(Paths.cache, filename);

        const downloadResult = await File.downloadFileAsync(
          downloadUrl,
          destination,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
              "ngrok-skip-browser-warning": "true",
            },
          }
        );

        await Sharing.shareAsync(downloadResult.uri);
        
        showToast("Success", "Excel file downloaded successfully.", "success");
      } else {
        showToast("Error", res.message || "Failed to generate Excel file", "error");
      }
    } catch (error) {
      // console.log("Error downloading excel", error);
      showToast("Error", error.message || "Failed to export Excel file", "error");
    } finally {
      setLoading(false);
    }
  };





  // const router = useRouter();

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
        <Text style={styles.title}>Payment Messenger</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
              <Text style={styles.uploadTitle}>Upload Payment Excel</Text>
              <Text style={styles.uploadSubtitle}>Select a spreadsheet file (.xlsx, .xls)</Text>
            </View>
          )}
        </TouchableOpacity>
        

        {fileName ? (
          <View style={styles.fileBadge}>
            <Ionicons name="document-text-outline" size={20} color="#475569" />
            <Text style={styles.fileNameText} numberOfLines={1} ellipsizeMode="middle">
              {fileName}
            </Text>
          </View>
        ) : null}


        {data && data.length > 0 && (
          <View style={styles.responseContainer}>
            <View style={styles.responseHeader}>
              <Text style={styles.responseTitle}>Transaction Logs</Text>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={downloadExcel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="download-outline" size={16} color="#059669" />
                <Text style={styles.exportButtonText}>Export Excel</Text>
              </TouchableOpacity>
            </View>
            
            {data.map((item, index) => (
              <View key={`${item.phone}-${index}`} style={styles.transactionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.gymInfo}>
                    <Text style={styles.gymName} numberOfLines={1}>
                      {item.gym || "Unknown Gym"}
                    </Text>
                    <Text style={styles.clientPhone}>{item.phone}</Text>
                  </View>
                  
                  <View style={[
                    styles.statusBadge,
                    item.status === "Success" ? styles.badgeSuccess : styles.badgeFailed
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      item.status === "Success" ? styles.textSuccess : styles.textFailed
                    ]}>
                      {item.status || "Pending"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View style={styles.footerDetail}>
                    <Text style={styles.detailLabel}>Bookings</Text>
                    <Text style={styles.detailValue}>{item.booking_count ?? 0}</Text>
                  </View>
                  <View style={styles.footerDetail}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{item.booking_type || "Daily Pass"}</Text>
                  </View>
                  <View style={styles.footerDetail}>
                    <Text style={styles.detailLabel}>Payout</Text>
                    <Text style={styles.detailValueAmount}>₹{item.amount ?? 0}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181b',
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  uploadZone: {
    width: '100%',
    height: 160,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  fileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  responseContainer: {
    width: '100%',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18181b',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gymInfo: {
    flex: 1,
    marginRight: 12,
  },
  gymName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  badgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textSuccess: {
    color: '#10b981',
  },
  textFailed: {
    color: '#ef4444',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181b',
  },
  detailValueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
});


