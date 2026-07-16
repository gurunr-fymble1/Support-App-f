import apiConfig from "./apiConfig";
import axiosInstance from "./axiosInstance";

const BASE_URL = apiConfig.API_URL;

export const GetGymVerification = async (search = "", cursor = 0, limit = 20, verified = false) => {
    const response = await axiosInstance.get(`/support/verify/gym`, {
        params: { search, cursor, limit, verified }
    });
    return response.data;
};

export const UpdateGymVerification = async (gym_id) => {
    // console.log("gym_id in verification", gym_id);
    const response = await axiosInstance.post(`/support/verify/verified/${gym_id}`);
    return response.data;
};

export const UnverifyGymVerification = async (gym_id, gym_type = "red") => {
    const response = await axiosInstance.post(`/support/verify/unverify/${gym_id}`, null, {
        params: { type: gym_type }
    });
    return response.data;
};

