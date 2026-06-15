import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  findLoginId,
  resetPassword,
  sendAccountRecoveryEmail,
} from "../api/authApi";
import bg1 from "../assets/image/bg1.jpg";
import bg2 from "../assets/image/bg2.jpg";
import useEcoEffects from "../components/useEcoEffects.js";
import WeMoveLogo from "../components/WeMoveLogo";
import { buildWsUrl } from "../config/env";
import {
  EMAIL_PATTERN,
  normalizeEmail,
  normalizeText,
} from "../utils/profileValidation";
import styles from "../styles/FindAccountPage.module.css";
import "../styles/Particle.css";

const authBackgrounds = [bg1, bg2];
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;
const EMAIL_PURPOSE_BY_MODE = {
  id: "FIND_LOGIN_ID",
  password: "RESET_PASSWORD",
};

export default function FindAccountPage() {
  const [mode, setMode] = useState("id");
  const [resultMessage, setResultMessage] = useState("");
  const [form, setForm] = useState({
    nickname: "",
    loginId: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailVerificationStatus, setEmailVerificationStatus] =
    useState("idle");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedPurpose, setVerifiedPurpose] = useState("");
  const pendingVerificationEmailRef = useRef("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const backgroundImage = useMemo(
    () => authBackgrounds[Math.floor(Math.random() * authBackgrounds.length)],
    [],
  );
  const timeOverlayColor = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) {
      return "rgba(255, 255, 255, 0.1)";
    } else if (hour >= 12 && hour < 18) {
      return "rgba(0, 0, 0, 0.1)";
    } else if (hour >= 18 && hour < 21) {
      return "rgba(255, 94, 0, 0.15)";
    } else {
      return "rgba(0, 0, 20, 0.6)";
    }
  }, []);

  useEffect(() => {
    if (emailVerificationStatus !== "pending") {
      return undefined;
    }

    let socket;

    try {
      socket = new WebSocket(buildWsUrl("/email-verifications"));

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const nextEmail = normalizeEmail(payload.email);

          if (
            payload.verified &&
            nextEmail &&
            nextEmail === pendingVerificationEmailRef.current
          ) {
            setVerifiedEmail(nextEmail);
            setVerifiedPurpose(EMAIL_PURPOSE_BY_MODE[mode]);
            setEmailVerificationStatus("verified");
            setFieldErrors((current) => ({ ...current, email: "" }));
          }
        } catch {
          // 이메일 인증 이벤트 형식이 맞지 않으면 현재 입력 흐름은 유지합니다.
        }
      };

      socket.onerror = () => {
        setFieldErrors((current) => ({
          ...current,
          email: "인증 연결을 확인해주세요.",
        }));
      };
    } catch {
      setFieldErrors((current) => ({
        ...current,
        email: "인증 연결을 시작할 수 없습니다.",
      }));
    }

    return () => {
      socket?.close();
    };
  }, [emailVerificationStatus, mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "email" ? normalizeEmail(value) : value;

    if (name === "email") {
      pendingVerificationEmailRef.current = "";
      setVerifiedEmail("");
      setVerifiedPurpose("");
      setEmailVerificationStatus("idle");
    }

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
    setFieldErrors((current) => ({ ...current, [name]: "", submit: "" }));
    setResultMessage("");
  };

  const requestEmailVerification = async () => {
    const email = normalizeEmail(form.email);

    if (!EMAIL_PATTERN.test(email)) {
      setFieldErrors((current) => ({
        ...current,
        email: "올바른 이메일 형식으로 입력해주세요.",
      }));
      return;
    }

    pendingVerificationEmailRef.current = email;
    setIsSendingEmail(true);
    setEmailVerificationStatus("pending");

    try {
      await sendAccountRecoveryEmail(email, EMAIL_PURPOSE_BY_MODE[mode]);
      setFieldErrors((current) => ({
        ...current,
        email: "인증 메일을 보냈습니다. 메일의 인증하기 버튼을 눌러주세요.",
      }));
    } catch (error) {
      pendingVerificationEmailRef.current = "";
      setEmailVerificationStatus("idle");
      setFieldErrors((current) => ({
        ...current,
        email:
          error?.response?.data?.message || "이메일 인증 요청에 실패했습니다.",
      }));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const ensureVerifiedEmail = () => {
    const email = normalizeEmail(form.email);
    if (
      emailVerificationStatus !== "verified" ||
      verifiedEmail !== email ||
      verifiedPurpose !== EMAIL_PURPOSE_BY_MODE[mode]
    ) {
      setFieldErrors((current) => ({
        ...current,
        email: "이메일 인증을 완료해주세요.",
      }));
      return false;
    }

    return true;
  };

  const switchMode = (nextMode) => {
    pendingVerificationEmailRef.current = "";
    setMode(nextMode);
    setResultMessage("");
    setFieldErrors({});
    setEmailVerificationStatus("idle");
    setVerifiedEmail("");
    setVerifiedPurpose("");
  };

  const handleFindId = async (event) => {
    event.preventDefault();

    if (!ensureVerifiedEmail()) {
      return;
    }

    const nickname = normalizeText(form.nickname);
    if (!nickname) {
      setFieldErrors((current) => ({
        ...current,
        nickname: "닉네임을 입력해주세요.",
      }));
      return;
    }

    setIsSubmitting(true);
    setResultMessage("");

    try {
      const { data } = await findLoginId({
        email: normalizeEmail(form.email),
        nickname,
      });
      setResultMessage(`가입된 아이디는 ${data.loginId} 입니다.`);
    } catch (error) {
      setResultMessage("");
      setFieldErrors((current) => ({
        ...current,
        submit:
          error?.response?.data?.message ||
          "일치하는 계정 정보를 찾지 못했습니다.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!ensureVerifiedEmail()) {
      return;
    }

    const loginId = normalizeText(form.loginId);
    const password = form.password;
    const passwordConfirm = form.passwordConfirm;
    const nextErrors = {};

    if (!loginId) {
      nextErrors.loginId = "아이디를 입력해주세요.";
    }
    if (!PASSWORD_PATTERN.test(password)) {
      nextErrors.password = "대소문자/숫자/특수문자 포함 8~16자입니다.";
    }
    if (passwordConfirm !== password) {
      nextErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setResultMessage("");

    try {
      await resetPassword({
        loginId,
        email: normalizeEmail(form.email),
        password,
      });
      setResultMessage(
        "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.",
      );
      setForm((current) => ({
        ...current,
        password: "",
        passwordConfirm: "",
      }));
    } catch (error) {
      setFieldErrors((current) => ({
        ...current,
        submit:
          error?.response?.data?.message || "비밀번호 재설정에 실패했습니다.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const { containerRef, bubbleData, bubblesRef } = useEcoEffects();

  return (
    <main ref={containerRef} className={styles.page}>
      <div
        className={styles.backgroundLayer}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div
        className={styles.backgroundOverlay}
        style={{
          backgroundColor: timeOverlayColor,
          transition: "background-color 2s ease-in-out",
        }}
      />

      {bubbleData &&
        bubbleData.map((style, i) => (
          <div
            key={`bubble-${i}`}
            className="eco-bubble"
            ref={(el) => (bubblesRef.current[i] = el)}
            style={{
              left: style.left,
              top: style.top,
              width: style.size,
              height: style.size,
              animationDelay: style.delay,
            }}
          />
        ))}

      <div className={styles.ambientEffects} aria-hidden="true">
        <div className={`${styles.ambientOrb} ${styles.orb1}`} />
        <div className={`${styles.ambientOrb} ${styles.orb2}`} />
        <div className={`${styles.ambientOrb} ${styles.orb3}`} />
      </div>
      <div className={styles.layout}>
        <section className={styles.copy}>
          <Link to="/" className={styles.logo}>
            <WeMoveLogo tone="dark" size="md" />
          </Link>
          <span className={styles.eyebrow}>ACCOUNT SUPPORT</span>
          <h1>아이디와 비밀번호를 빠르게 다시 찾는 방법</h1>
          <p>
            가입한 이메일과 기본 정보만 확인하면 계정 조회와 비밀번호 재설정을
            안전하게 이어갈 수 있습니다.
          </p>

          <div className={styles.metrics}>
            <article>
              <strong>이메일 인증</strong>
              <span>가입 정보 확인 후 안전하게 진행</span>
            </article>
            <article>
              <strong>아이디 조회</strong>
              <span>가입된 계정 정보를 빠르게 확인</span>
            </article>
            <article>
              <strong>비밀번호 재설정</strong>
              <span>링크 발송 후 새 비밀번호 등록</span>
            </article>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardKicker}>계정 찾기</span>
            <h2>계정 정보를 다시 연결해볼까요?</h2>
            <p>아이디 찾기 또는 비밀번호 재설정 중 원하는 작업을 선택하세요.</p>
          </div>

          <div className={styles.tabRow}>
            <button
              type="button"
              className={mode === "id" ? styles.tabActive : styles.tab}
              onClick={() => switchMode("id")}
            >
              아이디 찾기
            </button>
            <button
              type="button"
              className={mode === "password" ? styles.tabActive : styles.tab}
              onClick={() => switchMode("password")}
            >
              비밀번호 재설정
            </button>
          </div>

          {mode === "id" ? (
            <form className={styles.form} onSubmit={handleFindId}>
              <label>
                <span>닉네임</span>
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  placeholder="계정 닉네임을 입력하세요"
                />
                <small className={styles.fieldError}>
                  {fieldErrors.nickname || "\u00a0"}
                </small>
              </label>
              <label>
                <span>가입 이메일</span>
                <div className={styles.inlineField}>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="runner@wemove.kr"
                    readOnly={emailVerificationStatus === "verified"}
                  />
                  <button
                    type="button"
                    onClick={requestEmailVerification}
                    disabled={
                      isSendingEmail || emailVerificationStatus === "verified"
                    }
                  >
                    {emailVerificationStatus === "verified"
                      ? "완료"
                      : isSendingEmail
                        ? "전송중"
                        : "인증"}
                  </button>
                </div>
                <small
                  className={
                    emailVerificationStatus === "verified"
                      ? styles.fieldSuccess
                      : styles.fieldError
                  }
                >
                  {emailVerificationStatus === "verified"
                    ? "이메일 인증이 완료되었습니다."
                    : fieldErrors.email || "\u00a0"}
                </small>
              </label>
              <button
                className={styles.submit}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "확인 중..." : "아이디 확인"}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleResetPassword}>
              <label>
                <span>아이디</span>
                <input
                  name="loginId"
                  value={form.loginId}
                  onChange={handleChange}
                  placeholder="wemove_runner"
                />
                <small className={styles.fieldError}>
                  {fieldErrors.loginId || "\u00a0"}
                </small>
              </label>
              <label>
                <span>가입 이메일</span>
                <div className={styles.inlineField}>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="runner@wemove.kr"
                    readOnly={emailVerificationStatus === "verified"}
                  />
                  <button
                    type="button"
                    onClick={requestEmailVerification}
                    disabled={
                      isSendingEmail || emailVerificationStatus === "verified"
                    }
                  >
                    {emailVerificationStatus === "verified"
                      ? "완료"
                      : isSendingEmail
                        ? "전송중"
                        : "인증"}
                  </button>
                </div>
                <small
                  className={
                    emailVerificationStatus === "verified"
                      ? styles.fieldSuccess
                      : styles.fieldError
                  }
                >
                  {emailVerificationStatus === "verified"
                    ? "이메일 인증이 완료되었습니다."
                    : fieldErrors.email || "\u00a0"}
                </small>
              </label>
              <label>
                <span>새 비밀번호</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="대소문자, 숫자, 특수문자 포함 8~16자"
                  maxLength={16}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.password || "\u00a0"}
                </small>
              </label>
              <label>
                <span>새 비밀번호 확인</span>
                <input
                  name="passwordConfirm"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="새 비밀번호 다시 입력"
                  maxLength={16}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.passwordConfirm || "\u00a0"}
                </small>
              </label>
              <button
                className={styles.submit}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "재설정 중..." : "비밀번호 재설정"}
              </button>
            </form>
          )}

          {fieldErrors.submit && (
            <p className={styles.formError}>{fieldErrors.submit}</p>
          )}

          {resultMessage && (
            <div className={styles.resultBox}>
              <strong>안내</strong>
              <p>{resultMessage}</p>
            </div>
          )}

          <div className={styles.links}>
            <Link to="/login">로그인으로 돌아가기</Link>
            <span>·</span>
            <Link to="/signup">회원가입</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
