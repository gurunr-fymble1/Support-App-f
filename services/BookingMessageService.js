import * as SecureStore from "expo-secure-store";
import apiConfig from "./apiConfig";
import axiosInstance from "./axiosInstance";

const BASE_URL = apiConfig.API_URL;

export const HomePageStats = async () => {
  const response = await axiosInstance.get(`/support/home-page/counts`);
  return response.data;
};

// for refund - get booking details
export const getBookingDetails = async () => {
  const response = await axiosInstance.get(`/support/payment/allBookings`);
  return response.data;
}

export const updateStatus = async (data) => {
  const response = await axiosInstance.put(`/support/payment/updateStatus`, data);
  return response;
}

// bookings 
export const getMembershipBookings = async () => {
  const response = await axiosInstance.get(`/support/booking-msg/membership`);
  return response.data;
}

export const getSessionBookings = async () => {
  const response = await axiosInstance.get(`/support/booking-msg/sessions`);
  return response.data;
};


export const getDailyPassBookings = async () => {
  const response = await axiosInstance.get(`/support/booking-msg/dailypass`);
  return response.data;
};

// payment message to gym owners
export const uploadPaymentMessageExcel = async (formData) => {
  const token = await SecureStore.getItemAsync("access_token");
  const response = await fetch(`${BASE_URL}/support/payment/message`, {
    method: "POST",
    body: formData,
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: "Upload failed with status " + response.status };
    }
    throw new Error(errorData.message || "Upload failed");
  }

  return await response.json();
};

export const exportPaymentStatusExcel = async (data) => {
  const response = await axiosInstance.post(`/support/payment/export-excel`, { data: data });
  return response.data;
};


