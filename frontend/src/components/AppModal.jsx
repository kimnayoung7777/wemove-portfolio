import { useEffect } from "react";
import styles from "../styles/AppModal.module.css";

export default function AppModal({
  open,
  title,
  eyebrow,
  description,
  children,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onClose,
  variant = "default",
  tone = "primary",
  hideCancel = false,
  confirmDisabled = false,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  const modalClassName = [
    styles.modal,
    variant === "sheet" ? styles.sheet : "",
  ]
    .filter(Boolean)
    .join(" ");

  const confirmClassName = [
    styles.confirmButton,
    tone === "danger" ? styles.dangerButton : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="모달 닫기"
        >
          ×
        </button>

        <div className={styles.header}>
          {eyebrow && <span>{eyebrow}</span>}
          <h2 id="app-modal-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>

        {children && <div className={styles.body}>{children}</div>}

        <div className={styles.actions}>
          {!hideCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              className={confirmClassName}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmText}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
