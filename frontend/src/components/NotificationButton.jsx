import { useEffect, useRef } from "react";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "../contexts/NotificationContext";
import styles from "../styles/Notification.module.css";

export default function NotificationButton() {
  const { unreadCount, togglePanel, isPanelOpen, closePanel } = useNotifications();
  const notificationRef = useRef(null);

  useEffect(() => {
    if (!isPanelOpen) {
      return undefined;
    }

    const closeOnOutsideClick = (event) => {
      if (notificationRef.current?.contains(event.target)) {
        return;
      }

      closePanel();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [closePanel, isPanelOpen]);

  return (
    <div className={styles.root} ref={notificationRef}>
      <button
        type="button"
        className={styles.button}
        onClick={togglePanel}
        aria-label="알림"
        aria-expanded={isPanelOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 21.5a2.6 2.6 0 0 0 2.4-1.6H9.6a2.6 2.6 0 0 0 2.4 1.6ZM5.7 17.8h12.6c.7 0 1.1-.8.7-1.4l-1.2-1.8V10a5.8 5.8 0 0 0-4.4-5.6 1.5 1.5 0 0 0-2.8 0A5.8 5.8 0 0 0 6.2 10v4.6L5 16.4c-.4.6 0 1.4.7 1.4Z" />
        </svg>
        {unreadCount > 0 ? (
          <span className={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      <NotificationPanel />
    </div>
  );
}
