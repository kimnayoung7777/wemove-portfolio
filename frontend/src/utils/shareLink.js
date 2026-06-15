export const buildMeetingShareUrl = (meetingId) => {
  if (!meetingId || typeof window === "undefined") {
    return "";
  }

  return new URL(`/meetings/${meetingId}`, window.location.origin).toString();
};

export const copyTextToClipboard = async (text) => {
  if (!text) {
    throw new Error("Copy text is empty.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

export const copyMeetingShareUrl = async (meetingId) => {
  const meetingUrl = buildMeetingShareUrl(meetingId);
  await copyTextToClipboard(meetingUrl);
  return meetingUrl;
};
