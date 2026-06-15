import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppModal from "../components/AppModal";
import UiIcon from "../components/UiIcon";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getMeeting, recordMeetingView } from "../api/meetingApi";
import {
  applyMeeting,
  cancelParticipant,
  getParticipants,
} from "../api/participantApi";
import { getRegions } from "../api/regionApi";
import { getMyActivity } from "../api/memberApi";
import bg1 from "../assets/image/bg1.jpg";
import { meetingImages } from "../data/dashboardData";
import defaultUserImage from "../assets/image/Default-user.png";
import UserProfileDetailModal from "../components/UserProfileDetailModal";
import { copyMeetingShareUrl } from "../utils/shareLink";
import styles from "../styles/MeetingDetailPage.module.css";
import Comment from "../components/Comment.jsx";

const STATUS_MAP = {
  OPEN: "모집중",
  RECRUITING: "모집중",
  CLOSED: "모집완료",
  ONGOING: "진행중",
  COMPLETED: "모임 완료",
  CANCELLED: "취소됨",
};

const MEETING_TYPE_MAP = {
  ONETIME: "1회성 모임",
  REGULAR: "정기 모임",
};

const cx = (...names) =>
  names
    .filter(Boolean)
    .map((name) => styles[name])
    .join(" ");

const formatJoinDate = (dateStr) => {
  if (!dateStr) return "2026.03";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split(/[-T.]/);
      if (parts.length >= 2) {
        return `${parts[0]}.${parts[1]}`;
      }
      return "2026.03";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}.${month}`;
  } catch (e) {
    return "2026.03";
  }
};

const pad2 = (value) => String(value).padStart(2, "0");

const intersectsCalendarDate = (item, targetDate) => {
  if (!item?.meetingDate || !item?.startTime || !targetDate) return false;

  const dayStart = new Date(`${targetDate}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const start = new Date(
    `${item.meetingDate}T${String(item.startTime).slice(0, 5)}:00`,
  );
  const rawEndTime = String(item.endTime || "").slice(0, 5);
  const end = new Date(start);
  if (rawEndTime) {
    const [hour, minute] = rawEndTime.split(":").map(Number);
    end.setHours(hour, minute, 0, 0);
    if (rawEndTime <= String(item.startTime).slice(0, 5)) {
      end.setDate(end.getDate() + 1);
    }
  } else {
    end.setHours(end.getHours() + 2);
  }

  return start < dayEnd && end > dayStart;
};

