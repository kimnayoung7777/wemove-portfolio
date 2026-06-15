import { useEffect } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import {
  NOTIFICATION_TYPES,
  openNotificationTarget,
} from "../utils/notificationEvents";
import styles from "../styles/Notification.module.css";

const TYPE_LABELS = {
  [NOTIFICATION_TYPES.CHAT]: "메시지",
  [NOTIFICATION_TYPES.MEETING_REQUEST]: "모임 신청",
  [NOTIFICATION_TYPES.MEETING_APPROVED]: "모임 승인",
  [NOTIFICATION_TYPES.MEETING_REJECTED]: "모임 거절",
  [NOTIFICATION_TYPES.MEETING_APPROVAL_CANCELLED]: "승인 취소",
  [NOTIFICATION_TYPES.MEETING_CANCELLED]: "모임 취소",
  [NOTIFICATION_TYPES.MEETING_UPDATED]: "모임 수정",
  [NOTIFICATION_TYPES.MEETING_REMINDER]: "모임 임박",
  [NOTIFICATION_TYPES.COMMENT]: "댓글",
  [NOTIFICATION_TYPES.REPORT_RESULT]: "신고 결과",
  [NOTIFICATION_TYPES.NOTICE]: "공지사항",
  [NOTIFICATION_TYPES.INFO]: "알림",
  [NOTIFICATION_TYPES.ACCOUNT_WARNING]: "관리자 경고",
  [NOTIFICATION_TYPES.ACCOUNT_SUSPEND]: "계정 정지",
};

const STICKER_NOTIFICATION_PATTERN = /^(.*?)(?::\s*)?::wemove-sticker:[^:]+::$/;

const formatNotificationMessage = (message) => {
  const normalized = String(message || "").trim();
  const stickerMatch = normalized.match(STICKER_NOTIFICATION_PATTERN);

  if (!stickerMatch) {
    return message;
  }

  const senderName = stickerMatch[1]?.trim();
  return senderName
    ? `${senderName}: 이모티콘을 보냈습니다.`
    : "이모티콘을 보냈습니다.";
};

const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value).trim();
  const parsed = new Date(
    normalizedValue.includes("T")
      ? normalizedValue
      : normalizedValue.replace(" ", "T"),
  );

  if (Number.isNaN(parsed.getTime())) {
    return normalizedValue.replace("T", " ").slice(0, 16);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export default function NotificationPanel() {
  const { notifications, isPanelOpen, closePanel, clearAll, removeNotification } =
    useNotifications();

  useEffect(() => {
    if (!isPanelOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) {
    return null;
  }

  const handleNotificationClick = (notification) => {
    openNotificationTarget(notification);
    removeNotification(notification.id);
    closePanel();
  };

  return (
    <aside className={styles.panel} aria-label="알림 목록">
      <div className={styles.panelHead}>
        <div>
          <strong>알림</strong>
          <span>{notifications.length}개</span>
        </div>
        <button type="button" onClick={closePanel} aria-label="알림 닫기">
          닫기
        </button>
      </div>

      <div className={styles.list}>
        {notifications.length ? (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={styles.item}
              onClick={() => handleNotificationClick(notification)}
            >
              <span className={styles.type}>
                {TYPE_LABELS[notification.type] || TYPE_LABELS.info}
              </span>
              <strong>{notification.title}</strong>
              {notification.message ? (
                <p>{formatNotificationMessage(notification.message)}</p>
              ) : null}
              <time>{formatTime(notification.createdAt)}</time>
            </button>
          ))
        ) : (
          <p className={styles.empty}>아직 받은 알림이 없습니다.</p>
        )}
      </div>

      <div className={styles.panelFoot}>
        <button
          type="button"
          className={styles.clearButton}
          onClick={clearAll}
          disabled={!notifications.length}
        >
          지우기
        </button>
      </div>
    </aside>
  );
}
