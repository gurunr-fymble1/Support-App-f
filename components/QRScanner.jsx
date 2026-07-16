import React, { useEffect } from "react";
import { useRef } from "react";
import { Animated, Easing } from "react-native";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function QRScanner({ onScan }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 280,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY]);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    requestPermission();
  }, []);

  if (!permission) {
    return <Text>Requesting permission...</Text>;
  }

  if (!permission.granted) {
    return <Text>No camera access</Text>;
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => onScan(data)}
      />

      {/* Scanner Line */}
    <Animated.View
      style={[
        styles.scanLine,
        { transform: [{ translateY }] },
      ]}
    />

    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 280,
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    alignSelf: "center",
    borderColor: "#0E8AE4",
  },
  scanLine: {
  position: "absolute",
  width: "100%",
  height: 2,
  backgroundColor: "lime",
},
  camera: { flex: 1 }
});