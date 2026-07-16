import { useState } from "react";
import { View, StyleSheet, Modal, TouchableOpacity, Text, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import QRScanner from "../components/QRScanner";
import { scanQR } from "../services/qrService";

export default function ScanScreen() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [scanned, setScanned] = useState(false);

  const handleScan = async (qrId) => {
    if (scanned) return;

    setScanned(true);
    try {
      const data = await scanQR(qrId);

      // console.log("data",data);
      if (!data || !data.id) {
        setResult({ error: true, message: "Invalid QR Code" });
      } else {
        setResult({ ...data, error: false });
      }
    } catch (err) {
      // console.log("scanning-errror", err.message);
      setResult({ error: true, message: err.response.data.message });
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setScanned(false);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <QRScanner onScan={handleScan} />

      {result && (
        <Modal visible={!!result} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.title}>
                {result?.error ? "Error" : "Gym Details"}
              </Text>

              {result?.error ? (
                <Text style={styles.errorText}>{result.message}</Text>
              ) : (
                <>
                  <Text style={styles.detailText}>
                    <Text style={styles.label}>ID: </Text>
                    {result.id}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.label}>Name: </Text>
                    {result.name}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.label}>Area: </Text>
                    {result.area}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.label}>Location: </Text>
                    {result.location}
                  </Text>
                </>
              )}

              <TouchableOpacity style={styles.button} onPress={handleScanAgain}>
                <Text style={styles.buttonText}>Scan Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={handleBack}
              >
                <Text style={styles.buttonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#e74c3c",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontWeight: "bold",
  },
  button: {
    marginTop: 15,
    backgroundColor: "#1be014",
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
  },
  backButton: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
