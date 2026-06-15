import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppModal from "../components/AppModal";
import WeMoveLogo from "../components/WeMoveLogo";
import { login } from "../api/authApi";
import { getLoginPageStats } from "../api/statsApi";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/LoginPage.module.css";
import "../styles/Particle.css";
import { parseUserFromAccessToken } from "../utils/jwtPayload";
import {
  clearRememberedLoginId,
  getRememberedLoginId,
  setRememberedLoginId,
} from "../utils/rememberedLogin";

// 새로고침 시 번갈아 나올 배경 이미지들 임포트
import bg1 from "../assets/image/bg1.jpg";
import bg2 from "../assets/image/bg2.jpg";
import useEcoEffects from "../components/useEcoEffects.js";

const authBackgrounds = [bg1, bg2];

const normalizeServerMessage = (message) => {
  if (!message) {
    return "";
  }

  if (
      message.includes("Invalid login credentials") ||
      message.includes("아이디 또는 비밀번호") ||
      message.includes("비밀번호가 올바르지")
  ) {
    return "아이디 또는 비밀번호가 올바르지 않습니다.";
  }

  if (message.includes("이메일 인증")) {
    return "이메일 인증을 완료한 뒤 로그인해주세요.";
  }

  if (message.includes("deleted") || message.includes("탈퇴")) {
    return "탈퇴한 계정은 로그인할 수 없습니다.";
  }

  return message;
};

const normalizeSuspensionText = (value, fallback) => {
  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }

  const looksLikeCode = /[A-Z_]{3,}|ACCOUNT|SUSPEND|TOKEN|SESSION|ERROR/i.test(
      text,
  );
  const hasKorean = /[가-힣]/.test(text);

  return looksLikeCode && !hasKorean ? fallback : text;
};

const getLoginErrorMessage = (error) => {
  const serverMessage = normalizeServerMessage(error?.response?.data?.message);

  if (serverMessage) {
    return serverMessage;
  }

  if (error?.response?.status === 400 || error?.response?.status === 401) {
    return "아이디 또는 비밀번호가 올바르지 않습니다.";
  }

  if (error?.response?.status === 403) {
    return "로그인 조건을 만족하지 않아 접속할 수 없습니다.";
  }

  return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
};

