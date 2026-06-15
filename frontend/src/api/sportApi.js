import api from "./axiosInstance";
export const getSports = () => api.get("/sports");
