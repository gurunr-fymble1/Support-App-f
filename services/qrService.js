import axiosInstance from "./axiosInstance";

// const BASE_URL = apiConfig.API_URL;
// const API_BASE_URL = `${BASE_URL}/qr`;

export const scanQR = async (qrId) => {


  // console.log("qrId", qrId);
  // const encoded = encodeURIComponent(qrId);

  // console.log(encoded);

  const response = await axiosInstance.get(`/support/verify/scanned`, { params: { qr_id: qrId } });

  return response.data;
};