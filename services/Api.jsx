import axios from "axios";
// import axiosInstance from "./axiosInstance";
import apiConfig from "./apiConfig";
import * as SecureStore from "expo-secure-store";

const API_URL = apiConfig.API_URL;
// console.log("API BASE URL--------:", apiConfig.API_URL);


const axiosInstance = axios.create({
  baseURL: apiConfig.API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token =
      await SecureStore.getItemAsync("access_token");

    if (token) {
      // console.log("TOKEN from axios interceptor", token);
      config.headers.Authorization =
        `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;


// export const loginAPI = async (payload) => {
//   try {
//     const res = await axios.post(
//       `${API_URL}/support/auth/login`,
//       payload,
//     );
//     return res?.data;
//   } catch (err) {
//     return err?.response.data;
//   }
// };