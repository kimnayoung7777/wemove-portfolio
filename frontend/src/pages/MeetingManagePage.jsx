import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import defaultUserImage from "../assets/image/Default-user.png";
import AppModal from "../components/AppModal";
import UserProfileDetailModal from "../components/UserProfileDetailModal";
import { getMeeting, updateMeetingStatus } from "../api/meetingApi";
import {
  approveParticipant,
  getParticipants,
  rejectParticipant,
  cancelApproval,
} from "../api/participantApi";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/MeetingManagePage.module.css";

export default function MeetingManagePage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const alertShown = useRef(false);
  const { user, loading: authLoading } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  
  const [hostMember, setHostMember] = useState(null);
  const [selectedUserProfileUser, setSelectedUserProfileUser] = useState(null);

  const fetchData = async () => {
    try {
      const [meetingRes, participantsRes] = await Promise.all([
        getMeeting(meetingId),
        getParticipants(meetingId),
      ]);
      console.log("[DEBUG] Fetched participants list:", participantsRes.data);

      const meetingData = meetingRes.data;

      // 1. 모임 데이터가 없거나 잘못된 URL일 경우 (가장 먼저 검증)
      if (!meetingData || Object.keys(meetingData).length === 0) {
        if (!alertShown.current) {
          alertShown.current = true;
          alert("존재하지 않는 모임입니다.");
          navigate("/", { replace: true });
        }
        return;
      }

      // 2. 비로그인 상태이거나, 로그인 유저가 이 모임의 호스트가 아니라면 경고 후 상세로 리다이렉션
      if (!user || user.nickname !== meetingData.hostNickname) {
        if (!alertShown.current) {
          alertShown.current = true;
          alert("이 모임의 관리자(호스트)만 접근할 수 있는 페이지입니다.");
          navigate(`/meetings/${meetingId}`, { replace: true });
        }
        return;
      }

      // 3. 호스트이긴 하지만 모임이 이미 진행 중이거나 완료된 경우
      if (meetingData.status === "ONGOING" || meetingData.status === "COMPLETED") {
        if (!alertShown.current) {
          alertShown.current = true;
          const statusMessage = meetingData.status === "ONGOING" 
                              ? "진행중인 모임입니다." 
                              : "완료된 모임입니다.";
          alert(statusMessage);
          navigate(`/meetings/${meetingId}`, { replace: true });
        }
        return;
      }

      setMeeting(meetingData);
      const allParticipants = participantsRes.data || [];
      const pureGuests = allParticipants.filter((p) => Number(p.userId) !== Number(meetingData.hostUserId));
      setParticipants(pureGuests);

      // 호스트 프로필 정보 세팅 (참가 신청 모달 연동을 위해 상세 쿼리 조립 대조)
      const host = allParticipants.find((p) => Number(p.userId) === Number(meetingData.hostUserId));
      setHostMember(host || {
        userId: meetingData.hostUserId,
        nickname: meetingData.hostNickname,
        profileImage: meetingData.hostProfileImage,
        createdAt: meetingData.hostCreatedAt,
        sports: meetingData.hostSports,
        gender: null,
        birthYear: null,
        regionName: meetingData.regionName
      });
    } catch (error) {
      console.error("Failed to fetch manage data:", error);
      if (!alertShown.current) {
        alertShown.current = true;
        alert("존재하지 않는 모임입니다.");
        navigate("/", { replace: true });
      }
    }
  };

  useEffect(() => {
    if (authLoading) return; // 세션 정보가 복원되는 중(로딩)일 때는 검증 및 데이터 조회 일시 유예

    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, [meetingId, user, authLoading]);

  const closeModal = () => setActionModal(null);

  const handleConfirm = async () => {
    if (!actionModal) return;

    try {
      if (actionModal.type === "approve") {
        await approveParticipant(actionModal.applicant.participantId);
      } else if (actionModal.type === "reject") {
        await rejectParticipant(actionModal.applicant.participantId);
      } else if (actionModal.type === "close") {
        await updateMeetingStatus(meetingId, { status: "CLOSED" });
      } else if (actionModal.type === "complete") {
        await updateMeetingStatus(meetingId, { status: "COMPLETED" });
      } else if (actionModal.type === "cancelApproval") {
        await cancelApproval(actionModal.applicant.participantId);
      } else if (actionModal.type === "reopen") {
        // 대안 A: 최대 정원과 현재 승인 완료 인원 대조 검증
        if (meeting.approvedCount >= meeting.maxMembers) {
          closeModal();
          return;
        }
        await updateMeetingStatus(meetingId, { status: "RECRUITING" });
      }

      // 성공 시 데이터 새로고침 및 모달 닫기
      await fetchData();
      closeModal();
    } catch (error) {
      console.error("[DEBUG] Action failed - Full Error Details:", error);
      if (error.response) {
        console.error("[DEBUG] Server Response Status:", error.response.status);
        console.error("[DEBUG] Server Response Data:", error.response.data);
      }
      alert("요청 처리에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const pendingApplicants = participants.filter((p) => p.status === "PENDING");
  const approvedApplicants = participants.filter((p) => p.status === "APPROVED");
  const totalActiveApplicants = participants.filter((p) => p.status === "PENDING" || p.status === "APPROVED");

  const isClosed =
    meeting &&
    (meeting.status === "CLOSED" ||
      meeting.status === "ONGOING" ||
      meeting.status === "COMPLETED" ||
      meeting.status === "CANCELLED");

  const isFinished =
    meeting &&
    (meeting.status === "ONGOING" ||
      meeting.status === "COMPLETED" ||
      meeting.status === "CANCELLED");

  const modalCopy =
    {
      reject: {
        eyebrow: "신청 거절",
        title: `${actionModal?.applicant?.nickname ?? ""}님을 거절할까요?`,
        description:
          "거절하면 해당 사용자는 이 모임에 다시 신청할 수 없게 됩니다.",
        confirmText: "거절 처리",
        tone: "danger",
      },
      approve: {
        eyebrow: "참가 승인",
        title: `${actionModal?.applicant?.nickname ?? ""}님을 승인할까요?`,
        description: "승인하면 참가자 목록에 추가되고 모임 정원에 반영됩니다.",
        confirmText: "승인하기",
      },
      close: {
        eyebrow: "모집 완료",
        title: "이 모임을 모집완료로 바꿀까요?",
        description: "모집완료로 바꾸면 신규 참가 신청 버튼이 비활성화됩니다.",
        confirmText: "모집완료 처리",
        tone: "danger",
      },
      cancelApproval: {
        eyebrow: "승인 취소",
        title: `${actionModal?.applicant?.nickname ?? ""}님의 승인을 취소할까요?`,
        description: "승인을 취소하면 해당 신청자는 다시 승인 대기 상태로 이동합니다.",
        confirmText: "승인 취소",
        tone: "danger",
      },
      complete: {
        eyebrow: "모임 완료",
        title: "이 모임을 완료 상태로 변경할까요?",
        description: "모임을 완료하면 더 이상 참가자 승인/거절 상태를 변경할 수 없으며, 모임이 최종 종료됩니다.",
        confirmText: "모임 완료",
        tone: "success",
      },
      reopen: (meeting?.approvedCount ?? 0) >= (meeting?.maxMembers ?? 0)
        ? {
            eyebrow: "모집 재개 불가",
            title: "모집을 재개할 수 없습니다",
            description: `현재 확정 인원(${meeting?.approvedCount ?? 0}명)이 최대 정원(${meeting?.maxMembers ?? 0}명)에 도달하여 모집을 재개할 수 없습니다.\n추가 신청을 받으려면 승인된 참가자를 취소하여 자리를 확보하거나 모임 정원을 늘려주세요.`,
            confirmText: "확인",
            tone: "danger",
            hideCancel: true,
          }
        : {
            eyebrow: "모집 재개",
            title: "이 모임의 모집을 재개할까요?",
            description: "모집을 재개하면 신규 참가 신청자들이 다시 신청을 보낼 수 있게 됩니다.",
            confirmText: "모집 재개",
          },
    }[actionModal?.type] ?? {};

  if (loading) return <div className={styles.page}>로딩 중...</div>;
  if (!meeting) return <div className={styles.page}>모임을 찾을 수 없습니다.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div>
          <h1>신청자 관리</h1>
          <p>
            {meeting.title}에 참가 신청한 사람들을 확인하고 승인, 거절, 마감
            처리를 한 화면에서 관리하세요.
          </p>
        </div>
      </div>

      <section className={styles.statGrid}>
        <article>
          <span>전체 신청</span>
          <strong>{totalActiveApplicants.length}</strong>
        </article>
        <article>
          <span>확정 인원</span>
          <strong>{meeting.approvedCount}</strong>
        </article>
        <article>
          <span>대기 인원</span>
          <strong>{pendingApplicants.length}</strong>
        </article>
        <article>
          <span>최대 인원</span>
          <strong>{meeting.maxMembers}</strong>
        </article>
      </section>

      <div className={styles.subGrid}>
        <section className={styles.softPanel}>
          <h2>승인 대기</h2>
          <p>
            참가 메시지와 기본 정보를 보고 바로 승인하거나 거절할 수 있습니다.
          </p>
          <div className={styles.participantList}>
            {pendingApplicants.length === 0 ? (
              <div className={styles.emptyState}>대기 중인 신청자가 없습니다.</div>
            ) : (
              pendingApplicants.map((item) => (
                <article key={item.participantId} className={styles.participantCard}>
                  <div className={styles.participantHead}>
                    <div className={styles.participantMeta}>
                      <div className={styles.clickableName} onClick={() => setSelectedUserProfileUser(item)}>
                        <img
                          src={item.profileImage || defaultUserImage}
                          alt={item.nickname}
                          className={styles.cardAvatar}
                          onError={(e) => {
                            e.currentTarget.src = defaultUserImage;
                          }}
                        />
                        <strong>{item.nickname}</strong>
                      </div>
                      <p>{item.message || "참가 메시지가 없습니다."}</p>
                    </div>
                    <span className={styles.badge}>대기중</span>
                  </div>
                  <div className={styles.participantActions}>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      disabled={isClosed}
                      onClick={() =>
                        setActionModal({ type: "reject", applicant: item })
                      }
                    >
                      거절
                    </button>
                    <button
                      type="button"
                      className={styles.approveBtn}
                      disabled={isClosed}
                      onClick={() =>
                        setActionModal({ type: "approve", applicant: item })
                      }
                    >
                      승인
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.softPanel}>
          <h2>승인된 참가자</h2>
          <p>
            현재 승인된 멤버를 보고 마감 여부를 결정하거나 세부 관리를 이어갈 수
            있습니다.
          </p>
          <div className={styles.participantList}>
            {/* 모임장(호스트) 카드 상시 고정 노출 (게스트 카드와 크기 일체화) */}
            <article className={`${styles.participantCard} ${styles.hostCard}`}>
              <div className={styles.participantHead}>
                <div className={styles.participantMeta}>
                  <div className={styles.clickableName} onClick={() => setSelectedUserProfileUser(hostMember)}>
                    <img
                      src={meeting.hostProfileImage || defaultUserImage}
                      alt={meeting.hostNickname}
                      className={styles.cardAvatar}
                      onError={(e) => {
                        e.currentTarget.src = defaultUserImage;
                      }}
                    />
                    <strong className={styles.hostNickname}>
                      {meeting.hostNickname}
                    </strong>
                  </div>
                  <p>모임을 개설한 호스트입니다.</p>
                </div>
                <span className={`${styles.reviewScore} ${styles.hostBadge}`}>
                  <svg
                    className={styles.hostCrownIcon}
                    viewBox="0 0 24 24"
                  >
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z" />
                  </svg>
                  모임장
                </span>
              </div>
              {/* 다른 카드들과 세로 크기(높이)를 완벽하게 일치시키기 위한 투명 가상 액션 블록 */}
              <div className={`${styles.participantActions} ${styles.hiddenActions}`}>
                <button type="button" className={styles.cancelBtn}>승인 취소</button>
              </div>
            </article>

            {approvedApplicants.map((item) => (
              <article key={item.participantId} className={styles.participantCard}>
                <div className={styles.participantHead}>
                  <div className={styles.participantMeta}>
                    <div className={styles.clickableName} onClick={() => setSelectedUserProfileUser(item)}>
                      <img
                        src={item.profileImage || defaultUserImage}
                        alt={item.nickname}
                        className={styles.cardAvatar}
                        onError={(e) => {
                          e.currentTarget.src = defaultUserImage;
                        }}
                      />
                      <strong>{item.nickname}</strong>
                    </div>
                    <p>{item.message || "참가 메시지가 없습니다."}</p>
                  </div>
                  <span className={styles.reviewScore}>승인 완료</span>
                </div>
                <div className={styles.participantActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    disabled={isFinished}
                    onClick={() =>
                      setActionModal({ type: "cancelApproval", applicant: item })
                    }
                  >
                    승인 취소
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.formActions}>
            <Link to={`/meetings/${meetingId}`}>상세로 돌아가기</Link>
            {meeting.status === "CLOSED" ? (
              <button
                type="button"
                className={styles.approveBtn}
                onClick={() => setActionModal({ type: "reopen" })}
              >
                모집 재개
              </button>
            ) : meeting.status === "ONGOING" ? (
              <button
                type="button"
                className={styles.approveBtn}
                onClick={() => setActionModal({ type: "complete" })}
              >
                모임 완료 처리
              </button>
            ) : meeting.status === "COMPLETED" || meeting.status === "CANCELLED" ? (
              <button
                type="button"
                disabled
              >
                모집 완료
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActionModal({ type: "close" })}
              >
                모집완료 처리
              </button>
            )}
          </div>
        </section>
      </div>

      <AppModal
        open={Boolean(actionModal)}
        eyebrow={modalCopy.eyebrow}
        title={modalCopy.title}
        description={modalCopy.description}
        confirmText={modalCopy.confirmText}
        tone={modalCopy.tone}
        hideCancel={modalCopy.hideCancel}
        onClose={closeModal}
        onConfirm={handleConfirm}
      >
        {actionModal?.applicant ? (
          <div className={styles.applicantModalCard}>
            <img
              src={actionModal.applicant.profileImage || defaultUserImage}
              alt={actionModal.applicant.nickname}
              className={styles.applicantAvatar}
              onError={(e) => {
                e.currentTarget.src = defaultUserImage;
              }}
            />
            <div>
              <strong>{actionModal.applicant.nickname}</strong>
              <p>{actionModal.applicant.message || "참가 메시지가 없습니다."}</p>
            </div>
          </div>
        ) : (
          <div className={styles.applicantModalCard}>
            <div className={styles.applicantAvatar}>
              {actionModal?.type === "reopen" ? "재" : "마"}
            </div>
            <div>
              <strong>{meeting.title}</strong>
              <p>
                현재 확정 인원 {meeting.approvedCount}명, 대기 인원{" "}
                {pendingApplicants.length}명입니다.
              </p>
            </div>
          </div>
        )}
      </AppModal>

      {/* 👥 공통 유저 상세 프로필 모달 */}
      <UserProfileDetailModal
        open={Boolean(selectedUserProfileUser)}
        onClose={() => setSelectedUserProfileUser(null)}
        user={selectedUserProfileUser}
        loginUser={user}
      />
    </div>
  );
}
