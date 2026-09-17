import axiosInstance from "./axiosInstance";

/**
 * Fetch gym list or details by Gym ID or Name
 * - If only integer digits (e.g. "102"): searches by gym_id
 * - If text or combination of text & integer (e.g. "Gold Gym", "Gym 101"): searches by gym name
 * @param {string|number} query Gym ID or Gym Name
 */
export const GetGymDetailsForPass = async (query) => {
  const trimmed = String(query || "").trim();

  // Strictly check if string consists ONLY of integer digits
  const isOnlyInteger = /^\d+$/.test(trimmed);

  const params = {};
  if (isOnlyInteger) {
    params.gym_id = trimmed;
  } else {
    // If text only, or mixed text and numbers, search by gym name
    params.name = trimmed;
  }

  const response = await axiosInstance.get(`/support/custom_price/get_gym`, { params });
  return response.data;
};

/**
 * Update custom pass prices for 1 day, 7 days, and 14 days
//  * @param {Object} payload { gym_id, price_1_day, price_7_days, price_14_days, ... }
 */
export const UpdateCustomPassPrices = async (payload) => {
  const response = await axiosInstance.post(`/support/custom_price/set_price`, payload);
  return response.data;
};
