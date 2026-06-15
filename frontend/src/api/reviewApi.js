import api from "./axiosInstance";
export const getReviews = (id) => api.get("/meetings/" + id + "/reviews");
export const createReview = (id, d) =>
  api.post("/meetings/" + id + "/reviews", d);
