import { useEffect, useState } from "react";
import styles from "../styles/HeaderClock.module.css";
import UiIcon from "./UiIcon";

const formatDate = (date) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);

const formatTime = (date) =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

export default function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <time className={styles.clock} dateTime={now.toISOString()}>
      <span className={styles.iconWrap}>
        <UiIcon name="calendar" className={styles.icon} />
      </span>
      <span className={styles.copy}>
        <small>{formatDate(now)}</small>
        <strong>{formatTime(now)}</strong>
      </span>
    </time>
  );
}
