import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Network from "expo-network";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import apiConfig from "./apiConfig";
import { showToast } from "./utils/Toaster";

const baseURL = apiConfig.API_URL;
const axiosInstance = axios.create({
  baseURL,
  timeout: 15000, // 15 second timeout
});

let isRefreshing = false;
let refreshPromise = null;
let networkStatusCallback = null;

// Network detection utility
const checkNetworkConnection = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected;
  } catch (error) {
    return false;
  }
};

// Function to set network status callback (call this from your hook)
export const setNetworkStatusCallback = (callback) => {
  networkStatusCallback = callback;
};

// Network error detection
const isNetworkError = (error) => {
  return (
    !error.response &&
    (error.code === "NETWORK_ERROR" ||
      error.code === "ECONNABORTED" ||
      error.message === "Network Error" ||
      error.message.includes("timeout") ||
      error.message.includes("No internet connection") ||
      error.message.includes("internet connection"))
  );
};

axiosInstance.interceptors.request.use(
  async (config) => {
    // Check network before making request
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      // Update network status immediately
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
      showToast({
        type: "error",
        title: "No Internet Connection",
        desc: "Please check your internet connection and try again",
      });

      return Promise.reject(new Error("No internet connection"));
    }

    const token = await SecureStore.getItemAsync("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // console.log("FINAL HEADERS:", config.headers);
    }
    return config;
  },
  (error) => {
    showToast({
      type: "error",
      title: "Request Error",
      desc: error.message || "Something went wrong",
    });
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    // If we get a successful response, we know network is working
    if (networkStatusCallback) {
      networkStatusCallback(true);
    }

    // console.log("RESPONSE URL:", response.url);
    // console.log("RESPONSE TOKEN:", response.token);
    // console.log("RESPONSE HEADERS:", response.headers);
    return response;
  },
  async (error) => {
    // Check if it's a network error first
    if (isNetworkError(error)) {
      // Update network status immediately
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }

      showToast({
        type: "error",
        title: "Connection Lost",
        desc: "Please check your internet connection",
      });

      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Handle 401 errors (token refresh)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      // console.log("401 DETECTED");

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken();
      }

      try {
        const newAccessToken = await refreshPromise;
        // console.log("NEW TOKEN:", newAccessToken);
        isRefreshing = false;
        refreshPromise = null;

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        // console.log("RETRYING REQUEST");

          return axiosInstance(originalRequest);
        } else {
          handleLogout();
        }
      } catch (refreshError) {
        isRefreshing = false;
        refreshPromise = null;

        // Don't logout if refresh failed due to network error
        if (!isNetworkError(refreshError)) {
          handleLogout();
        }
        return Promise.reject(refreshError);
      }
    } else if (error.response) {
      // Handle other HTTP errors
      const errorMessage =
        error.response.data?.message ||
        error.response.statusText ||
        "An error occurred";

      showToast({
        type: "error",
        title: `Error ${error.response.status}`,
        desc: errorMessage,
      });
    }

    return Promise.reject(error);
  },
);

const refreshToken = async () => {
  try {
    // Check network before refresh attempt
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
      throw new Error("No internet connection for token refresh");
    }

    const adminId = await SecureStore.getItemAsync("admin_id");
    const role = (await SecureStore.getItemAsync("role")) || "support";

    if (!adminId) {
      handleLogout();
      return null;
    }
    // console.log("adminId", adminId);
    // console.log("role", role);

    // Use base axios (not the instance) to avoid interceptor loops
    const refreshResponse = await axios.post(
      `${baseURL}/auth/refresh`,
      {
        id: adminId,
        role: role,
        device: "mobile",
      },
      {
        headers: {
          "X-Client-Type": "mobile",
        },
        timeout: 10000, // 10 second timeout for refresh
      },
    );
    // console.log("refreshResponse:::::", refreshResponse.data);

    if (refreshResponse.data.status === 200) {
      // console.log("refreshResponse", refreshResponse.data.access_token);
      await SecureStore.setItemAsync(
        "access_token",
        refreshResponse.data.access_token,
      );
      return refreshResponse.data.access_token; // Return just the token, not Bearer
    } else {
      handleLogout();
      return null;
    }
  } catch (error) {
    // Check if refresh failed due to network
    if (isNetworkError(error)) {
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
      showToast({
        type: "error",
        title: "Connection Lost",
        desc: "Unable to refresh session due to network error",
      });
      // Don't logout on network errors, just reject the promise
      throw error;
    } else {
      // Actual auth error, logout user
      handleLogout();
      throw error;
    }
  }
};

const handleLogout = async () => {
  try {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("admin_id");
    await SecureStore.deleteItemAsync("role");
    await SecureStore.deleteItemAsync("name");

    router.replace("/login");

    showToast({
      type: "info",
      title: "Logged Out",
      desc: "Your session has expired. Please log in again.",
    });
  } catch (error) {
    router.replace("/login");
  }
};

// Export utility functions
export { checkNetworkConnection, isNetworkError };
export default axiosInstance;
