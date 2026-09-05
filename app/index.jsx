import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import apiConfig from "../services/apiConfig";
import { showToast } from "../services/utils/Toaster";

const baseURL = apiConfig.API_URL;

export default function Index() {
  useEffect(() => {
    checkAuthentication();
  }, []);

  // console.log("base url", baseURL);

  const checkAuthentication = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");

      // console.log("ACCESSS TOKEN::::: ", accessToken)

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      try {
        const response = await axios.get(`${baseURL}/auth/verify`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status === 200) {
          router.replace("/home");
          return;
        }
      } catch (_) {
        // Token invalid or expired — try to refresh
        const adminId = await AsyncStorage.getItem("admin_id");
        const storedRole = (await AsyncStorage.getItem("role")) || "support";

        if (adminId) {
          try {
            // console.log("Refreshing token for admin_id:", adminId);

            const refreshResponse = await axios.post(
              `${baseURL}/auth/refresh`,
              { id: adminId, role: storedRole },
              {
                headers: {
                  "X-Client-Type": "mobile",
                },
              }
            );
            // console.log("ACCESS TOKEN from refresh: ", refreshResponse.data?.access_token);
            if (refreshResponse?.data?.status === 200) {
              await SecureStore.setItemAsync(
                "access_token",
                refreshResponse.data.access_token,
              );
              router.replace("/home");
              return;
            }
          } catch (refreshError) {
            showToast("Error", "Session expired: " + (refreshError?.message || ""), "error");
          }
        }
      }

      // Fallback: clear token and go to login
      await SecureStore.deleteItemAsync("access_token");
      router.replace("/login");
    } catch (_) {
      router.replace("/login");
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#eb5757" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d0d1a",
  },
});