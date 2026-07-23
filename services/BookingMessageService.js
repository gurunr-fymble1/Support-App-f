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

export const getMembershipBookings = async () => {
  const response = await axiosInstance.get(`/support/booking-msg/membership`);
  return response.data;
}

export const getSessionBookings = async () => {
  const response = await axiosInstance.get(`${BASE_URL}/support/booking-msg/sessions`);
  return response.data;
};


export const getDailyPassBookings = async () => {
  const response = await axiosInstance.get(`/support/booking-msg/dailypass`);
  return response.data;
};


// export const paymentsMessage = async () => {
//   const response = await axiosInstance.post(`/support/payment/message`)
//   return response.data;
// }

export const uploadPaymentMessageExcel = async (formData) => {
  // console.log("FROM DAATAAAA", formData)
  const response = await axiosInstance.post(`/support/payment/message`, formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  // console.log("API RESPONSE", response)
  return response.data;
};

export const exportPaymentStatusExcel = async (data) => {
  // console.log("DATA FOR EXCEL", data)
  const response = await axiosInstance.post(`/support/payment/export-excel`, 
    { data: data },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  // console.log("EXPORT RESPONSE", response)
  return response.data;
};


