import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, signup } from "../api/authApi";
import api from "../api/axiosInstance";
import { updateMySports } from "../api/memberApi";
import { getRegions } from "../api/regionApi";
import { getSports } from "../api/sportApi";
import AppModal from "../components/AppModal";
import RegionPickerModal from "../components/RegionPickerModal";
import WeMoveLogo from "../components/WeMoveLogo";
import useEcoEffects from "../components/useEcoEffects.js";
import { buildWsUrl } from "../config/env";
import { useAuth } from "../contexts/AuthContext";
import {
  EMAIL_PATTERN,
  NICKNAME_PATTERN,
  formatPhone,
  getPhoneDigits,
  normalizeText,
} from "../utils/profileValidation";
import bg1 from "../assets/image/bg1.jpg";
import bg2 from "../assets/image/bg2.jpg";
import styles from "../styles/SignupPage.module.css";
import "../styles/Particle.css";

const authBackgrounds = [bg1, bg2];

const initialForm = {
  loginId: "",
  email: "",
  password: "",
  passwordConfirm: "",
  nickname: "",
  gender: "",
  birthYear: "",
  phone: "",
};

const initialRegionSelection = {
  sido: "전체 시도",
  sigungu: "전체 시군구",
  dong: "전체 읍면동",
};

const LOGIN_ID_PATTERN = /^[a-z0-9]{5,20}$/;
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;
const CURRENT_YEAR = new Date().getFullYear();
const NICKNAME_DUPLICATE_MESSAGE = "이미 사용 중인 닉네임입니다.";
const FALLBACK_REGIONS = [
  { regionId: 1, sido: "경기", sigungu: "파주시", dong: "운정동" },
  { regionId: 2, sido: "경기", sigungu: "파주시", dong: "야당동" },
  { regionId: 3, sido: "경기", sigungu: "파주시", dong: "금촌동" },
  { regionId: 4, sido: "경기", sigungu: "파주시", dong: "문산읍" },
  { regionId: 5, sido: "서울", sigungu: "마포구", dong: "합정동" },
  { regionId: 6, sido: "서울", sigungu: "강남구", dong: "역삼동" },
];

const getNicknameSuggestions = (nickname) => {
  const base = normalizeText(nickname).replace(/\s/g, "") || "WeMove";
  const suggestions = new Set();

  while (suggestions.size < 3) {
    suggestions.add(`${base}${Math.floor(Math.random() * 900) + 100}`);
  }

  return [...suggestions];
};

const getRegionLabel = (selection) => {
  const values = [selection.sido, selection.sigungu, selection.dong].filter(
    (value) => value && !value.startsWith("전체 "),
  );

  return values.length ? values.join(" ") : "";
};

const buildRegionHierarchy = (regions) => {
  const grouped = new Map();

  regions.forEach((region) => {
    const sido = normalizeText(region.sido);
    const sigungu = normalizeText(region.sigungu);
    const dong = normalizeText(region.dong);

    if (!sido || !sigungu || !dong) {
      return;
    }

    if (!grouped.has(sido)) {
      grouped.set(sido, new Map());
    }

    const sigunguMap = grouped.get(sido);
    if (!sigunguMap.has(sigungu)) {
      sigunguMap.set(sigungu, []);
    }

    sigunguMap.get(sigungu).push(dong);
  });

  return [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], "ko"))
    .map(([sido, sigunguMap]) => ({
      sido,
      sigungus: [...sigunguMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0], "ko"))
        .map(([sigungu, dongs]) => ({
          sigungu,
          dongs: [...new Set(dongs)].sort((left, right) =>
            left.localeCompare(right, "ko"),
          ),
        })),
    }));
};

