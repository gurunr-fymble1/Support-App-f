import axiosInstance from "./axiosInstance";


export const RescheduleDailyPass = async (contact_number) => {
  const response = await axiosInstance.get(`/support/reschedule/dailypass?contact_number=${contact_number}`);
  // console.log(response.data)
  // console.log(response.data[0].pass.selected_date)
  return response.data;
};

export const UpdateRescheduleDailyPass = async (payload) => {
  const response = await axiosInstance.put(`/support/reschedule/reschedule/audit`, payload);
  return response.data;
};

export const GetGymsWithDailypassPrice = async (search = "", cursor = 0, limit = 20) => {
  const response = await axiosInstance.get(`/support/reschedule/gyms-with-dailypass-price?search=${search}&cursor=${cursor}&limit=${limit}`);
  return response.data;
};

// sessions
export const RescheduleSession = async (contact_number) => {
  const response = await axiosInstance.get(`/support/reschedule/sessions?contact_number=${contact_number}`);
  return response.data;
};

export const GetAvailableSessionSlots = async (payload) => {
  // console.log("payload::", payload)
  const response = await axiosInstance.get(`/support/reschedule/sessions/available-slots`, { params: payload });
  return response.data;
};

export const RescheduleSessionBooking = async (payload) => {
  const response = await axiosInstance.put(`/support/reschedule/reschedule/session`, payload);
  return response.data;
}