import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "../styles/ReactCalendarDatePicker.module.css";

const toDateValue = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ReactCalendarDatePicker({
  value,
  onChange,
  placeholder = "\uB0A0\uC9DC \uC120\uD0DD",
  className = "",
  buttonClassName = "",
  inputRef,
  min,
  disabled = false,
  type,
  onClick,
  onBlur,
  children,
  ...rest
}) {
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 336 });
  const selectedDate = toDateValue(value);
  const minDate = toDateValue(min);

  const updatePosition = () => {
    const target = buttonRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const popoverWidth = Math.min(336, window.innerWidth - 24);
    const margin = 12;
    const left = Math.min(
      Math.max(margin, rect.left),
      window.innerWidth - popoverWidth - margin,
    );

    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left,
      width: popoverWidth,
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        popoverRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (date) => {
    const nextValue = toInputValue(date);
    onChange?.({ target: { name: rest.name, value: nextValue } });
    setOpen(false);
  };

  const displayValue = value || "";

  return (
    <>
      <button
        {...rest}
        ref={(node) => {
          buttonRef.current = node;
          if (typeof inputRef === "function") inputRef(node);
          else if (inputRef) inputRef.current = node;
        }}
        type="button"
        className={[styles.dateButton, className, buttonClassName]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        {children || (
          <span
            className={
              displayValue ? styles.dateButtonText : styles.dateButtonPlaceholder
            }
          >
            {displayValue || placeholder}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={styles.popover}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
          >
            <Calendar
              value={selectedDate}
              onChange={handleSelect}
              minDate={minDate || undefined}
              calendarType="gregory"
              formatDay={(_, date) => String(date.getDate())}
              prev2Label={null}
              next2Label={null}
              className={styles.calendar}
              tileClassName={({ date, view }) => {
                if (view !== "month") return null;
                const classes = [];
                const day = date.getDay();
                const activeMonth = selectedDate || new Date();
                const isNeighborMonth =
                  date.getMonth() !== activeMonth.getMonth() ||
                  date.getFullYear() !== activeMonth.getFullYear();

                if (day === 0) classes.push(styles.sunday);
                if (day === 6) classes.push(styles.saturday);
                if (isNeighborMonth) classes.push(styles.neighborMonth);
                return classes.join(" ");
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