const getSignupErrorMessage = (error) => {
  const serverMessage = error?.response?.data?.message;

  if (serverMessage) {
    return serverMessage;
  }

  if (error?.response) {
    return "회원가입 정보를 다시 확인해주세요.";
  }

  return "서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.";
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuthenticatedAccessToken } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [regions, setRegions] = useState([]);
  const [sports, setSports] = useState([]);
  const [regionSelection, setRegionSelection] = useState(
    initialRegionSelection,
  );
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [interestError, setInterestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingInterests, setIsSavingInterests] = useState(false);
  const [isCheckingLoginId, setIsCheckingLoginId] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [checkedLoginId, setCheckedLoginId] = useState("");
  const [loginIdCheckMessage, setLoginIdCheckMessage] = useState("");
  const [selectedSportIds, setSelectedSportIds] = useState([]);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameOriginal, setNicknameOriginal] = useState("");
  const [selectedNicknameSuggestion, setSelectedNicknameSuggestion] =
    useState("");
  const [nicknameSuggestions, setNicknameSuggestions] = useState([]);
  const [nicknameModalMessage, setNicknameModalMessage] = useState("");
  const [nicknameModalMessageType, setNicknameModalMessageType] =
    useState("error");
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [isNicknameLocked, setIsNicknameLocked] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] =
    useState("idle");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const pendingVerificationEmailRef = useRef("");

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
    let active = true;

    const loadInitialOptions = async () => {
      try {
        const [regionsResponse, sportsResponse] = await Promise.all([
          getRegions(),
          getSports(),
        ]);
        const nextRegions = Array.isArray(regionsResponse.data)
          ? regionsResponse.data
          : [];
        const nextSports = Array.isArray(sportsResponse.data)
          ? sportsResponse.data
          : [];

        if (active) {
          setRegions(nextRegions.length ? nextRegions : FALLBACK_REGIONS);
          setSports(nextSports.filter((sport) => sport.isActive !== false));
        }
      } catch {
        if (active) {
          setRegions(FALLBACK_REGIONS);
          setSports([]);
        }
      }
    };

    loadInitialOptions();
    return () => {
      active = false;
    };
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
          const nextEmail = normalizeText(payload.email);

          if (
            payload.verified &&
            nextEmail &&
            nextEmail === pendingVerificationEmailRef.current
          ) {
            setVerifiedEmail(nextEmail);
            setEmailVerificationStatus("verified");
            setFieldErrors((current) => ({
              ...current,
              email: "",
            }));
          }
        } catch {
          // 웹소켓 메시지 형식이 다르면 회원가입 입력 흐름은 유지합니다.
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
  }, [emailVerificationStatus]);

  const regionHierarchy = useMemo(
    () => buildRegionHierarchy(regions),
    [regions],
  );

  const selectedRegion = useMemo(() => {
    return regions.find(
      (region) =>
        normalizeText(region.sido) === regionSelection.sido &&
        normalizeText(region.sigungu) === regionSelection.sigungu &&
        normalizeText(region.dong) === regionSelection.dong,
    );
  }, [regionSelection, regions]);

  const regionLabel = getRegionLabel(regionSelection);
  const groupedSports = useMemo(() => {
    const grouped = new Map();

    sports.forEach((sport) => {
      const category = sport.category || "기타";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category).push(sport);
    });

    return [...grouped.entries()].map(([category, items]) => ({
      category,
      sports: items,
    }));
  }, [sports]);

  const validateForm = () => {
    const nextErrors = {};
    const loginId = normalizeText(form.loginId);
    const email = normalizeText(form.email);
    const password = form.password;
    const phoneDigits = getPhoneDigits(form.phone);
    const birthYear = Number(form.birthYear);

    if (!LOGIN_ID_PATTERN.test(loginId)) {
      nextErrors.loginId = "소문자/숫자 5~20자로 입력해주세요.";
    } else if (checkedLoginId !== loginId) {
      nextErrors.loginId = "아이디 중복확인을 완료해주세요.";
    }

    if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "올바른 이메일 형식으로 입력해주세요.";
    } else if (
      emailVerificationStatus !== "verified" ||
      verifiedEmail !== email
    ) {
      nextErrors.email = "이메일 인증을 완료해주세요.";
    }

    if (!PASSWORD_PATTERN.test(password)) {
      nextErrors.password = "대소문자/숫자/특수문자 포함 8~16자입니다.";
    }

    if (form.passwordConfirm !== password) {
      nextErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    if (!NICKNAME_PATTERN.test(normalizeText(form.nickname))) {
      nextErrors.nickname = "한글/영문/숫자만 입력해주세요.";
    }

    if (!selectedRegion?.regionId) {
      nextErrors.region = "지역을 선택해주세요.";
    }

    if (!form.gender) {
      nextErrors.gender = "성별을 선택해주세요.";
    }

    if (
      !/^\d{4}$/.test(form.birthYear) ||
      birthYear < 1900 ||
      birthYear > CURRENT_YEAR
    ) {
      nextErrors.birthYear = "4자리 연도로 입력해주세요.";
    }

    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      nextErrors.phone = "숫자 9~11자리로 입력해주세요.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePasswordFields = (nextForm = form) => {
    const password = nextForm.password;
    const passwordConfirm = nextForm.passwordConfirm;
    const nextErrors = {};

    if (password && !PASSWORD_PATTERN.test(password)) {
      nextErrors.password = "대소문자/숫자/특수문자 포함 8~16자입니다.";
    }

    if (passwordConfirm && passwordConfirm !== password) {
      nextErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    setFieldErrors((current) => ({
      ...current,
      password: nextErrors.password || "",
      passwordConfirm: nextErrors.passwordConfirm || "",
    }));

    return !nextErrors.password && !nextErrors.passwordConfirm;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "phone") {
      nextValue = formatPhone(value);
    } else if (name === "birthYear") {
      nextValue = value.replace(/\D/g, "").slice(0, 4);
    }

    if (name === "email") {
      pendingVerificationEmailRef.current = "";
      setVerifiedEmail("");
      setEmailVerificationStatus("idle");
    }
    if (name === "loginId") {
      setCheckedLoginId("");
      setLoginIdCheckMessage("");
    }

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const openNicknameDuplicateModal = (
    message = NICKNAME_DUPLICATE_MESSAGE,
    baseNickname = form.nickname,
  ) => {
    const nickname = normalizeText(baseNickname);
    setNicknameOriginal(nickname);
    setNicknameDraft(nickname);
    setSelectedNicknameSuggestion("");
    setNicknameSuggestions(getNicknameSuggestions(nickname));
    setNicknameModalMessage(message);
    setNicknameModalMessageType("error");
    setIsNicknameLocked(false);
    setIsNicknameModalOpen(true);
  };

  const checkNicknameAvailability = async ({ applyOnSuccess = false } = {}) => {
    const nickname = normalizeText(nicknameDraft);

    if (!NICKNAME_PATTERN.test(nickname)) {
      setNicknameModalMessage("닉네임은 한글/영문/숫자만 입력해주세요.");
      setNicknameModalMessageType("error");
      return false;
    }

    setIsCheckingNickname(true);

    try {
      await api.get("/auth/check-nickname", { params: { nickname } });
      setNicknameDraft(nickname);
      setSelectedNicknameSuggestion("");
      setIsNicknameLocked(true);
      setNicknameModalMessage("사용 가능한 닉네임입니다.");
      setNicknameModalMessageType("success");

      if (applyOnSuccess) {
        setForm((current) => ({ ...current, nickname }));
        setFieldErrors((current) => ({ ...current, nickname: "" }));
        setIsNicknameModalOpen(false);
      }

      return true;
    } catch (error) {
      const message =
        error?.response?.data?.message || NICKNAME_DUPLICATE_MESSAGE;
      setNicknameModalMessage(message);
      setNicknameModalMessageType("error");
      setIsNicknameLocked(false);
      setNicknameSuggestions(getNicknameSuggestions(nickname));
      return false;
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const selectNicknameSuggestion = (nickname) => {
    if (selectedNicknameSuggestion === nickname) {
      setNicknameDraft(nicknameOriginal);
      setSelectedNicknameSuggestion("");
      setIsNicknameLocked(false);
      setNicknameModalMessage(NICKNAME_DUPLICATE_MESSAGE);
      setNicknameModalMessageType("error");
      return;
    }

    setNicknameDraft(nickname);
    setSelectedNicknameSuggestion(nickname);
    setIsNicknameLocked(true);
    setNicknameModalMessage("추천 닉네임을 선택했습니다.");
    setNicknameModalMessageType("success");
  };

  const applyNicknameDraft = async () => {
    const nickname = normalizeText(nicknameDraft);

    if (!isNicknameLocked) {
      const available = await checkNicknameAvailability();
      if (!available) {
        return;
      }
    }

    setForm((current) => ({ ...current, nickname }));
    setFieldErrors((current) => ({ ...current, nickname: "" }));
    setIsNicknameModalOpen(false);
    await submitSignup(nickname);
  };

  const checkLoginId = async () => {
    const loginId = normalizeText(form.loginId);

    if (!LOGIN_ID_PATTERN.test(loginId)) {
      setLoginIdCheckMessage("");
      setFieldErrors((current) => ({
        ...current,
        loginId: "소문자/숫자 5~20자로 입력해주세요.",
      }));
      return;
    }

    setIsCheckingLoginId(true);

    try {
      await api.get("/auth/check-login-id", { params: { loginId } });
      setCheckedLoginId(loginId);
      setLoginIdCheckMessage("중복확인이 완료되었습니다.");
      setFieldErrors((current) => ({
        ...current,
        loginId: "",
      }));
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      setCheckedLoginId("");
      setLoginIdCheckMessage("");
      setFieldErrors((current) => ({
        ...current,
        loginId:
          serverMessage ||
          (status === 409
            ? "이미 사용 중인 아이디입니다."
            : "아이디 중복 확인에 실패했습니다. 백엔드 실행 상태를 확인해주세요."),
      }));
    } finally {
      setIsCheckingLoginId(false);
    }
  };

  const requestEmailVerification = async () => {
    const email = normalizeText(form.email);

    if (!EMAIL_PATTERN.test(email)) {
      setFieldErrors((current) => ({
        ...current,
        email: "올바른 이메일 형식으로 입력해주세요.",
      }));
      return;
    }

    pendingVerificationEmailRef.current = email;
    setIsCheckingEmail(true);
    setEmailVerificationStatus("pending");

    try {
      await api.get("/auth/check-email", { params: { email } });
      await api.post("/auth/email/send", { email });

      setFieldErrors((current) => ({
        ...current,
        email: "인증 메일을 보냈습니다. 메일의 인증하기 버튼을 눌러주세요.",
      }));
    } catch (error) {
      const status = error?.response?.status;
      pendingVerificationEmailRef.current = "";
      setEmailVerificationStatus("idle");
      setFieldErrors((current) => ({
        ...current,
        email:
          error?.response?.data?.message ||
          (status === 409
            ? "이미 사용 중인 이메일입니다."
            : "이메일 인증 요청에 실패했습니다."),
      }));
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const applyRegion = (selection) => {
    setRegionSelection(selection);
    setIsRegionModalOpen(false);
    setFieldErrors((current) => ({
      ...current,
      region: "",
    }));
  };

  const submitSignup = async (nicknameOverride) => {
    setFormMessage("");

    const nickname = normalizeText(nicknameOverride ?? form.nickname);

    if (!nicknameOverride && !validateForm()) {
      return;
    }

    const loginId = normalizeText(form.loginId);
    const email = normalizeText(form.email);
    const password = form.password;

    setIsSubmitting(true);

    try {
      await signup({
        loginId,
        email,
        password,
        nickname,
        regionId: selectedRegion.regionId,
        gender: Number(form.gender),
        birthYear: Number(form.birthYear),
        phone: getPhoneDigits(form.phone),
      });

      const { data } = await login({ loginId, password, autoLogin: true });
      setAuthenticatedAccessToken(data?.accessToken);
      setSelectedSportIds([]);
      setInterestError("");
      setIsNicknameModalOpen(false);
      setIsInterestModalOpen(true);
    } catch (error) {
      const message = getSignupErrorMessage(error);

      if (message.includes("아이디")) {
        setFieldErrors((current) => ({ ...current, loginId: message }));
      } else if (message.includes("이메일")) {
        setFieldErrors((current) => ({ ...current, email: message }));
      } else if (message.includes("닉네임")) {
        setFieldErrors((current) => ({ ...current, nickname: message }));
        openNicknameDuplicateModal(message, nickname);
      } else {
        setFormMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitSignup();
  };

  const toggleInterestSport = (sportId) => {
    setInterestError("");
    setSelectedSportIds((current) =>
      current.includes(sportId)
        ? current.filter((id) => id !== sportId)
        : [...current, sportId],
    );
  };

  const closeInterestModal = () => {
    setIsInterestModalOpen(false);
    navigate("/meetings");
  };

  const saveInterestSports = async () => {
    if (!selectedSportIds.length) {
      setInterestError("관심종목을 1개 이상 선택해주세요.");
      return;
    }

    setIsSavingInterests(true);
    setInterestError("");

    try {
      await updateMySports(selectedSportIds);
      closeInterestModal();
    } catch (error) {
      setInterestError(
        error?.response?.data?.message || "관심종목 저장에 실패했습니다.",
      );
    } finally {
      setIsSavingInterests(false);
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
      <div className={`${styles.layout} ${styles.signupLayout}`}>
        <section className={styles.copy}>
          <Link to="/" className={styles.logo}>
            <WeMoveLogo tone="dark" size="md" />
          </Link>
          <span className={styles.eyebrow}>JOIN WEMOVE</span>
          <h1>내 지역에서 시작하는 새로운 운동 루틴</h1>
          <p>
            기본 정보를 입력하면 내 주변 모임을 훨씬 더 빠르게 찾을 수 있습니다.
            처음 가입해도 바로 참여 흐름이 이어지도록 설계했습니다.
          </p>

          <div className={styles.metrics}>
            <article>
              <strong>러닝</strong>
              <span>출근 전부터 퇴근 후까지</span>
            </article>
            <article>
              <strong>풋살</strong>
              <span>팀이 없어도 가볍게</span>
            </article>
            <article>
              <strong>등산</strong>
              <span>주말 루틴까지 자연스럽게</span>
            </article>
          </div>
        </section>

        <form
          className={`${styles.card} ${styles.signupCard}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <div className={styles.cardHead}>
            <span className={styles.cardKicker}>회원가입</span>
            <h2>프로필을 만들고 바로 시작하세요</h2>
            <p>기본 정보를 입력하면 WeMove 활동 준비가 끝납니다.</p>
          </div>

          <div className={styles.signupSection}>
            <div className={styles.fieldGrid}>
              <label>
                <span>아이디</span>
                <div className={styles.inlineField}>
                  <input
                    name="loginId"
                    value={form.loginId}
                    onChange={handleChange}
                    placeholder="영문자와 숫자 5~20자"
                    autoComplete="username"
                    maxLength={20}
                    readOnly={Boolean(checkedLoginId)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={checkLoginId}
                    disabled={
                      isSubmitting ||
                      isCheckingLoginId ||
                      Boolean(checkedLoginId)
                    }
                  >
                    {checkedLoginId
                      ? "완료"
                      : isCheckingLoginId
                        ? "확인중"
                        : "중복확인"}
                  </button>
                </div>
                <small
                  className={
                    loginIdCheckMessage
                      ? styles.fieldSuccess
                      : styles.fieldError
                  }
                >
                  {fieldErrors.loginId || loginIdCheckMessage || "\u00a0"}
                </small>
              </label>

              <label>
                <span>이메일</span>
                <div className={styles.inlineField}>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="runner@wemove.kr"
                    autoComplete="email"
                    readOnly={emailVerificationStatus === "verified"}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={requestEmailVerification}
                    disabled={
                      isSubmitting ||
                      isCheckingEmail ||
                      emailVerificationStatus === "verified"
                    }
                  >
                    {emailVerificationStatus === "verified"
                      ? "완료"
                      : isCheckingEmail
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
                <span>비밀번호</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={(event) =>
                    validatePasswordFields({
                      ...form,
                      password: event.target.value,
                    })
                  }
                  placeholder="대소문자, 숫자, 특수문자 포함 8~16자"
                  autoComplete="new-password"
                  maxLength={16}
                  disabled={isSubmitting}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.password || "\u00a0"}
                </small>
              </label>

              <label>
                <span>비밀번호 확인</span>
                <input
                  name="passwordConfirm"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  onBlur={(event) =>
                    validatePasswordFields({
                      ...form,
                      passwordConfirm: event.target.value,
                    })
                  }
                  placeholder="비밀번호 다시 입력"
                  autoComplete="new-password"
                  maxLength={16}
                  disabled={isSubmitting}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.passwordConfirm || "\u00a0"}
                </small>
              </label>

              <label>
                <span>닉네임</span>
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  placeholder="닉네임 입력"
                  autoComplete="nickname"
                  disabled={isSubmitting}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.nickname || "\u00a0"}
                </small>
              </label>

              <label>
                <span>지역</span>
                <button
                  type="button"
                  className={styles.regionSelectButton}
                  onClick={() => setIsRegionModalOpen(true)}
                  disabled={isSubmitting}
                >
                  {regionLabel || "지역 선택"}
                </button>
                <small className={styles.fieldError}>
                  {fieldErrors.region || "\u00a0"}
                </small>
              </label>

              <label>
                <span>성별</span>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="">성별 선택</option>
                  <option value="1">남</option>
                  <option value="2">여</option>
                </select>
                <small className={styles.fieldError}>
                  {fieldErrors.gender || "\u00a0"}
                </small>
              </label>

              <label>
                <span>출생년도</span>
                <input
                  name="birthYear"
                  value={form.birthYear}
                  onChange={handleChange}
                  placeholder="출생년도 입력 "
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  disabled={isSubmitting}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.birthYear || "\u00a0"}
                </small>
              </label>

              <label className={styles.fullField}>
                <span>연락처</span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="010-1234-5678"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  disabled={isSubmitting}
                />
                <small className={styles.fieldError}>
                  {fieldErrors.phone || "\u00a0"}
                </small>
              </label>
            </div>
          </div>

          {formMessage ? (
            <p className={styles.formError} role="alert">
              {formMessage}
            </p>
          ) : null}

          <button
            className={styles.submit}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "가입 처리 중..." : "가입 완료"}
          </button>

          <div className={styles.links}>
            <Link to="/login">이미 계정이 있어요</Link>
          </div>
        </form>
      </div>

      <RegionPickerModal
        open={isRegionModalOpen}
        regions={regionHierarchy}
        initialSelection={regionSelection}
        onApply={applyRegion}
        onClose={() => setIsRegionModalOpen(false)}
      />

      <AppModal
        open={isNicknameModalOpen}
        eyebrow="닉네임"
        title="중복된 닉네임입니다"
        description="추천 닉네임을 선택하거나 새 닉네임을 입력해서 중복확인을 해주세요."
        confirmText={isSubmitting ? "가입 처리 중..." : "가입 완료"}
        cancelText="닫기"
        onConfirm={
          isCheckingNickname || isSubmitting ? undefined : applyNicknameDraft
        }
        onClose={() => setIsNicknameModalOpen(false)}
      >
        <div className={styles.nicknameModalBody}>
          <div className={styles.nicknameSuggestionList}>
            {nicknameSuggestions.map((nickname) => (
              <button
                key={nickname}
                type="button"
                className={
                  nicknameDraft === nickname
                    ? styles.nicknameSuggestionSelected
                    : styles.nicknameSuggestion
                }
                onClick={() => selectNicknameSuggestion(nickname)}
              >
                {nickname}
              </button>
            ))}
          </div>

          <label className={styles.nicknameModalField}>
            <span>닉네임 직접 입력</span>
            <div className={styles.nicknameModalInline}>
              <input
                value={nicknameDraft}
                onChange={(event) => {
                  setNicknameDraft(event.target.value);
                  setSelectedNicknameSuggestion("");
                  setIsNicknameLocked(false);
                  setNicknameModalMessage("");
                }}
                readOnly={isNicknameLocked}
                maxLength={50}
                disabled={isCheckingNickname}
              />
              <button
                type="button"
                onClick={() => checkNicknameAvailability()}
                disabled={isCheckingNickname || isNicknameLocked}
              >
                {isCheckingNickname ? "확인중" : "중복확인"}
              </button>
            </div>
          </label>

          {nicknameModalMessage ? (
            <p
              className={
                nicknameModalMessageType === "success"
                  ? styles.nicknameModalSuccess
                  : styles.nicknameModalError
              }
              role="alert"
            >
              {nicknameModalMessage}
            </p>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={isInterestModalOpen}
        eyebrow="관심종목"
        title="관심 운동을 선택해주세요"
        description="선택한 종목을 기준으로 더 잘 맞는 모임을 찾을 수 있습니다."
        confirmText={isSavingInterests ? "저장 중..." : "저장하고 시작"}
        cancelText="나중에"
        onConfirm={isSavingInterests ? undefined : saveInterestSports}
        onClose={isSavingInterests ? undefined : closeInterestModal}
      >
        <div className={styles.interestSummary}>
          <strong>{selectedSportIds.length}개 선택</strong>
          <span>여러 개를 선택할 수 있습니다.</span>
        </div>

        <div className={styles.interestGroupList}>
          {groupedSports.map((group) => (
            <section key={group.category} className={styles.interestGroup}>
              <h3>{group.category}</h3>
              <div className={styles.interestChipGrid}>
                {group.sports.map((sport) => {
                  const selected = selectedSportIds.includes(sport.sportId);

                  return (
                    <button
                      key={sport.sportId}
                      type="button"
                      className={
                        selected
                          ? styles.interestChipSelected
                          : styles.interestChip
                      }
                      onClick={() => toggleInterestSport(sport.sportId)}
                      disabled={isSavingInterests}
                    >
                      {sport.name}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {interestError ? (
          <p className={styles.interestError} role="alert">
            {interestError}
          </p>
        ) : null}
      </AppModal>
    </main>
  );
}