const buildViewStorageKey = (meetingId, viewerKey = "guest") => {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate(),
  )}`;
  return `wemove:view:${viewerKey}:${meetingId}:${today}`;
};

export default function MeetingDetailPage() {
  const [comments, setComments] = useState([]);
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const alertShown = useRef(false);
  const { user, isAuthenticated } = useAuth();
  const recordedViewKeysRef = useRef(new Set());

  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isApplied, setIsApplied] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [appliedParticipantId, setAppliedParticipantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [selectedUserProfileUser, setSelectedUserProfileUser] = useState(null);
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    getRegions()
      .then((res) => setRegions(res.data))
      .catch(console.error);
  }, []);

  const approvedParticipants = useMemo(() => {
    return participants.filter((p) => p.status === "APPROVED");
  }, [participants]);

  const sortedApprovedParticipants = useMemo(() => {
    if (!meeting || approvedParticipants.length === 0) return [];

    // 호스트를 찾기 위해 userId 및 nickname 모두 검사하여 가장 매끄럽게 매칭
    const hostMember = approvedParticipants.find(
      (p) =>
        Number(p.userId) === Number(meeting.hostUserId) ||
        p.nickname === meeting.meetingHostName,
    );

    const guestMembers = approvedParticipants.filter(
      (p) =>
        Number(p.userId) !== Number(meeting.hostUserId) &&
        p.nickname !== meeting.meetingHostName,
    );

    return hostMember ? [hostMember, ...guestMembers] : approvedParticipants;
  }, [meeting, approvedParticipants]);

  const previewAvatars = useMemo(() => {
    return sortedApprovedParticipants.slice(0, 3);
  }, [sortedApprovedParticipants]);

  const closeModal = () => {
    setModalType(null);
    setApplyMessage("");
  };

  const fetchMeetingDetail = async () => {
    try {
      const [meetingRes, participantsRes] = await Promise.all([
        getMeeting(meetingId),
        getParticipants(meetingId),
      ]);

      const meetingData = meetingRes.data;

      if (!meetingData || Object.keys(meetingData).length === 0) {
        if (!alertShown.current) {
          alertShown.current = true;
          alert("존재하지 않는 모임입니다.");
          navigate("/", { replace: true });
        }
        return;
      }

      setMeeting(meetingData);

      const participantsList = participantsRes.data || [];
      setParticipants(participantsList);

      const myParticipant = participantsList.find(
        (p) =>
          p.userId === user?.memberId &&
          (p.status === "PENDING" || p.status === "APPROVED"),
      );
      setIsApplied(!!myParticipant);
      setAppliedParticipantId(
        myParticipant ? myParticipant.participantId : null,
      );

      const isRejectedUser = participantsList.some(
        (p) => p.userId === user?.memberId && p.status === "REJECTED",
      );
      setIsRejected(isRejectedUser);
    } catch (error) {
      console.error("Failed to fetch meeting detail:", error);
      if (!alertShown.current) {
        alertShown.current = true;
        alert("존재하지 않는 모임입니다.");
        navigate("/", { replace: true });
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMeetingDetail();
      setLoading(false);
    };
    init();
  }, [meetingId, user]);

  useEffect(() => {
    if (!meetingId) {
      return;
    }

    const viewerKey = user?.memberId ? `member:${user.memberId}` : "guest";
    const storageKey = buildViewStorageKey(meetingId, viewerKey);
    if (
      recordedViewKeysRef.current.has(storageKey) ||
      window.sessionStorage.getItem(storageKey)
    ) {
      return;
    }

    recordedViewKeysRef.current.add(storageKey);
    window.sessionStorage.setItem(storageKey, "pending");

    recordMeetingView(meetingId)
      .then(() => {
        window.sessionStorage.setItem(storageKey, "1");
      })
      .catch((error) => {
        recordedViewKeysRef.current.delete(storageKey);
        window.sessionStorage.removeItem(storageKey);
        console.error("Failed to record meeting view:", error);
      });
  }, [meetingId, user?.memberId]);

  const handleApplyConfirm = async () => {
    try {
      await applyMeeting(meetingId, {
        userId: user?.memberId,
        message: applyMessage || "참가 신청합니다.",
      });
      closeModal();
      alert("참가 신청이 성공적으로 완료되었습니다!");
      await fetchMeetingDetail();
    } catch (error) {
      console.error("Failed to apply meeting:", error);
      const serverMsg = error.response?.data?.message;
      if (
        serverMsg &&
        (serverMsg.includes("거절") || serverMsg.includes("REJECTED"))
      ) {
        alert("모임 참가에 거절 당해 신청하실 수 없습니다.");
      } else if (serverMsg) {
        alert(serverMsg);
      } else {
        alert("참가 신청에 실패했습니다.");
      }
    }
  };

  const handleCancelConfirm = async () => {
    if (!appliedParticipantId) return;
    try {
      await cancelParticipant(appliedParticipantId);
      closeModal();
      alert("참가 신청 취소가 완료되었습니다.");
      await fetchMeetingDetail();
    } catch (error) {
      console.error("Failed to cancel participant:", error);
      alert("참가 취소에 실패했습니다.");
    }
  };

  if (loading) return <div className={styles.page}>로딩 중...</div>;
  if (!meeting)
    return <div className={styles.page}>모임을 찾을 수 없습니다.</div>;

  const getHostSportsText = () => {
    return meeting.hostSports && meeting.hostSports.trim()
      ? meeting.hostSports.trim()
      : "운동 관심 유저";
  };

  const getHostJoinDateText = () => {
    const joinDate = formatJoinDate(meeting.hostCreatedAt);
    return `가입일 ${joinDate}`;
  };

  const isClosed =
    meeting.status === "CLOSED" ||
    meeting.status === "ONGOING" ||
    meeting.status === "COMPLETED";
  const isAdmin = isAuthenticated && user && user.role === "ADMIN";
  const isHost =
    isAuthenticated && user && user.nickname === meeting.meetingHostName;

  const handleApplyClick = async () => {
    if (!isAuthenticated) {
      setModalType("loginRequired");
      return;
    }
    if (!isClosed && !isAdmin) {
      try {
        const response = await getMyActivity(user.memberId);
        const payload = response.data || {};
        const sameDayMeetings = [
          ...(payload.hostedMeetings || []),
          ...(payload.approvedMeetings || []),
          ...(payload.pendingMeetings || []),
        ]
          .filter(
            (item) =>
              intersectsCalendarDate(item, meeting.meetingDate) &&
              Number(item.meetingId) !== Number(meetingId) &&
              !["CANCELLED", "COMPLETED"].includes(item.status),
          )
          .filter(
            (item, index, array) =>
              array.findIndex(
                (candidate) =>
                  Number(candidate.meetingId) === Number(item.meetingId),
              ) === index,
          );

        if (sameDayMeetings.length > 0) {
          const scheduleText = sameDayMeetings
            .slice(0, 3)
            .map((item) => {
              const start = String(item.startTime || "").slice(0, 5);
              const end = String(item.endTime || "").slice(0, 5);
              const nextDay = end && end < start ? "다음 날 " : "";
              return `${item.title} (${start}${end ? ` ~ ${nextDay}${end}` : ""})`;
            })
            .join("\n");
          alert(
            `선택한 날짜에 이미 일정이 있습니다.\n\n${scheduleText}\n\n시간이 겹치면 참가 신청이 제한됩니다.`,
          );
        }
      } catch (error) {
        console.error("Failed to check same-day meetings:", error);
      }

      const userRegion = regions.find((r) => r.regionId === user?.regionId);
      const meetingParts = meeting.regionName
        ? meeting.regionName.split(" ")
        : [];
      const meetingSido = meetingParts[0] || "";
      const meetingSigungu = meetingParts[1] || "";

      if (
        userRegion &&
        (userRegion.sido !== meetingSido ||
          userRegion.sigungu !== meetingSigungu)
      ) {
        setModalType("regionWarning");
      } else {
        setModalType("apply");
      }
    }
  };

  const handleShareMeeting = async () => {
    try {
      const meetingUrl = await copyMeetingShareUrl(meetingId);
      toast.success("링크가 복사되었습니다.", meetingUrl, {
        sourceId: `share-meeting-${meetingId}`,
      });
    } catch (error) {
      toast.error(
        "링크 복사 실패",
        "브라우저에서 복사를 허용하지 않았습니다. 다시 시도해주세요.",
        { sourceId: `share-meeting-${meetingId}` },
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.detailLayout}>
        <main className={styles.detailMain}>
          <section className={styles.detailHero}>
            <div className={styles.detailHeroImageWrap}>
              <img
                src={
                  meeting.thumbnailImage ||
                  meetingImages[meeting.meetingId] ||
                  bg1
                }
                alt={meeting.title}
                className={styles.detailHeroImage}
                onError={(e) => {
                  e.currentTarget.src = bg1;
                }}
              />
            </div>
            <div className={styles.detailCover}>
              <div className={styles.detailBadges}>
                <span className={styles.badge}>{meeting.sportName}</span>
                <span
                  className={cx(
                    "badge",
                    meeting.status === "CLOSED" ? "warning" : "success",
                  )}
                >
                  {STATUS_MAP[meeting.status] || "모집중"}
                </span>
              </div>
              <h1>{meeting.title}</h1>
              <p className={styles.detailSubtitle}>{meeting.content}</p>
            </div>

            <div className={styles.detailSummary}>
              <article>
                <span>지역</span>
                <strong>{meeting.regionName}</strong>
              </article>
              <article>
                <span>상세 주소</span>
                <strong>{meeting.address}</strong>
              </article>
              <article>
                <span>일시</span>
                <strong>
                  {meeting.meetingDate}{" "}
                  {meeting.startTime
                    ? String(meeting.startTime).slice(0, 5)
                    : ""}
                  {meeting.endTime
                    ? ` ~ ${
                        String(meeting.endTime).slice(0, 5) <
                        String(meeting.startTime || "").slice(0, 5)
                          ? "다음 날 "
                          : ""
                      }${String(meeting.endTime).slice(0, 5)}`
                    : ""}
                </strong>
              </article>
              <article>
                <span>참가 인원</span>
                <strong>
                  {meeting.approvedCount || 1}/{meeting.maxMembers}명
                </strong>
              </article>
            </div>
          </section>

          <section className={styles.detailSection}>
            <div className={styles.sectionHead}>
              <div>
                <h2>모임 소개</h2>
                <p>참여 전에 꼭 확인하면 좋은 모임 정보입니다.</p>
              </div>
            </div>
            <div className={styles.detailBody}>
              <p>{meeting.guideText || "시작 10분 전 집결 권장"}</p>
              <div className={styles.detailDivider} />
              <ul className={styles.detailChecklist}>
                <li>
                  <strong className={styles.checkLabel}>만나는 장소</strong>
                  <span className={styles.checkValue}>{meeting.placeName}</span>
                </li>
                <li>
                  <strong className={styles.checkLabel}>준비물</strong>
                  <span className={styles.checkValue}>
                    {meeting.supplies || "편한 운동복, 물, 개인 이어폰"}
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section className={styles.detailSection}>
            <div className={styles.sectionHead}>
              <div>
                <h2>댓글({comments.length})</h2>
                <p>참여 전 궁금한 점을 편하게 남겨보세요.</p>
              </div>
            </div>
            <Comment
              comments={comments}
              setComments={setComments}
              meetingId={meetingId}
              hostUserId={meeting.hostUserId}
            />
          </section>
        </main>

        <aside className={styles.detailSidebar}>
          <section className={styles.detailPanel}>
            <h3>모임장 정보</h3>
            <div className={styles.hostCard}>
              <img
                src={meeting.hostProfileImage || defaultUserImage}
                alt={meeting.meetingHostName}
                className={styles.profileAvatar}
                onError={(e) => {
                  e.currentTarget.src = defaultUserImage;
                }}
              />
              <div>
                <strong>{meeting.meetingHostName || "익명"}</strong>
                <p className={styles.hostSportsText}>{getHostSportsText()}</p>
                <p className={styles.hostJoinDateText}>
                  {getHostJoinDateText()}
                </p>
              </div>
            </div>
            <div className={styles.sideInfo}>
              <p>
                <span>모집 상태</span>
                <b>{STATUS_MAP[meeting.status] || "모집중"}</b>
              </p>

              <p>
                <span>최대 인원</span>
                <b>{meeting.maxMembers}명</b>
              </p>

              {/* 👥 현재 참가자 아코디언 드롭다운 트리거 카드 */}
              <div
                className={cx("participantToggle", isAccordionOpen && "open")}
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              >
                <div className={styles.participantLabelGroup}>
                  <strong className={styles.participantLabelTitle}>
                    현재 참가자
                  </strong>
                  <span className={styles.participantLabelSub}>
                    클릭하여 멤버 확인
                  </span>
                </div>
                <div className={styles.participantActionGroup}>
                  {/* 겹쳐진 아바타 그룹 */}
                  <div className={styles.avatarGroup}>
                    {previewAvatars.map((item) => (
                      <img
                        key={item.participantId || item.userId}
                        src={item.profileImage || defaultUserImage}
                        alt={item.nickname}
                        className={styles.miniAvatar}
                        onError={(e) => {
                          e.currentTarget.src = defaultUserImage;
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.participantCountText}>
                    {approvedParticipants.length}명
                  </span>
                  <svg
                    className={cx("chevronIcon", isAccordionOpen && "open")}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* 👥 아코디언 참가자 리스트 패널 */}
              <div className={cx("accordionPanel", isAccordionOpen && "open")}>
                <div className={styles.accordionList}>
                  {sortedApprovedParticipants.map((item) => {
                    const isUserHost =
                      Number(item.userId) === Number(meeting.hostUserId) ||
                      item.nickname === meeting.meetingHostName;

                    return (
                      <div
                        key={item.participantId || item.userId}
                        className={styles.accordionItem}
                        onClick={() => setSelectedUserProfileUser(item)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className={styles.accordionUserWrap}>
                          <img
                            src={item.profileImage || defaultUserImage}
                            alt={item.nickname}
                            className={styles.accordionAvatar}
                            onError={(e) => {
                              e.target.src = defaultUserImage;
                            }}
                          />
                          <span className={styles.accordionNickname}>
                            {item.nickname}
                          </span>
                        </div>
                        {isUserHost && (
                          <span className={styles.accordionHostBadge}>
                            <svg
                              className={styles.accordionHostCrown}
                              viewBox="0 0 24 24"
                            >
                              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z" />
                            </svg>
                            모임장
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {/* 5명 초과 시 페이드아웃 효과 데코레이션 */}
                  {sortedApprovedParticipants.length > 5 && (
                    <div className={styles.fadeEffect} />
                  )}
                </div>
              </div>
            </div>
            <div className={styles.stickyActions}>
              <button
                type="button"
                className={styles.shareButton}
                onClick={handleShareMeeting}
              >
                <UiIcon name="share" className={styles.shareButtonIcon} />
                공유하기
              </button>

              {meeting.status === "ONGOING" ||
              meeting.status === "COMPLETED" ||
              meeting.status === "CANCELLED" ? (
                <button type="button" className={styles.primaryButton} disabled>
                  {meeting.status === "ONGOING"
                    ? "진행중"
                    : meeting.status === "COMPLETED"
                      ? "모임 완료"
                      : "취소됨"}
                </button>
              ) : (
                <>
                  {isHost ? (
                    <>
                      <Link
                        to={`/meetings/${meetingId}/edit`}
                        className={styles.primaryButton}
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        모임 수정
                      </Link>
                      <Link
                        to={`/meetings/${meetingId}/manage`}
                        className={styles.secondaryButton}
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        신청자 관리
                      </Link>
                    </>
                  ) : (
                    <>
                      {!isApplied && (
                        <>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            disabled={
                              meeting.status === "CLOSED" ||
                              isAdmin ||
                              isRejected
                            }
                            onClick={handleApplyClick}
                          >
                            {isAdmin
                              ? "관리자 계정은 신청할 수 없습니다"
                              : isRejected
                                ? "신청 불가"
                                : meeting.status === "CLOSED"
                                  ? "모집완료"
                                  : "참가 신청"}
                          </button>
                          {isRejected && (
                            <p
                              style={{
                                margin: 0,
                                color: "#ef4444",
                                fontSize: "0.85rem",
                                marginTop: "8px",
                                fontWeight: "700",
                                lineHeight: "1.4",
                                wordBreak: "keep-all",
                              }}
                            >
                              * 신청이 거절되어 재신청이 불가능한 모임입니다.
                            </p>
                          )}
                        </>
                      )}

                      {!isAdmin && isApplied && (
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setModalType("cancel")}
                        >
                          신청 취소
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {isAdmin && (
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "0.95rem",
                    marginTop: "8px",
                  }}
                >
                  관리자는 모임 상세 조회만 가능하며 참가 신청은 할 수 없습니다.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <AppModal
        open={modalType === "apply"}
        eyebrow="참가 신청"
        title="이 모임에 참가 신청할까요?"
        description="신청 전에 일정과 준비물을 한 번 더 확인해 주세요. 모임장이 승인하면 참여가 확정됩니다."
        confirmText="참가 신청하기"
        onClose={closeModal}
        onConfirm={handleApplyConfirm}
      >
        <div className={styles.modalMeetingCard}>
          <img
            src={
              meeting.thumbnailImage ||
              meetingImages[meeting.meetingId] ||
              bg1
            }
            alt={meeting.title}
            onError={(e) => {
              e.currentTarget.src = bg1;
            }}
          />
          <div>
            <span>
              {meeting.sportName} · {STATUS_MAP[meeting.status] || "모집중"}
            </span>
            <strong>{meeting.title}</strong>
            <p>{meeting.content}</p>
          </div>
        </div>

        <div style={{ marginTop: "20px", marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "800",
              color: "#374151",
              fontSize: "14px",
            }}
          >
            참가 신청 메시지
          </label>
          <textarea
            placeholder="모임장에게 보낼 간단한 각오나 한 줄 메시지를 적어주세요. (미입력 시 기본 문구로 전송)"
            value={applyMessage}
            onChange={(e) => setApplyMessage(e.target.value)}
            style={{
              width: "100%",
              minHeight: "72px",
              padding: "10px 14px",
              borderRadius: "14px",
              border: "1px solid rgba(148, 163, 184, 0.26)",
              background: "#fafafa",
              outline: "0",
              font: "inherit",
              resize: "none",
              lineHeight: "1.5",
            }}
          />
        </div>

        <dl className={styles.modalInfoList}>
          <div>
            <dt>일시</dt>
            <dd>
              {meeting.meetingDate}{" "}
              {meeting.startTime ? String(meeting.startTime).slice(0, 5) : ""}
              {meeting.endTime
                ? ` ~ ${
                    String(meeting.endTime).slice(0, 5) <
                    String(meeting.startTime || "").slice(0, 5)
                      ? "다음 날 "
                      : ""
                  }${String(meeting.endTime).slice(0, 5)}`
                : ""}
            </dd>
          </div>
          <div>
            <dt>만나는 장소</dt>
            <dd>{meeting.placeName}</dd>
          </div>
          <div>
            <dt>준비물</dt>
            <dd>{meeting.supplies || "편한 운동복, 물, 개인 이어폰"}</dd>
          </div>
        </dl>
      </AppModal>

      <AppModal
        open={modalType === "loginRequired"}
        eyebrow="안내"
        title="로그인이 필요합니다"
        description="모임에 참가 신청하려면 먼저 로그인을 완료해야 합니다. 로그인 페이지로 이동하시겠습니까?"
        confirmText="로그인하러 가기"
        onClose={closeModal}
        onConfirm={() => {
          closeModal();
          navigate("/login");
        }}
      />

      <AppModal
        open={modalType === "regionWarning"}
        eyebrow="안내"
        title="설정하신 지역과 거리가 먼 모임입니다"
        description="현재 신청하려는 모임이 사용자의 지역과 다릅니다. 그럼에도 참가 신청하시겠습니까?"
        confirmText="신청하기"
        cancelText="취소"
        onClose={closeModal}
        onConfirm={() => {
          setModalType("apply");
        }}
      />

      <AppModal
        open={modalType === "cancel"}
        eyebrow="신청 취소"
        title="참가 신청을 취소할까요?"
        description="취소하면 다시 신청해야 하며, 모임장에게 신청 취소 상태로 표시됩니다."
        confirmText="신청 취소하기"
        tone="danger"
        onClose={closeModal}
        onConfirm={handleCancelConfirm}
      >
        <div className={styles.modalNotice}>
          <strong>{meeting.title}</strong>
          <p>
            이미 승인된 일정이라면 모임장에게 간단한 사유를 남기는 것이 좋아요.
          </p>
        </div>
      </AppModal>

      {/* 👥 공통 유저 상세 프로필 모달 (아코디언 멤버 클릭 시) */}
      <UserProfileDetailModal
        open={Boolean(selectedUserProfileUser)}
        onClose={() => setSelectedUserProfileUser(null)}
        user={selectedUserProfileUser}
        loginUser={user}
      />
    </div>
  );
}
