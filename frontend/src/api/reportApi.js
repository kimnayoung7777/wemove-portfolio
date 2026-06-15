import api from "./axiosInstance";

export const createReport = (data) => {
  return api.post("/reports", data);
};
