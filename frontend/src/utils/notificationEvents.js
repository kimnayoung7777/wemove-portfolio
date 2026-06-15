export const WEMOVE_NOTIFICATION_EVENT = "wemove:notification";
export const WEMOVE_NOTIFICATION_OPEN_EVENT = "wemove:notification-open";
export const WEMOVE_ACCOUNT_SUSPEND_EVENT = "wemove:account-suspend";

export const createLocalDateTimeStamp = (value = new Date()) => {
  const date =
    value instanceof Date
      ? value
      : new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const NOTIFICATION_TYPES = {
  CHAT: "chat",
  MEETING_REQUEST: "meetingRequest",
  MEETING_REQUEST_CANCELLED: "meetingRequestCancelled",
  MEETING_APPROVED: "meetingApproved",
  MEETING_REJECTED: "meetingRejected",
  MEETING_APPROVAL_CANCELLED: "meetingApprovalCancelled",
  MEETING_PARTICIPANT_CANCELLED: "meetingParticipantCancelled",
  MEETING_CANCELLED: "meetingCancelled",
  MEETING_UPDATED: "meetingUpdated",
  MEETING_REMINDER: "meetingReminder",
  COMMENT: "comment",
  REPORT_RESULT: "reportResult",
  NOTICE: "notice",
  INFO: "info",
  ACCOUNT_WARNING: "accountWarning",
  ACCOUNT_SUSPEND: "accountSuspend",
};

export const openNotificationTarget = (notification) => {
  if (typeof window === "undefined" || !notification) {
    return;
  }

  if (
    notification.targetType === "meeting" &&
    notification.targetId !== undefined &&
    notification.targetId !== null
  ) {
    window.location.assign(`/meetings/${notification.targetId}`);
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WEMOVE_NOTIFICATION_OPEN_EVENT, {
      detail: notification,
    }),
  );
};

export const publishAccountSuspend = ({
  title = "계정 정지 안내",
  message = "계정이 정지되어 로그아웃됩니다.",
  reason,
  suspendedUntil,
  suspendHours,
}) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WEMOVE_ACCOUNT_SUSPEND_EVENT, {
      detail: { title, message, reason, suspendedUntil, suspendHours },
    }),
  );
};

export const publishNotification = ({
  id,
  notificationId,
  type = NOTIFICATION_TYPES.INFO,
  chatKind,
  title,
  message = "",
  targetType,
  targetId,
  sourceId,
  isRead,
  createdAt = createLocalDateTimeStamp(),
  forceLogout,
  suspendedUntil,
  suspendHours,
}) => {
  if (typeof window === "undefined" || !title) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WEMOVE_NOTIFICATION_EVENT, {
      detail: {
        id: id || notificationId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        notificationId,
        type,
        chatKind,
        title,
        message,
        targetType,
        targetId,
        sourceId,
        isRead,
        createdAt,
        forceLogout,
        suspendedUntil,
        suspendHours,
      },
    }),
  );
};
