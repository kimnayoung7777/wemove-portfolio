import api from "./axiosInstance";

export const getComments = (id) => api.get("/meetings/" + id + "/comments");

export const createComment = (id, d) =>
  api.post("/meetings/" + id + "/comments", d);

export const deleteComment = (commentId, memberId) => {
    return api.delete(`/comments/${commentId}`, {
        params: {
            requestId: memberId,
        }
    })
}
