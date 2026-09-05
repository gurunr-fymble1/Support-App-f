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
  const response = await axiosInstance.post(`/support/payment/message`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  // console.log("response 293", response)
  return response.data;
};

export const exportPaymentStatusExcel = async (data) => {
  const response = await axiosInstance.post(`/support/payment/export-excel`, { data: data });
  return response.data;
};

export const uploadCustomMessageExcel = async (formData) => {
  const response = await axiosInstance.post(`/support/payment/custom-message`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    transformRequest: (data) => data,
  });
  return response.data;
};


