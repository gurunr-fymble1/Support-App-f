import axios from "axios";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import apiConfig from "./apiConfig";

const BASE_URL = apiConfig.API_URL;


export const login = async (payload) => {
  try {
    const response = await axios.post(`${BASE_URL}/support/auth/login`, payload);

    // Backend wraps response: { status, message, data: { access_token } }
    const token = response.data?.data?.access_token;


    if (typeof token === "string" && token.length > 0) {
      await SecureStore.setItemAsync("access_token", token);
      // console.log("TOKEN SAVED: ", token);

      const adminId = response.data?.data?.admin_id;
      const role = response.data?.data?.role;

      // console.log("response.data.data", response.data.data);

      if (adminId !== undefined && adminId !== null) {
        await SecureStore.setItemAsync("admin_id", adminId.toString());
      }
      if (role) {
        await SecureStore.setItemAsync("role", role.toString());
      }
      const name = response.data?.data?.name;
      if (name) {
        await SecureStore.setItemAsync("name", name.toString());
      }
    } else {
      console.warn("access_token missing. Full response:", JSON.stringify(response.data));
    }


    // Return the inner data object so callers get { access_token, ... }
    return response.data;
  } catch (error) {
    const errorMsg =
      error?.response?.data?.detail ||
      "Login failed. Please try again.";

    console.error("Error logging in:", errorMsg);
    console.error("Full error response:", JSON.stringify(error?.response?.data));
    return { error: errorMsg };
  }
};