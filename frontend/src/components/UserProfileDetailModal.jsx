import { useState, useEffect } from "react";
import defaultUserImage from "../assets/image/Default-user.png";
import styles from "../styles/UserProfileDetailModal.module.css";
import UiIcon from "./UiIcon";
import { createReport } from "../api/reportApi";
import { openDirectChat } from "../utils/directChatEvents";

const REPORT_REASON_OPTIONS = [
  { value: "NOSHOW", label: "무단 노쇼", hint: "사전 연락 없이 모임에 불참했어요." },
  { value: "ABUSE", label: "욕설/비매너", hint: "불쾌한 말이나 행동이 있었어요." },
  { value: "SPAM", label: "스팸/홍보", hint: "광고성 메시지나 반복 홍보가 있었어요." },
  { value: "FRAUD", label: "허위 정보/사기", hint: "프로필이나 모임 정보가 의심돼요." },
  { value: "OTHER", label: "기타", hint: "직접 사유를 입력할게요." },
];

const buildReportContent = ({ reason, customReason, detail }) => {
  const detailText = String(detail ?? "").trim();

  if (reason !== "OTHER") {
    return detailText;
  }

  const customReasonText = String(customReason ?? "").trim();

  return [
    customReasonText ? `[직접 입력 사유] ${customReasonText}` : "",
    detailText ? `[상세 내용]\n${detailText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const formatJoinDate = (dateStr) => {
  if (!dateStr) return "2026.05";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split(/[-T.]/);
      if (parts.length >= 2) {
        return `${parts[0]}.${parts[1]}`;
      }
      return "2026.05";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}.${month}`;
  } catch (e) {
    return "2026.05";
  }
};

