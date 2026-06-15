import { meetingImages } from "../data/dashboardData";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526401485004-2fda9f6c99d5?auto=format&fit=crop&w=1200&q=80";

export const getMeetingThumbnail = (meeting = {}) => {
  if (typeof meeting.thumbnailImage === "string" && meeting.thumbnailImage.trim()) {
    return meeting.thumbnailImage.trim();
  }

  const meetingId = meeting.meetingId ?? meeting.id;
  if (meetingId && meetingImages[meetingId]) {
    return meetingImages[meetingId];
  }

  return FALLBACK_IMAGE;
};
