import api from "./axiosInstance";
export const getRegions = () => api.get("/regions");
