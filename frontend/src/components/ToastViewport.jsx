import styles from "../styles/ToastViewport.module.css";
import { openNotificationTarget } from "../utils/notificationEvents";

export default function ToastViewport({ toasts, onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  const handleToastClick = (toast) => {
    if (!toast.target) {
      return;
    }

    openNotificationTarget(toast.target);
    onDismiss(toast.id);
  };

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`${styles.toast} ${toast.target ? styles.clickable : ""} ${
            styles[toast.tone] ?? ""
          }`.trim()}
          onClick={() => handleToastClick(toast)}
        >
          <div className={styles.copy}>
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={(event) => {
              event.stopPropagation();
              onDismiss(toast.id);
            }}
            aria-label="토스트 닫기"
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}
