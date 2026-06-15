import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppModal from "../components/AppModal";
import DashboardShell from "../components/DashboardShell";
import RegionPickerModal from "../components/RegionPickerModal";
import { buildWsUrl } from "../config/env";
import { sendEmailVerification } from "../api/authApi";
import {
  checkMyEmail,
  checkMyNickname,
  getMe,
  getMySports,
  updateMe,
  updateMySports,
  withdrawMe,
} from "../api/memberApi";
import { getRegions } from "../api/regionApi";
import { getSports } from "../api/sportApi";
import defaultUserImage from "../assets/image/Default-user.png";
import { useAuth } from "../contexts/AuthContext";
import {
  EMAIL_PATTERN,
  NICKNAME_PATTERN,
  formatPhone,
  getPhoneDigits,
  normalizeEmail,
  normalizeText,
} from "../utils/profileValidation";
import { getSportIconName } from "../utils/sportIconMap";
import styles from "../styles/MyPage.module.css";

const ALL_SIDO = "전체 시도";
const ALL_SIGUNGU = "전체 시군구";
const ALL_DONG = "전체 읍면동";

export default function MyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, updateUserProfile, logout } =
    useAuth();
  const [member, setMember] = useState(null);
  const [regions, setRegions] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSportIds, setSelectedSportIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSports, setSavingSports] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkedNickname, setCheckedNickname] = useState("");
  const [nicknameCheckMessage, setNicknameCheckMessage] = useState("");
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] =
    useState("idle");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const pendingVerificationEmailRef = useRef("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawRequiresConfirm, setWithdrawRequiresConfirm] = useState(false);
  const [withdrawBlockCode, setWithdrawBlockCode] = useState("");
  const [withdrawRelatedMeetings, setWithdrawRelatedMeetings] = useState([]);
  const [withdrawNoticeChecked, setWithdrawNoticeChecked] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [draftRegionSelection, setDraftRegionSelection] = useState({
    sido: ALL_SIDO,
    sigungu: ALL_SIGUNGU,
    dong: ALL_DONG,
  });
  const [form, setForm] = useState({
    email: "",
    nickname: "",
    phone: "",
    regionId: "",
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user?.memberId) {
      setMember(null);
      setLoading(false);
      return;
    }

    let active = true;

    const fetchMyPageData = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const [
          memberResponse,
          regionsResponse,
          sportsResponse,
          memberSportsResponse,
        ] = await Promise.all([
          getMe(user.memberId),
          getRegions(),
          getSports(),
          getMySports(user.memberId),
        ]);

        if (!active) {
          return;
        }

        setMember(memberResponse.data ?? null);
        setRegions(Array.isArray(regionsResponse.data) ? regionsResponse.data : []);
        setSports(
          Array.isArray(sportsResponse.data)
            ? sportsResponse.data.filter((sport) => sport.isActive !== false)
            : [],
        );
        setSelectedSportIds(
          Array.isArray(memberSportsResponse.data)
            ? memberSportsResponse.data.map((sport) => sport.sportId)
            : [],
        );
      } catch {
        if (active) {
          setLoadError("회원 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchMyPageData();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, user?.memberId]);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedImage);
    setImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedImage]);

  useEffect(() => {
    if (!isEditOpen || emailVerificationStatus !== "pending") {
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
            setEmailVerificationStatus("verified");
            setFieldErrors((current) => ({
              ...current,
              email: "",
            }));
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
  }, [emailVerificationStatus, isEditOpen]);

  const regionName = useMemo(() => {
    if (!member?.regionId) {
      return "미설정";
    }

    const matchedRegion = regions.find(
      (region) => Number(region.regionId) === Number(member.regionId),
    );

    if (!matchedRegion) {
      return "미설정";
    }

    return [matchedRegion.sido, matchedRegion.sigungu, matchedRegion.dong]
      .filter(Boolean)
      .join(" ");
  }, [member?.regionId, regions]);

  const regionHierarchy = useMemo(() => {
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
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([sido, sigunguMap]) => ({
        sido,
        sigungus: [...sigunguMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "ko"))
          .map(([sigungu, dongs]) => ({
            sigungu,
            dongs: [...new Set(dongs)].sort((a, b) => a.localeCompare(b, "ko")),
          })),
      }));
  }, [regions]);

  const selectedFormRegion = useMemo(
    () =>
      regions.find((region) => Number(region.regionId) === Number(form.regionId)) ??
      null,
    [form.regionId, regions],
  );

  const formRegionLabel = selectedFormRegion
    ? [selectedFormRegion.sido, selectedFormRegion.sigungu, selectedFormRegion.dong]
        .filter(Boolean)
        .join(" > ")
    : "지역을 선택해주세요";

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

  const selectedSports = useMemo(
    () => sports.filter((sport) => selectedSportIds.includes(sport.sportId)),
    [selectedSportIds, sports],
  );

  const formatMeetingSchedule = (meeting) => {
    const date = meeting?.meetingDate ? String(meeting.meetingDate) : "";
    const time = meeting?.startTime ? String(meeting.startTime).slice(0, 5) : "";
    return [date, time].filter(Boolean).join(" ");
  };

  const withdrawIsHostedBlocked = withdrawBlockCode === "HOSTED_MEETINGS_EXIST";
  const withdrawCanSubmit =
    withdrawNoticeChecked && !withdrawIsHostedBlocked && !withdrawing;
  const profileImage =
    imagePreview ||
    (typeof member?.profileImage === "string" && member.profileImage.trim()
      ? member.profileImage.trim()
      : "") ||
    (typeof user?.profileImage === "string" && user.profileImage.trim()
      ? user.profileImage.trim()
      : "") ||
    defaultUserImage;

  const statItems = [
    { label: "내 닉네임", value: member?.nickname || "-" },
    { label: "이메일", value: member?.email || "-" },
    { label: "휴대폰 번호", value: member?.phone ? formatPhone(member.phone) : "미등록" },
    { label: "관심 지역", value: regionName },
  ];

  const openEditModal = () => {
    if (!member) {
      return;
    }

    setForm({
      email: normalizeEmail(member.email),
      nickname: normalizeText(member.nickname),
      phone: formatPhone(member.phone),
      regionId: member.regionId ? String(member.regionId) : "",
    });
    setFieldErrors({});
    setCheckedNickname(normalizeText(member.nickname));
    setNicknameCheckMessage("");
    setEmailVerificationStatus("verified");
    setVerifiedEmail(normalizeEmail(member.email));
    setSelectedImage(null);
    setImagePreview("");
    setSaveError("");
    setDraftRegionSelection({
      sido: ALL_SIDO,
      sigungu: ALL_SIGUNGU,
      dong: ALL_DONG,
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setIsEditOpen(false);
    setSelectedImage(null);
    setImagePreview("");
    setSaveError("");
    setFieldErrors({});
    setCheckedNickname("");
    setNicknameCheckMessage("");
    setEmailVerificationStatus("idle");
    setVerifiedEmail("");
  };

  const openWithdrawModal = () => {
    setWithdrawPassword("");
    setWithdrawError("");
    setWithdrawRequiresConfirm(false);
    setWithdrawBlockCode("");
    setWithdrawRelatedMeetings([]);
    setWithdrawNoticeChecked(false);
    setIsWithdrawOpen(true);
  };

  const closeWithdrawModal = () => {
    if (withdrawing) {
      return;
    }

    setIsWithdrawOpen(false);
    setWithdrawPassword("");
    setWithdrawError("");
    setWithdrawRequiresConfirm(false);
    setWithdrawBlockCode("");
    setWithdrawRelatedMeetings([]);
    setWithdrawNoticeChecked(false);
  };

  const handleWithdraw = async () => {
    const password = withdrawPassword.trim();

    if (!password) {
      setWithdrawError("비밀번호를 입력해주세요.");
      return;
    }

    if (!withdrawNoticeChecked) {
      setWithdrawError("회원탈퇴 유의사항을 확인해주세요.");
      return;
    }

    setWithdrawing(true);
    setWithdrawError("");

    try {
      await withdrawMe(password, withdrawRequiresConfirm);
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data ?? {};
      const message = data.message || "회원탈퇴 처리 중 오류가 발생했습니다.";

      if (status === 409 && message.includes("가입한 모임")) {
        setWithdrawRequiresConfirm(true);
        setWithdrawBlockCode(data.code || "PARTICIPATING_MEETINGS_EXIST");
        setWithdrawRelatedMeetings(Array.isArray(data.meetings) ? data.meetings : []);
        setWithdrawError(message);
        return;
      }

      if (status === 409 && data.code === "HOSTED_MEETINGS_EXIST") {
        setWithdrawBlockCode(data.code);
        setWithdrawRelatedMeetings(Array.isArray(data.meetings) ? data.meetings : []);
        setWithdrawRequiresConfirm(false);
        setWithdrawError(message);
        return;
      }

      setWithdrawError(message);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "phone") {
      nextValue = formatPhone(value);
    } else if (name === "email") {
      nextValue = normalizeEmail(value);
      pendingVerificationEmailRef.current = "";
      setEmailVerificationStatus(
        nextValue && nextValue === normalizeEmail(member?.email)
          ? "verified"
          : "idle",
      );
      setVerifiedEmail(
        nextValue && nextValue === normalizeEmail(member?.email)
          ? nextValue
          : "",
      );
    } else if (name === "nickname") {
      const nextNickname = normalizeText(value);
      if (nextNickname === normalizeText(member?.nickname)) {
        setCheckedNickname(nextNickname);
        setNicknameCheckMessage("");
      } else {
        setCheckedNickname("");
        setNicknameCheckMessage("");
      }
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

  const checkNickname = async () => {
    const nickname = normalizeText(form.nickname);

    if (!NICKNAME_PATTERN.test(nickname)) {
      setNicknameCheckMessage("");
      setFieldErrors((current) => ({
        ...current,
        nickname: "닉네임은 한글/영문/숫자만 입력해주세요.",
      }));
      return;
    }

    if (nickname === normalizeText(member?.nickname)) {
      setCheckedNickname(nickname);
      setNicknameCheckMessage("현재 사용 중인 닉네임입니다.");
      setFieldErrors((current) => ({ ...current, nickname: "" }));
      return;
    }

    setIsCheckingNickname(true);

    try {
      await checkMyNickname(user.memberId, nickname);
      setCheckedNickname(nickname);
      setNicknameCheckMessage("사용 가능한 닉네임입니다.");
      setFieldErrors((current) => ({ ...current, nickname: "" }));
    } catch (error) {
      setCheckedNickname("");
      setNicknameCheckMessage("");
      setFieldErrors((current) => ({
        ...current,
        nickname:
          error?.response?.data?.message || "닉네임 중복확인에 실패했습니다.",
      }));
    } finally {
      setIsCheckingNickname(false);
    }
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

    if (email === normalizeEmail(member?.email)) {
      setVerifiedEmail(email);
      setEmailVerificationStatus("verified");
      setFieldErrors((current) => ({ ...current, email: "" }));
      return;
    }

    pendingVerificationEmailRef.current = email;
    setIsSendingEmail(true);
    setEmailVerificationStatus("pending");

    try {
      await checkMyEmail(user.memberId, email);
      await sendEmailVerification(email);
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

  const openRegionModal = () => {
    if (selectedFormRegion) {
      setDraftRegionSelection({
        sido: normalizeText(selectedFormRegion.sido),
        sigungu: normalizeText(selectedFormRegion.sigungu),
        dong: normalizeText(selectedFormRegion.dong),
      });
    } else {
      setDraftRegionSelection({
        sido: ALL_SIDO,
        sigungu: ALL_SIGUNGU,
        dong: ALL_DONG,
      });
    }

    setIsRegionModalOpen(true);
  };

  const closeRegionModal = () => {
    setIsRegionModalOpen(false);
  };

  const applyRegionSelection = (selection) => {
    const matchedRegion = regions.find(
      (region) =>
        normalizeText(region.sido) === selection.sido &&
        normalizeText(region.sigungu) === selection.sigungu &&
        normalizeText(region.dong) === selection.dong,
    );

    if (!matchedRegion) {
      return;
    }

    setForm((current) => ({
      ...current,
      regionId: String(matchedRegion.regionId),
    }));
    setDraftRegionSelection(selection);
    setIsRegionModalOpen(false);
  };

  const handleImageChange = (event) => {
    const nextImage = event.target.files?.[0] ?? null;

    if (!nextImage) {
      setSelectedImage(null);
      return;
    }

    if (!nextImage.type.startsWith("image/")) {
      setSaveError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (nextImage.size > 5 * 1024 * 1024) {
      setSaveError("프로필 이미지는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }

    setSaveError("");
    setSelectedImage(nextImage);
  };

  const handleSaveProfile = async () => {
    const email = normalizeEmail(form.email);
    const nickname = normalizeText(form.nickname);
    const phone = getPhoneDigits(form.phone);
    const regionId = form.regionId ? Number(form.regionId) : null;
    const nextErrors = {};

    if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "올바른 이메일 형식으로 입력해주세요.";
    } else if (
      email !== normalizeEmail(member?.email) &&
      (emailVerificationStatus !== "verified" || verifiedEmail !== email)
    ) {
      nextErrors.email = "변경할 이메일 인증을 완료해주세요.";
    }

    if (!NICKNAME_PATTERN.test(nickname)) {
      nextErrors.nickname = "닉네임은 한글/영문/숫자만 입력해주세요.";
    } else if (
      nickname !== normalizeText(member?.nickname) &&
      checkedNickname !== nickname
    ) {
      nextErrors.nickname = "닉네임 중복확인을 완료해주세요.";
    }

    if (phone && (phone.length < 9 || phone.length > 11)) {
      nextErrors.phone = "연락처는 숫자 9~11자리로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSaveError("");
      return;
    }

    if (!user?.memberId) {
      setSaveError("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await updateMe(
        user.memberId,
        {
          email,
          nickname,
          phone,
          regionId,
        },
        selectedImage,
      );

      const refreshedMember = await getMe(user.memberId);
      setMember(refreshedMember.data ?? null);
      updateUserProfile?.({
        nickname,
        profileImage: refreshedMember.data?.profileImage ?? "",
      });
      setIsEditOpen(false);
      setSelectedImage(null);
      setImagePreview("");
    } catch (error) {
      setSaveError(
        error?.response?.data?.message || "프로필 수정 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleInterestSport = (sportId) => {
    setSaveError("");
    setSelectedSportIds((current) =>
      current.includes(sportId)
        ? current.filter((id) => id !== sportId)
        : [...current, sportId],
    );
  };

  const saveInterestSports = async () => {
    if (!selectedSportIds.length) {
      setSaveError("관심종목을 1개 이상 선택해주세요.");
      return;
    }

    setSavingSports(true);
    setSaveError("");

    try {
      await updateMySports(selectedSportIds);
      const { data } = await getMySports(user.memberId);
      setSelectedSportIds(
        Array.isArray(data) ? data.map((sport) => sport.sportId) : [],
      );
    } catch (error) {
      setSaveError(
        error?.response?.data?.message || "관심종목 저장에 실패했습니다.",
      );
    } finally {
      setSavingSports(false);
    }
  };

  const resetInterestSports = () => {
    setSaveError("");
    setSelectedSportIds([]);
  };

  return (
    <DashboardShell
      active="마이페이지"
      title="마이페이지"
      description="내 계정 정보와 관심 지역을 확인하고 프로필을 수정할 수 있습니다."
      sidebarInterestItems={selectedSports.map((sport) => ({
        label: sport.name,
        icon: getSportIconName(sport),
      }))}
      aside={
        <section className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelHead}>
            <h3>바로가기</h3>
          </div>
          <div className={styles.dashboardQuickLinks}>
            <Link to="/meetings/new">모임 만들기</Link>
            <Link to="/activity">내 활동 보기</Link>
            <Link to="/meetings">모임 찾기</Link>
          </div>
        </section>
      }
    >
      {!isAuthenticated && !authLoading ? (
        <section className={styles.noticeCard}>
          <h2>로그인이 필요합니다.</h2>
          <p>마이페이지는 로그인 후 내 정보를 확인할 수 있습니다.</p>
          <Link to="/login" className={styles.primaryAction}>
            로그인하러 가기
          </Link>
        </section>
      ) : null}

      {isAuthenticated ? (
        <>
          <section className={styles.profileCard}>
            <div className={styles.profileLeft}>
              <div className={styles.profileAvatar}>
                <img
                  src={profileImage}
                  alt={member?.nickname ? `${member.nickname} 프로필` : "기본 프로필"}
                  className={styles.profileImage}
                />
              </div>
              <div className={styles.profileCopy}>
                <h2>{member?.nickname || user?.nickname || "회원"}</h2>
                <p>
                  {regionName} · {member?.email || "이메일 미설정"}
                </p>
                <small>
                  {member?.phone ? formatPhone(member.phone) : "휴대폰 번호 미등록"}
                </small>
              </div>
            </div>
            <div className={styles.profileActions}>
              <button type="button" onClick={openEditModal}>
                프로필 수정
              </button>
              <button
                type="button"
                className={styles.withdrawButton}
                onClick={openWithdrawModal}
              >
                회원탈퇴
              </button>
            </div>
          </section>

          {loading ? (
            <section className={styles.noticeCard}>
              <h2>회원 정보를 불러오는 중입니다.</h2>
              <p>잠시만 기다리면 프로필과 계정 정보가 표시됩니다.</p>
            </section>
          ) : loadError ? (
            <section className={styles.noticeCard}>
              <h2>회원 정보를 불러오지 못했습니다.</h2>
              <p>{loadError}</p>
            </section>
          ) : (
            <>
              <section className={styles.dashboardStatGrid}>
                {statItems.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </section>

              <section className={styles.tabsPanel}>
                <div className={styles.selectedSportBar}>
                  <span>선택항목</span>
                  <div className={styles.selectedSportList}>
                    {selectedSports.length ? (
                      selectedSports.map((sport) => (
                        <strong key={sport.sportId}>{sport.name}</strong>
                      ))
                    ) : (
                      <em>선택한 관심종목이 없습니다.</em>
                    )}
                  </div>
                </div>

                <section className={styles.interestPanel}>
                  <div className={styles.interestPanelHead}>
                    <div>
                      <span className={styles.detailLabel}>관심종목</span>
                      <strong className={styles.detailValue}>
                        {selectedSportIds.length}개 선택
                      </strong>
                    </div>
                    <div className={styles.interestActions}>
                      <button
                        type="button"
                        className={styles.resetButton}
                        onClick={resetInterestSports}
                        disabled={savingSports || selectedSportIds.length === 0}
                      >
                        초기화
                      </button>
                      <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={saveInterestSports}
                        disabled={savingSports}
                      >
                        {savingSports ? "저장 중..." : "저장하기"}
                      </button>
                    </div>
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
                                    : styles.interestChipButton
                                }
                                onClick={() => toggleInterestSport(sport.sportId)}
                                disabled={savingSports}
                              >
                                {sport.name}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>

                  {saveError ? <p className={styles.formError}>{saveError}</p> : null}
                </section>
              </section>
            </>
          )}
        </>
      ) : null}

      <AppModal
        open={isEditOpen}
        title="프로필 수정"
        description="닉네임, 이메일, 휴대폰 번호, 관심 지역과 프로필 이미지를 수정할 수 있습니다."
        confirmText={saving ? "저장 중..." : "저장하기"}
        cancelText="취소"
        onConfirm={handleSaveProfile}
        onClose={closeEditModal}
      >
        <div className={styles.editForm}>
          <div className={styles.imageEditor}>
            <img
              src={profileImage}
              alt="프로필 미리보기"
              className={styles.imagePreview}
            />
            <label className={styles.uploadButton}>
              이미지 선택
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.hiddenInput}
              />
            </label>
          </div>

          <label className={styles.formField}>
            <span>닉네임</span>
            <div className={styles.inlineField}>
              <input
                name="nickname"
                value={form.nickname}
                onChange={handleFormChange}
                placeholder="닉네임을 입력하세요"
              />
              <button
                type="button"
                onClick={checkNickname}
                disabled={saving || isCheckingNickname}
              >
                {isCheckingNickname ? "확인중" : "중복확인"}
              </button>
            </div>
            <small
              className={
                nicknameCheckMessage ? styles.fieldSuccess : styles.fieldError
              }
            >
              {fieldErrors.nickname || nicknameCheckMessage || "\u00a0"}
            </small>
          </label>

          <label className={styles.formField}>
            <span>이메일</span>
            <div className={styles.inlineField}>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleFormChange}
                placeholder="이메일을 입력하세요"
                readOnly={
                  emailVerificationStatus === "verified" &&
                  form.email !== normalizeEmail(member?.email)
                }
              />
              <button
                type="button"
                onClick={requestEmailVerification}
                disabled={
                  saving ||
                  isSendingEmail ||
                  emailVerificationStatus === "verified"
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

          <label className={styles.formField}>
            <span>휴대폰 번호</span>
            <input
              name="phone"
              value={form.phone}
              onChange={handleFormChange}
              placeholder="휴대폰 번호를 입력하세요"
              inputMode="numeric"
              maxLength={13}
            />
            <small className={styles.fieldError}>
              {fieldErrors.phone || "\u00a0"}
            </small>
          </label>

          <label className={styles.formField}>
            <span>관심 지역</span>
            <button
              type="button"
              className={styles.uploadButton}
              onClick={openRegionModal}
            >
              {formRegionLabel}
            </button>
          </label>

          {saveError ? <p className={styles.formError}>{saveError}</p> : null}
        </div>
      </AppModal>

      <AppModal
        open={isWithdrawOpen}
        title="회원탈퇴"
        description={
          "회원탈퇴 전 아래 유의사항을 반드시 확인해 주세요."
        }
        confirmText={withdrawing ? "처리 중..." : "회원탈퇴"}
        cancelText="취소"
        tone="danger"
        onConfirm={handleWithdraw}
        onClose={closeWithdrawModal}
        confirmDisabled={!withdrawCanSubmit}
      >
        <div className={styles.withdrawForm}>
          <div className={styles.withdrawNoticeBox}>
            <p>
              회원탈퇴를 진행하시면 회원님의 개인정보 및 서비스 이용 기록은
              관련 법령과 내부 보관 정책에 따라 처리되며, 탈퇴 완료 후에는
              계정을 복구할 수 없습니다.
            </p>
            <ol>
              <li>
                <strong>개인정보 및 이용 기록 삭제</strong>
                <span>
                  계정 정보와 개인정보는 원칙적으로 즉시 파기되며, 법령상
                  보관이 필요한 정보는 정해진 기간 후 파기됩니다.
                </span>
              </li>
              <li>
                <strong>게시글 및 댓글 유지</strong>
                <span>
                  작성한 게시글, 댓글, 리뷰 등은 자동 삭제되지 않고 작성자
                  정보가 익명 처리되어 유지될 수 있습니다.
                </span>
              </li>
              <li>
                <strong>재가입 제한</strong>
                <span>
                  무분별한 탈퇴와 재가입 방지를 위해 탈퇴 후 일정 기간 동일한
                  정보로 재가입이 제한될 수 있습니다.
                </span>
              </li>
              <li>
                <strong>법령에 따른 정보 보관</strong>
                <span>
                  결제, 거래, 분쟁 처리 기록 등 일부 정보는 법령상 의무 이행
                  목적에 한해 일정 기간 보관될 수 있습니다.
                </span>
              </li>
              <li>
                <strong>탈퇴 후 서비스 이용 제한</strong>
                <span>
                  탈퇴 완료 후 기존 계정으로 로그인할 수 없으며 신청 내역,
                  혜택 및 권한은 복구되지 않습니다.
                </span>
              </li>
            </ol>
          </div>

          <label className={styles.withdrawCheck}>
            <input
              type="checkbox"
              checked={withdrawNoticeChecked}
              onChange={(event) => {
                setWithdrawNoticeChecked(event.target.checked);
                setWithdrawError("");
              }}
            />
            <span>위 회원탈퇴 유의사항을 모두 확인했습니다.</span>
          </label>

          <label className={styles.formField}>
            <span>비밀번호</span>
            <input
              type="password"
              value={withdrawPassword}
              onChange={(event) => {
                setWithdrawPassword(event.target.value);
                setWithdrawError("");
              }}
              placeholder="현재 비밀번호를 입력하세요."
              autoComplete="current-password"
            />
          </label>

          {withdrawRelatedMeetings.length ? (
            <div className={styles.withdrawMeetingPanel}>
              <strong>
                {withdrawIsHostedBlocked
                  ? "탈퇴 전 정리가 필요한 주최 모임"
                  : "탈퇴 시 자동 탈퇴되는 참여 모임"}
              </strong>
              <div className={styles.withdrawMeetingList}>
                {withdrawRelatedMeetings.map((meeting) => (
                  <Link
                    key={meeting.meetingId}
                    to={`/meetings/${meeting.meetingId}`}
                    className={styles.withdrawMeetingBox}
                    onClick={closeWithdrawModal}
                  >
                    <span>{meeting.title || "모임 상세보기"}</span>
                    <small>
                      {[meeting.sportName, meeting.regionName, meeting.placeName]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                    <time>{formatMeetingSchedule(meeting)}</time>
                  </Link>
                ))}
              </div>
              {withdrawIsHostedBlocked ? (
                <Link
                  to="/mypage"
                  className={styles.withdrawManageLink}
                  onClick={closeWithdrawModal}
                >
                  마이페이지에서 모임 정리하기
                </Link>
              ) : null}
            </div>
          ) : null}

          {withdrawRequiresConfirm ? (
            <p className={styles.withdrawWarning}>
              탈퇴하면 계정이 비활성화되며, 참여 중인 모임 정보에서 회원 상태가
              탈퇴 처리됩니다.
            </p>
          ) : null}
          {withdrawError ? (
            <p className={styles.formError}>{withdrawError}</p>
          ) : null}
        </div>
      </AppModal>

      <RegionPickerModal
        open={isRegionModalOpen}
        regions={regionHierarchy}
        initialSelection={draftRegionSelection}
        onApply={applyRegionSelection}
        onClose={closeRegionModal}
      />

    </DashboardShell>
  );
}
