export const WEMOVE_DIRECT_CHAT_OPEN_EVENT = "wemove:direct-chat-open";

export const openDirectChat = (targetUserId) => {
  if (typeof window === "undefined" || !targetUserId) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WEMOVE_DIRECT_CHAT_OPEN_EVENT, {
      detail: { targetUserId },
    }),
  );
};