const formatMetric = (value) => {
  const numericValue = Number(value ?? 0);

  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(1)}M`;
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(1)}K`;
  }

  return String(numericValue);
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticatedAccessToken } = useAuth();
  const [form, setForm] = useState({ loginId: "", password: "" });
  const [rememberLoginId, setRememberLoginId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 관련 상태
  const [duplicatePromptOpen, setDuplicatePromptOpen] = useState(false);
  const [suspendedModalOpen, setSuspendedModalOpen] = useState(false);
  const [suspensionDetails, setSuspensionDetails] = useState({
    reason: "",
    until: "",
  });

  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMeetings: 0,
    completedMeetings: 0,
  });

  useEffect(() => {
    const savedLoginId = getRememberedLoginId();
    if (savedLoginId) {
      setForm((current) => ({ ...current, loginId: savedLoginId }));
      setRememberLoginId(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const { data } = await getLoginPageStats();
        if (active && data) {
          setStats({
            totalMembers: data.totalMembers ?? 0,
            totalMeetings: data.totalMeetings ?? 0,
            completedMeetings: data.completedMeetings ?? 0,
          });
        }
      } catch {
        if (active) {
          setStats({
            totalMembers: 0,
            totalMeetings: 0,
            completedMeetings: 0,
          });
        }
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, []);

  const backgroundImage = useMemo(
      () => authBackgrounds[Math.floor(Math.random() * authBackgrounds.length)],
      []
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

  const finishLogin = (loginId, nextAccessToken) => {
    const parsedUser = parseUserFromAccessToken(nextAccessToken);

    if (rememberLoginId) {
      setRememberedLoginId(loginId);
    } else {
      clearRememberedLoginId();
    }

    setAuthenticatedAccessToken(nextAccessToken);
    navigate(parsedUser?.role === "ADMIN" ? "/admin" : "/");
  };

  const executeLogin = async (targetId, targetPw, forceLogin = false) => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const { data } = await login({ loginId: targetId, password: targetPw, autoLogin, forceLogin });
      finishLogin(targetId, data?.accessToken);
    } catch (error) {
      const errData = error?.response?.data;

      if (errData?.code === "DUPLICATE_LOGIN_REQUIRED") {
        setDuplicatePromptOpen(true);
      } else if (
          error?.response?.status === 423 ||
          errData?.code === "ACCOUNT_SUSPENDED" ||
          errData?.message?.includes("suspended") ||
          errData?.message?.includes("정지")
      ) {
        const rawUntil = errData?.suspendedUntil || "";
        const formattedUntil = rawUntil.includes("T")
            ? rawUntil.replace("T", " ")
            : rawUntil;

        setSuspensionDetails({
          reason: normalizeSuspensionText(errData?.reason, "운영원칙 위반"),
          until: normalizeSuspensionText(formattedUntil, "관리자 문의 요망"),
        });
        setSuspendedModalOpen(true);
      } else {
        setErrorMessage(getLoginErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const loginId = form.loginId.trim();
    const password = form.password;

    if (!loginId || !password) {
      setErrorMessage("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    await executeLogin(loginId, password, false);
  };

  // [추가됨] 테스트 계정 로그인 공통 핸들러 (파라미터로 계정 정보를 받음)
  const handleTestLogin = async (testId, testPw) => {
    setForm({ loginId: testId, password: testPw });
    await executeLogin(testId, testPw, false);
  };

  const confirmDuplicateLogin = async () => {
    setDuplicatePromptOpen(false);
    await executeLogin(form.loginId.trim(), form.password, true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const {containerRef, bubbleData, bubblesRef} = useEcoEffects();

  return (
      <>
        <main ref={containerRef} className={styles.page}>
          <div
              className={styles.backgroundLayer}
              style={{ backgroundImage: `url(${backgroundImage})` }}
          />

          <div
              className={styles.backgroundOverlay}
              style={{
                backgroundColor: timeOverlayColor,
                transition: "background-color 2s ease-in-out"
              }}
          />

          {bubbleData && bubbleData.map((style, i) => (
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
              <span className={styles.eyebrow}>LOCAL FITNESS COMMUNITY</span>
              <h1>동네 운동을 자연스럽게 이어주는 방법</h1>
              <p>
                러닝, 헬스, 풋살, 등산, 배드민턴까지. 가까운 사람들과 함께 움직일 수 있는
                지역 기반 운동 모임 플랫폼입니다.
              </p>

              <div className={styles.metrics}>
                <article>
                  <strong>{formatMetric(stats.totalMembers)}</strong>
                  <span>회원 수</span>
                </article>
                <article>
                  <strong>{formatMetric(stats.totalMeetings)}</strong>
                  <span>생성 모임</span>
                </article>
                <article>
                  <strong>{formatMetric(stats.completedMeetings)}</strong>
                  <span>누적 참여</span>
                </article>
              </div>
            </section>

            <form className={styles.card} onSubmit={handleSubmit}>
              <div className={styles.cardHead}>
                <span className={styles.cardKicker}>로그인</span>
                <h2>오늘도 가까운 운동 모임과 같이 움직여볼까요?</h2>
                <p>로그인하고 이번 주 운동 모임을 바로 확인해보세요.</p>
              </div>

              <label>
                <span>아이디</span>
                <input
                    name="loginId"
                    value={form.loginId}
                    onChange={handleChange}
                    placeholder="아이디 입력"
                    autoComplete="username"
                    disabled={isSubmitting}
                />
              </label>

              <label>
                <span>비밀번호</span>
                <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="비밀번호 입력"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                />
              </label>

              <div className={styles.options}>
                <label>
                  <input
                      type="checkbox"
                      checked={rememberLoginId}
                      onChange={(event) => setRememberLoginId(event.target.checked)}
                      disabled={isSubmitting}
                  />
                  아이디 저장
                </label>
                <label>
                  <input
                      type="checkbox"
                      checked={autoLogin}
                      onChange={(event) => setAutoLogin(event.target.checked)}
                      disabled={isSubmitting}
                  />
                  자동 로그인
                </label>
              </div>

              {errorMessage ? (
                  <p role="alert" style={{ color: "#dc2626", margin: "0" }}>
                    {errorMessage}
                  </p>
              ) : null}

              <button className={styles.submit} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>

              {/* [수정됨] 나란히 배치되는 체험 계정 로그인 버튼 영역 */}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", width: "100%" }}>
                <button
                    type="button"
                    //실제 유저용 테스트 아이디와 비밀번호
                    onClick={() => handleTestLogin("user01", "1234")}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                >
                  🏃 일반 체험 계정
                </button>
                <button
                    type="button"
                    // 실제 관리자용 테스트 아이디와 비밀번호
                    onClick={() => handleTestLogin("admin", "Admin123!")}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                >
                  🛠️ 관리자 체험 계정
                </button>
              </div>

              <div className={styles.links}>
                <Link to="/signup">회원가입</Link>
                <span>·</span>
                <Link to="/find-account">아이디/비밀번호 찾기</Link>
              </div>
            </form>
          </div>
        </main>

        <AppModal
            open={duplicatePromptOpen}
            title="현재 로그인된 사용자가 있습니다"
            description="강제로 로그인하면 기존에 로그인되어 있던 사용자는 자동으로 로그아웃됩니다. 계속 로그인하시겠습니까?"
            confirmText="강제 로그인"
            cancelText="취소"
            onConfirm={confirmDuplicateLogin}
            onClose={() => setDuplicatePromptOpen(false)}
        />

        <AppModal
            open={suspendedModalOpen}
            title="접속 제한 안내"
            description="운영원칙 위반으로 인해 계정 이용이 일시적으로 제한되었습니다."
            confirmText="확인"
            hideCancel={true}
            onConfirm={() => setSuspendedModalOpen(false)}
            onClose={() => setSuspendedModalOpen(false)}
        >
          <div style={{
            marginTop: "16px",
            padding: "16px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            textAlign: "left"
          }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                정지 사유
              </span>
              <strong style={{ fontSize: "14px", color: "#334155" }}>
                {suspensionDetails.reason}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                제한 해제 일시
              </span>
              <strong style={{ fontSize: "15px", color: "#e11d48" }}>
                {suspensionDetails.until}
              </strong>
            </div>
          </div>
        </AppModal>
      </>
  );
}