export default function UserProfileDetailModal({ open, onClose, user, loginUser }) {
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [reportError, setReportError] = useState("");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  // 모달이 열리거나 유저가 바뀔 때 신고 상태 초기화
  useEffect(() => {
    if (open) {
      setIsReporting(false);
      setReportReason("");
      setCustomReason("");
      setReportDetail("");
      setReportError("");
      setIsReportSubmitting(false);
    }
  }, [open, user]);

  if (!open || !user) return null;

  // 나이대 계산 (현재 임시 연도 2026년 기준)
  const getAgeGroupText = () => {
    if (!user.birthYear) return "연령 미지정";
    const currentYear = 2026;
    const age = currentYear - Number(user.birthYear) + 1;
    const ageGroup = Math.floor(age / 10) * 10;
    return `${ageGroup}대`;
  };

  // 성별 텍스트 변환
  const getGenderText = () => {
    if (user.gender === 1) return "남성";
    if (user.gender === 2) return "여성";
    return "성별 미지정";
  };

  const joinDate = formatJoinDate(user.createdAt);
  const ageGroup = getAgeGroupText();
  const genderText = getGenderText();

  // 관심 스포츠 칩 리스트 파싱
  const sportsList = user.sports && user.sports.trim()
    ? user.sports.split(", ").filter(Boolean)
    : [];

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      alert("신고 사유를 선택해 주세요.");
      return;
    }
    if (reportReason === "OTHER" && !customReason.trim()) {
      alert("직접 입력 사유를 적어주세요.");
      return;
    }

    const confirmReport = window.confirm(`${user.nickname}님을 정말로 신고하시겠습니까?`);
    if (!confirmReport) {
      return;
    }

    const finalContent = buildReportContent({
      reason: reportReason,
      customReason,
      detail: reportDetail,
    });

    try {
      await createReport({
        reporterId: loginUser.memberId,
        targetUserId: user.userId,
        reason: reportReason,
        content: finalContent
      });
      alert(`${user.nickname}님에 대한 신고가 정상적으로 접수되었습니다. 관리자 검토 후 조치 예정입니다.`);
      setIsReporting(false);
      onClose();
    } catch (error) {
      console.error("Failed to submit report:", error);
      alert("신고 접수에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  // 로그인한 유저 본인 프로필일 경우 신고 버튼 미노출
  const handleImprovedReportSubmit = async (event) => {
    event.preventDefault();
    setReportError("");

    if (!reportReason) {
      setReportError("신고 사유를 먼저 선택해 주세요.");
      return;
    }

    if (reportReason === "OTHER" && !customReason.trim()) {
      setReportError("기타 사유를 선택한 경우 직접 입력 사유가 필요합니다.");
      return;
    }

    if (reportDetail.trim().length < 10) {
      setReportError("관리자가 판단할 수 있도록 상세 내용을 10자 이상 적어 주세요.");
      return;
    }

    const finalContent = buildReportContent({
      reason: reportReason,
      customReason,
      detail: reportDetail,
    });

    setIsReportSubmitting(true);

    try {
      await createReport({
        reporterId: loginUser.memberId,
        targetUserId: user.userId,
        reason: reportReason,
        content: finalContent,
      });
      alert(`${user.nickname}님에 대한 신고가 접수되었습니다. 관리자 검토 후 조치 예정입니다.`);
      setIsReporting(false);
      onClose();
    } catch (error) {
      console.error("Failed to submit report:", error);
      setReportError("신고 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const isMe = loginUser && (Number(loginUser.memberId) === Number(user.userId));

  const handleDirectChatClick = () => {

    if (!loginUser || !loginUser.memberId) {
      alert("로그인이 필요한 기능입니다. 로그인 후 이용해주세요.");
      return;
    }

    if (isMe) {
      return;
    }

    openDirectChat(user.userId);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* 모달 헤더 */}
        <div className={styles.modalHeader}>
          <h2>{isReporting ? "유저 신고하기" : "유저 프로필"}</h2>
          <button type="button" className={styles.closeIconButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* 모달 바디 */}
        <div className={styles.modalBody}>
          {!isReporting ? (
            /* 1단계: 일반 프로필 조회 화면 */
            <div className={styles.profileContainer}>
              <div className={styles.profileMainRow}>
                <img
                  src={user.profileImage || defaultUserImage}
                  alt={user.nickname}
                  className={styles.profileAvatar}
                  onError={(e) => {
                    e.currentTarget.src = defaultUserImage;
                  }}
                />
                <div className={styles.profileMetaGroup}>
                  <strong className={styles.nicknameText}>{user.nickname}</strong>
                  <span className={styles.metaJoinDate}>가입일 {joinDate}</span>
                  <span className={styles.metaSubText}>
                    {genderText} / {ageGroup} &nbsp;·&nbsp; {user.regionName || "지역 미지정"}
                  </span>
                </div>
              </div>

              {/* 관심 스포츠 칩 리스트 (관심운동 한글 소제목 없이 바로 노출) */}
              <div className={styles.sportsSection}>
                {sportsList.length === 0 ? (
                  <div className={styles.emptySports}>등록된 관심 운동 종목이 없습니다.</div>
                ) : (
                  <div className={styles.sportsChipsWrapper}>
                    {sportsList.map((sport, index) => (
                      <span key={`${sport}-${index}`} className={styles.sportChip}>
                        {sport}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2단계: 신고 사유 작성 화면 (스위칭 콘텐츠) */
            <form onSubmit={handleImprovedReportSubmit} className={styles.reportForm}>
              <div className={styles.reportTargetCard}>
                <span>신고 대상</span>
                <strong>{user.nickname}</strong>
                <p>신고 내용은 관리자에게만 전달되며, 검토 전까지 상대방에게 공개되지 않습니다.</p>
              </div>

              <div className={styles.reportGuideList}>
                <strong>신고 전 확인해 주세요</strong>
                <span>허위 신고는 서비스 이용 제한 사유가 될 수 있습니다.</span>
                <span>날짜, 모임명, 대화 내용처럼 구체적인 정황을 적으면 검토가 빨라집니다.</span>
              </div>

              <div className={styles.reasonChoiceGrid} role="group" aria-label="신고 사유 선택">
                {REPORT_REASON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      reportReason === option.value
                        ? styles.reasonChoiceActive
                        : styles.reasonChoiceButton
                    }
                    onClick={() => {
                      setReportReason(option.value);
                      setReportError("");
                    }}
                  >
                    <strong>[{option.label}]</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>

              <p className={styles.reportGuide}>
                이 유저(<strong>{user.nickname}</strong>)에게 비매너, 노쇼 또는 부적절한 행위가 있었나요?<br />신속히 확인하여 조치하겠습니다.
              </p>
              
              <div className={styles.formField}>
                <label htmlFor="reportReasonSelect">신고 분류</label>
                <select
                  id="reportReasonSelect"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                >
                  <option value="">신고 사유를 선택해 주세요</option>
                  {REPORT_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.hint}
                    </option>
                  ))}
                  {false && (
                    <>
                  <option value="">사유를 선택해 주세요</option>
                  <option value="NOSHOW">무단 노쇼 (모임 불참)</option>
                  <option value="ABUSE">폭언 / 욕설 / 비매너 행동</option>
                  <option value="SPAM">상업적 홍보 및 종교 포교 활동</option>
                  <option value="FRAUD">허위 프로필 및 사칭</option>
                  <option value="OTHER">기타 직접 입력</option>
                    </>
                  )}
                </select>
              </div>

              {reportReason === "OTHER" && (
                <div className={styles.formField}>
                  <label htmlFor="customReasonInput">직접 입력 (최대 30자)</label>
                  <input
                    type="text"
                    id="customReasonInput"
                    className={styles.customReasonInput}
                    placeholder="신고 사유를 직접 입력해 주세요."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    maxLength={30}
                    required
                  />
                  {customReason.trim() ? (
                    <div className={styles.customReasonPreview}>
                      <span>관리자 화면 강조 표시</span>
                      <strong>[기타] {customReason.trim()}</strong>
                    </div>
                  ) : null}
                </div>
              )}

              <div className={styles.formField}>
                <label htmlFor="reportDetailText">상세 내용 (선택)</label>
                <textarea
                  id="reportDetailText"
                  placeholder="신고 사유에 대한 상세한 정황이나 상황을 묘사해 주시면 검토에 큰 도움이 됩니다."
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  maxLength={300}
                  required
                />
                <div className={styles.reportMetaRow}>
                  <span>최소 10자 이상 입력</span>
                  <span>{reportDetail.trim().length}/300</span>
                </div>
              </div>

              {reportError ? (
                <p className={styles.reportError} role="alert">
                  {reportError}
                </p>
              ) : null}

              <div className={styles.reportActions}>
                <button
                  type="button"
                  className={styles.cancelReportButton}
                  onClick={() => setIsReporting(false)}
                  disabled={isReportSubmitting}
                >
                  이전으로
                </button>
                <button
                  type="submit"
                  className={styles.submitReportButton}
                  disabled={isReportSubmitting}
                >
                  {isReportSubmitting ? "접수 중..." : "신고 접수"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 모달 푸터 (신고 중이 아닐 때만 렌더링) */}
        {!isReporting && (
          <div className={styles.modalFooter}>
            {!isMe ? (
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.directChatButton}
                  onClick={handleDirectChatClick}
                >
                  1:1 대화
                </button>
                <button
                  type="button"
                  className={styles.reportTriggerButton}
                  onClick={() => {
                    if (!loginUser || !loginUser.memberId) {
                      alert("로그인이 필요한 기능입니다. 로그인 후 이용해주세요.");
                      return;
                    }
                    setIsReporting(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  신고하기
                </button>
              </div>
            ) : (
              <span className={styles.myProfileTag}>나의 프로필 카드</span>
            )}
            <button type="button" className={styles.closeFooterButton} onClick={onClose}>
              닫기
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
