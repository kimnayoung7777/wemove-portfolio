import api from "./axiosInstance";
export const updateMySports = (sportIds) =>
  api.put("/members/me/sports", { sportIds });

export const getMe = (memberId) =>
  api.get("/members/me", {
    params: { memberId },
  });

export const getMySports = (memberId) =>
  api.get("/members/me/sports", {
    params: { memberId },
  });

export const getMyActivity = (memberId) =>
  api.get("/members/me/activity", {
    params: memberId ? { memberId } : undefined,
  });

export const updateMe = (memberId, data, image) => {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
  );

  if (image) {
    formData.append("image", image);
  }

  return api.put("/members/me", formData, {
    params: { memberId },
  });
};

export const withdrawMe = (password, confirmParticipatingMeetings = false) =>
  api.delete("/members/me", {
    data: { password, confirmParticipatingMeetings },
  });

export const checkMyNickname = (memberId, nickname) =>
  api.get("/members/me/check-nickname", {
    params: { memberId, nickname },
  });

export const checkMyEmail = (memberId, email) =>
  api.get("/members/me/check-email", {
    params: { memberId, email },
  });

export const getMember = (id) => api.get("/members/" + id);
