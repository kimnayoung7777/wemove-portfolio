import styles from "../styles/WeMoveLogo.module.css";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WeMoveLogo({
  tone = "dark",
  size = "md",
  showWordmark = true,
  className = "",
}) {
  return (
    <div className={cx(styles.root, className)}>
      <img
        src="/wemove-mark.svg"
        alt=""
        aria-hidden="true"
        className={cx(styles.mark, styles[tone], styles[size])}
      />
      {showWordmark ? <b className={cx(styles.wordmark, styles[`${tone}Word`])}>WeMove</b> : null}
    </div>
  );
}
