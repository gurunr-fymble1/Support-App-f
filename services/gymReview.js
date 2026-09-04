import apiConfig from "./apiConfig";
import axiosInstance from "./axiosInstance";

export const GetGyms = async (search = "", cursor = 0, limit = 20) => {
    const response = await axiosInstance.get(`/support-app/gym-review/gyms`, {
        params: { search, cursor, limit }
    });
    return response.data;
};

export const GetGymReviews = async (gym_id) => {
    const response = await axiosInstance.get(`/support-app/gym-review/gym/${gym_id}/reviews`);
    return response.data;
};

export const AddGymReview = async (gym_id, action, review) => {
    const response = await axiosInstance.post(`/support-app/gym-review/gym/review`, null, {
        params: { gym_id, action, review }
    });
    return response.data;
};
