import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppModal from "../components/AppModal";
import DashboardShell from "../components/DashboardShell";
import UiIcon from "../components/UiIcon";
import { getMyActivity } from "../api/memberApi";
import { updateMeetingStatus } from "../api/meetingApi";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import useSidebarInterestItems from "../hooks/useSidebarInterestItems";
import { getMeetingThumbnail } from "../utils/meetingVisuals";
import styles from "../styles/ActivityPage.module.css";

const normalizeText = (value = "") => String(value).trim();
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const formatMeetingDateTime = (meeting) => {
  const date = meeting.meetingDate
    ? String(meeting.meetingDate).slice(5).replaceAll("-", ".")
    : meeting.displayDate || "-";
  const time = meeting.startTime
    ? String(meeting.startTime).slice(0, 5)
    : meeting.time || "-";
  return `${date} ${time}`;
};

const getHostName = (meeting) =>
  normalizeText(meeting.hostNickname || meeting.meetingHostName || meeting.host);

const buildRelativeText = (dateValue) => {
  if (!dateValue) return "최근";

  const today = new Date();
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) {
    return String(dateValue).slice(0, 10);
  }

  const diffMs =
    target.setHours(0, 0, 0, 0) - new Date(today.setHours(0, 0, 0, 0));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  if (diffDays > 1) return `${diffDays}일 후`;
  if (diffDays === -1) return "어제";
  return `${Math.abs(diffDays)}일 전`;
};

const getWeekdayLabel = (dateValue) => {
  if (!dateValue) return "";
  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return DAY_LABELS[parsedDate.getDay()];
};

const getWeekEnd = (baseDate) => {
  const weekEnd = new Date(baseDate);
  weekEnd.setHours(0, 0, 0, 0);
  weekEnd.setDate(weekEnd.getDate() + ((7 - weekEnd.getDay()) % 7));
  return weekEnd;
};

const getWeekRange = (baseDate) => {
  const weekStart = new Date(baseDate);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { weekStart, weekEnd };
};

const normalizeMeeting = (meeting) => ({
  ...meeting,
  id: meeting.meetingId ?? meeting.id,
  title: meeting.title ?? "-",
  sport: meeting.sportName ?? meeting.sport ?? "-",
  place: meeting.placeName ?? meeting.place ?? "-",
  region: meeting.regionName ?? meeting.region ?? "-",
  hostName: getHostName(meeting),
  meetingDate: meeting.meetingDate ?? null,
  startTime: meeting.startTime ?? "",
  approvedCount: Number(meeting.approvedCount ?? meeting.current ?? 0),
  maxMembers: Number(meeting.maxMembers ?? meeting.max ?? 0),
  status: meeting.status ?? "RECRUITING",
  statusText: meeting.statusText ?? meeting.status ?? "",
  participationStatus: meeting.participationStatus ?? meeting.status ?? "",
  image: getMeetingThumbnail(meeting),
});

const isVisibleWeeklyScheduleStatus = (status) =>
  ["RECRUITING", "CLOSED", "ONGOING"].includes(status);

const getParticipationLabel = (status) => {
  switch (status) {
    case "PENDING":
      return "대기";
    case "APPROVED":
      return "예정";
    case "COMPLETED":
      return "완료";
    default:
      return "활동";
  }
};

const getHostedStatusLabel = (status) => {
  switch (status) {
    case "RECRUITING":
      return "모집중";
    case "CLOSED":
      return "모집완료";
    case "ONGOING":
      return "진행중";
    case "COMPLETED":
      return "완료";
    case "CANCELLED":
      return "취소됨";
    default:
      return "상태";
  }
};

const getToneClassByParticipation = (status) => {
  switch (status) {
    case "PENDING":
      return styles.toneWaiting;
    case "APPROVED":
      return styles.toneScheduled;
    case "COMPLETED":
      return styles.toneCompleted;
    default:
      return "";
  }
};

const getToneClassByHostedStatus = (status) => {
  switch (status) {
    case "RECRUITING":
      return styles.toneHostedRecruiting;
    case "CLOSED":
      return styles.toneHostedClosed;
    case "ONGOING":
      return styles.toneHostedOngoing;
    case "COMPLETED":
      return styles.toneHostedCompleted;
    case "CANCELLED":
      return styles.toneHostedCancelled;
    default:
      return "";
  }
};

const buildFeedItems = ({ hostedMeetings, approvedMeetings, pendingMeetings }) => {
  const feed = [
    ...hostedMeetings.slice(0, 3).map((meeting) => ({
      key: 'host-' + meeting.id,
      kindLabel: "모임 생성",
      toneClass: styles.dashboardActivityToneHosted,
      title: meeting.title,
      meta: meeting.sport + " · " + (meeting.region || "지역 미정"),
      time: buildRelativeText(meeting.createdAt || meeting.meetingDate),
    })),
    ...approvedMeetings.slice(0, 3).map((meeting) => ({
      key: 'approved-' + meeting.id,
      kindLabel: "참여 확정",
      toneClass: styles.dashboardActivityToneScheduled,
      title: meeting.title,
      meta: meeting.sport + " · " + formatMeetingDateTime(meeting),
      time: buildRelativeText(meeting.meetingDate),
    })),
    ...pendingMeetings.slice(0, 2).map((meeting) => ({
      key: 'pending-' + meeting.id,
      kindLabel: "참여 대기",
      toneClass: styles.dashboardActivityToneWaiting,
      title: meeting.title,
      meta: meeting.sport + " · " + (meeting.region || "지역 미정"),
      time: buildRelativeText(meeting.meetingDate),
    })),
  ];

  return feed.slice(0, 5);
};

const getMonthLabel = (date) =>
  `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`;

const getDateKey = (dateLike) => {
  if (!dateLike) return "";

  if (dateLike instanceof Date) {
    const year = dateLike.getFullYear();
    const month = String(dateLike.getMonth() + 1).padStart(2, "0");
    const day = String(dateLike.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(dateLike).slice(0, 10);
};

const buildCalendarDays = (monthDate, meetingsByDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const items = [];

  for (let i = 0; i < startOffset; i += 1) {
    items.push({ key: `empty-${i}`, isEmpty: true });
  }

  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = getDateKey(date);
    items.push({
      key: dateKey,
      dateKey,
      day,
      hasMeetings: meetingsByDate.has(dateKey),
    });
  }

  return items;
};

const formatCalendarStamp = (dateLike, timeLike) => {
  const base = dateLike ? new Date(dateLike) : new Date();
  const [hours = "00", minutes = "00"] = String(timeLike || "00:00")
    .slice(0, 5)
    .split(":");
  base.setHours(Number(hours), Number(minutes), 0, 0);
  return base.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

const buildGoogleCalendarUrl = (meeting) => {
  const start = formatCalendarStamp(meeting.meetingDate, meeting.startTime);
  const endDate = new Date(meeting.meetingDate || new Date());
  const [hours = "00", minutes = "00"] = String(meeting.startTime || "00:00")
    .slice(0, 5)
    .split(":");
  endDate.setHours(Number(hours), Number(minutes), 0, 0);
  endDate.setHours(endDate.getHours() + 2);
  const end = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    dates: `${start}/${end}`,
    details: `${meeting.sport} · ${meeting.region}`,
    location: `${meeting.region} ${meeting.place}`.trim(),
    sf: "true",
    output: "xml",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export default function ActivityPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();
  const sidebarInterestItems = useSidebarInterestItems();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [manageModalMeeting, setManageModalMeeting] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));
  const [activityData, setActivityData] = useState({
    hostedMeetings: [],
    approvedMeetings: [],
    pendingMeetings: [],
    completedMeetings: [],
  });

  const loadActivity = useCallback(
    async ({ showLoading = true } = {}) => {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated || !user?.nickname) {
        setActivityData({
          hostedMeetings: [],
          approvedMeetings: [],
          pendingMeetings: [],
          completedMeetings: [],
        });
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      setLoadError("");

      try {
        const response = await getMyActivity(user.memberId);
        const payload = response.data ?? {};

        setActivityData({
          hostedMeetings: Array.isArray(payload.hostedMeetings)
            ? payload.hostedMeetings.map(normalizeMeeting)
            : [],
          approvedMeetings: Array.isArray(payload.approvedMeetings)
            ? payload.approvedMeetings.map(normalizeMeeting)
            : [],
          pendingMeetings: Array.isArray(payload.pendingMeetings)
            ? payload.pendingMeetings.map(normalizeMeeting)
            : [],
          completedMeetings: Array.isArray(payload.completedMeetings)
            ? payload.completedMeetings.map(normalizeMeeting)
            : [],
        });
      } catch (error) {
        console.error(error);
        setLoadError("내 활동 정보를 불러오지 못했습니다.");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [authLoading, isAuthenticated, user?.memberId, user?.nickname],
  );

  useEffect(() => {
    if (!authLoading) {
      loadActivity();
    }
  }, [authLoading, loadActivity]);

  const activityItemsLegacy = useMemo(
    () => [
      { label: "참여 예정", value: `${activityData.approvedMeetings.length}개` },
      { label: "참여 대기", value: `${activityData.pendingMeetings.length}개` },
      { label: "내가 만든 모임", value: `${activityData.hostedMeetings.length}개` },
      { label: "참여 완료", value: `${activityData.completedMeetings.length}개` },
    ],
    [activityData],
  );

  const activityItems = useMemo(() => {
    const hostedActiveMeetings = activityData.hostedMeetings.filter(
      (meeting) => !["COMPLETED", "CANCELLED"].includes(meeting.status),
    ).length;
    const hostedCompletedMeetings = activityData.hostedMeetings.filter(
      (meeting) => meeting.status === "COMPLETED",
    ).length;

    return [
      { label: "참여 예정", value: `${activityData.approvedMeetings.length + hostedActiveMeetings}개` },
      { label: "참여 대기", value: `${activityData.pendingMeetings.length}개` },
      { label: "내가 만든 모임", value: `${activityData.hostedMeetings.length}개` },
      { label: "참여 완료", value: `${activityData.completedMeetings.length + hostedCompletedMeetings}개` },
    ];
  }, [activityData]);

  const activityFeed = useMemo(() => buildFeedItems(activityData), [activityData]);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { weekStart, weekEnd } = getWeekRange(today);

  const scheduleItems = [
    ...activityData.hostedMeetings
      .filter((meeting) => isVisibleWeeklyScheduleStatus(meeting.status))
      .map((meeting) => ({
        ...meeting,
        scheduleSource: "hosted",
      })),
    ...activityData.approvedMeetings.map((meeting) => ({
      ...meeting,
      scheduleSource: "approved",
    })),
  ]
    .filter((meeting) => {
      if (!meeting?.meetingDate) return false;
      const meetingDay = new Date(`${meeting.meetingDate}T00:00:00`);
      return (
        !Number.isNaN(meetingDay.getTime()) &&
        meetingDay >= weekStart &&
        meetingDay <= weekEnd
      );
    })
    .sort((left, right) => {
      const leftDate = `${left.meetingDate ?? ""} ${left.startTime ?? ""}`;
      const rightDate = `${right.meetingDate ?? ""} ${right.startTime ?? ""}`;
      return leftDate.localeCompare(rightDate);
    })
    .filter(
      (meeting, index, array) =>
        array.findIndex((item) => item.id === meeting.id) === index,
    )
    .slice(0, 4);

  const scheduledMeetings = activityData.approvedMeetings;
  const waitingMeetings = activityData.pendingMeetings;
  const completedMeetings = activityData.completedMeetings;
  const hostedMeetings = activityData.hostedMeetings;
  const manageAction = useMemo(() => {
    if (!manageModalMeeting) {
      return null;
    }

    if (manageModalMeeting.status === "RECRUITING") {
      return {
        type: "cancel",
        confirmText: "모임 취소"
      };
    }

    if (manageModalMeeting.status === "ONGOING") {
      return {
        type: "complete",
        confirmText: "모임 완료"
      };
    }

    return {
      type: null,
      confirmText: ""
    };
  }, [manageModalMeeting]);

  const calendarMeetings = useMemo(() => {
    const grouped = new Map();

    const appendMeeting = (meeting, origin) => {
      if (!meeting?.id || !meeting.meetingDate) {
        return;
      }

      const existing = grouped.get(meeting.id);
      const next = existing
        ? {
            ...existing,
            origin:
              existing.origin === "hosted" || origin === "hosted"
                ? "hosted"
                : existing.origin,
          }
        : { ...meeting, origin };

      grouped.set(meeting.id, next);
    };

    activityData.hostedMeetings.forEach((meeting) => appendMeeting(meeting, "hosted"));
    activityData.approvedMeetings.forEach((meeting) => appendMeeting(meeting, "approved"));
    activityData.completedMeetings.forEach((meeting) =>
      appendMeeting(meeting, "completed"),
    );

    return Array.from(grouped.values());
  }, [activityData]);

  const meetingsByDate = useMemo(() => {
    const grouped = new Map();

    calendarMeetings.forEach((meeting) => {
      const dateKey = getDateKey(meeting.meetingDate);
      if (!dateKey) {
        return;
      }

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }

      grouped.get(dateKey).push(meeting);
    });

    grouped.forEach((items) => {
      items.sort((left, right) =>
        String(left.startTime || "").localeCompare(String(right.startTime || "")),
      );
    });

    return grouped;
  }, [calendarMeetings]);

  const calendarDays = useMemo(
    () => buildCalendarDays(selectedMonth, meetingsByDate),
    [selectedMonth, meetingsByDate],
  );
  const todayKey = getDateKey(new Date());
  const selectedDateMeetings = meetingsByDate.get(selectedDateKey) ?? [];
  const selectedAgendaCalendarUrl = selectedDateMeetings.length
    ? buildGoogleCalendarUrl(selectedDateMeetings[0])
    : "";
  const selectedDateLabel = selectedDateKey
    ? selectedDateKey.replaceAll("-", ".")
    : "날짜를 선택해주세요";
  const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];

  const handleOpenManageModal = (meeting) => {
    setManageModalMeeting(meeting);
  };

  const handleCloseManageModal = () => {
    setManageModalMeeting(null);
  };

  const handleManageHostedMeeting = async () => {
    if (!manageModalMeeting) {
      return;
    }

    try {
      if (manageAction?.type === "cancel") {
        await updateMeetingStatus(manageModalMeeting.id, { status: "CANCELLED" });
        toast.success("모임을 취소했어요.", "내 활동 목록이 갱신되었습니다.");
      } else if (manageAction?.type === "complete") {
        await updateMeetingStatus(manageModalMeeting.id, { status: "COMPLETED" });
        toast.success("모임을 완료했어요.", "완료된 모임으로 이동했습니다.");
      } else {
        toast.error("상태를 바꿀 수 없어요.", "모집중 또는 진행중 상태에서만 변경할 수 있습니다.");
        return;
      }

      setManageModalMeeting(null);
      await loadActivity({ showLoading: false });
    } catch (error) {
      console.error(error);
      const message =
        error?.response?.data?.message ?? "모임 상태를 변경하지 못했습니다.";
      toast.error("상태 변경 실패", message);
    }
  };

  return (
    <DashboardShell
      active="내활동"
      title="내 활동"
      description="참여 중인 모임, 승인 대기 모임, 내가 만든 모임을 한 번에 확인할 수 있습니다."
      sidebarInterestItems={sidebarInterestItems}
      aside={
        <>
          <section className={styles.dashboardPanel}>
            <div className={styles.dashboardPanelHead}>
              <h3>이번 주 일정</h3>
            </div>
            <div className={styles.dashboardScheduleList}>
              {scheduleItems.length ? (
                scheduleItems.map((meeting) => {
                  const relativeDate = buildRelativeText(meeting.meetingDate);
                  const weekday = getWeekdayLabel(meeting.meetingDate);
                  const displayDate =
                    relativeDate.includes("일 전") || relativeDate.includes("일 후")
                      ? `${String(meeting.meetingDate).slice(5).replace("-", ".")}${weekday ? ` (${weekday})` : ""}`
                      : `${relativeDate}${weekday ? ` (${weekday})` : ""}`;

                    return (
                      <div
                        key={`schedule-${meeting.id}`}
                        className={styles.dashboardScheduleItem}
                      >
                        <span>{displayDate}</span>
                        <strong>
                          {String(meeting.startTime || "").slice(0, 5) || "-"}
                        </strong>
                        <div className={styles.dashboardScheduleBody}>
                          <em
                            className={
                              meeting.scheduleSource === "hosted"
                                ? styles.dashboardScheduleBadgeHosted
                                : styles.dashboardScheduleBadgeApproved
                            }
                          >
                            {meeting.scheduleSource === "hosted"
                              ? "내가 만든 모임"
                              : "참여 확정"}
                          </em>
                          <p>{meeting.title}</p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className={styles.dashboardScheduleItem}>
                  <span>-</span>
                  <strong>-</strong>
                  <p>예정된 일정이 아직 없어요.</p>
                </div>
              )}
            </div>
          </section>

          <section className={styles.dashboardPanel}>
            <div className={styles.dashboardPanelHead}>
              <h3>최근 활동</h3>
            </div>
            <div className={styles.dashboardActivityList}>
              {activityFeed.length ? (
                activityFeed.map((item) => (
                  <div key={item.key} className={styles.dashboardActivityItem}>
                    <i>
                      <UiIcon
                        name="activity"
                        className={styles.dashboardActivityGlyph}
                      />
                    </i>
                    <div className={styles.dashboardActivityBody}>
                      <div className={styles.dashboardActivityHeader}>
                        <span
                          className={`${styles.dashboardActivityBadge} ${item.toneClass}`}
                        >
                          {item.kindLabel}
                        </span>
                      </div>
                      <strong className={styles.dashboardActivityTitle}>
                        {item.title}
                      </strong>
                      <p className={styles.dashboardActivityMeta}>{item.meta}</p>
                    </div>
                    <span className={styles.dashboardActivityTime}>{item.time}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyMessage}>최근 활동이 아직 없습니다.</div>
              )}
            </div>
          </section>
        </>
      }
    >
      {!isAuthenticated && !authLoading ? (
        <section className={styles.emptyStateCard}>
          <h2>로그인하면 내 활동을 볼 수 있어요</h2>
          <p>참여 요청, 모임 생성, 완료 기록을 한 화면에서 확인할 수 있습니다.</p>
          <Link to="/login" className={styles.emptyStateAction}>
            로그인하러 가기
          </Link>
        </section>
      ) : null}

      {isAuthenticated ? (
        <>
          <section className={styles.dashboardStatGrid}>
            {activityItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>

          <section className={styles.calendarPanel}>
            <div className={styles.calendarHead}>
              <div>
                <h2>내 일정 캘린더</h2>
                <p className={styles.dashboardSectionCopy}>
                  승인된 일정과 내가 만든 모임을 날짜별로 바로 확인할 수 있습니다.
                </p>
              </div>
              <div className={styles.calendarMonthControls}>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setSelectedMonth(
                      new Date(today.getFullYear(), today.getMonth(), 1),
                    );
                    setSelectedDateKey(todayKey);
                  }}
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMonth(
                      (current) =>
                        new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                >
                  이전
                </button>
                <strong>{getMonthLabel(selectedMonth)}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMonth(
                      (current) =>
                        new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
                >
                  다음
                </button>
              </div>
            </div>

            <div className={styles.calendarLayout}>
              <section className={styles.calendarCard}>
                <div className={styles.calendarWeekRow}>
                  {weekLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <div className={styles.calendarGrid}>
                  {calendarDays.map((item) =>
                    item.isEmpty ? (
                      <span key={item.key} className={styles.calendarCellEmpty} />
                    ) : (
                      <button
                        key={item.key}
                        type="button"
                        className={
                          item.dateKey === selectedDateKey
                            ? styles.calendarCellActive
                            : item.dateKey === todayKey
                              ? styles.calendarCellToday
                              : styles.calendarCell
                        }
                        onClick={() => setSelectedDateKey(item.dateKey)}
                      >
                        <strong>{item.day}</strong>
                        {item.hasMeetings ? (
                          <i className={styles.calendarDot} />
                        ) : (
                          <i className={styles.calendarDotMuted} />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </section>

              <section className={styles.calendarAgenda}>
                <div className={styles.calendarAgendaHead}>
                  <div>
                    <strong>{selectedDateLabel}</strong>
                    <span>{selectedDateMeetings.length}개 일정</span>
                  </div>
                  {selectedAgendaCalendarUrl ? (
                    <a
                      href={selectedAgendaCalendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.calendarAgendaAction}
                    >
                      구글 캘린더 추가
                    </a>
                  ) : null}
                </div>
                <div className={styles.calendarAgendaList}>
                  {selectedDateMeetings.length ? (
                    selectedDateMeetings.map((meeting) =>
                      meeting.origin === "hosted" ? (
                        <button
                          key={`agenda-${meeting.id}`}
                          type="button"
                          className={[
                            styles.calendarAgendaItem,
                            styles.toneHostedRecruiting,
                            meeting.status === "CLOSED"
                              ? styles.toneHostedClosed
                              : meeting.status === "ONGOING"
                                ? styles.toneHostedOngoing
                              : meeting.status === "COMPLETED"
                                ? styles.toneHostedCompleted
                                : meeting.status === "CANCELLED"
                                  ? styles.toneHostedCancelled
                                  : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => handleOpenManageModal(meeting)}
                        >
                          <div>
                            <span>{meeting.sport}</span>
                            <strong>{meeting.title}</strong>
                            <p>
                              {meeting.place} · {String(meeting.startTime || "").slice(0, 5)}
                            </p>
                          </div>
                          <b className={styles.hostedAgendaTone}>
                            내가 만든 · {getHostedStatusLabel(meeting.status)}
                          </b>
                        </button>
                      ) : (
                        <Link
                          key={`agenda-${meeting.id}`}
                          to={`/meetings/${meeting.id}`}
                        className={[
                            styles.calendarAgendaItem,
                            meeting.status === "ONGOING"
                              ? styles.toneOngoing
                              : "",
                            meeting.status === "COMPLETED"
                              ? styles.toneCompleted
                              : meeting.participationStatus === "PENDING"
                                ? styles.toneWaiting
                                : styles.toneScheduled,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div>
                            <span>{meeting.sport}</span>
                            <strong>{meeting.title}</strong>
                            <p>
                              {meeting.place} · {String(meeting.startTime || "").slice(0, 5)}
                            </p>
                          </div>
                          <b
                            className={[
                              styles.calendarAgendaTone,
                              meeting.status === "ONGOING"
                                ? styles.badgeOngoing
                                : meeting.status === "COMPLETED"
                                ? styles.badgeCompleted
                                : styles.badgeScheduled,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {meeting.status === "ONGOING"
                              ? "진행중"
                              : meeting.status === "COMPLETED"
                                ? "완료"
                                : "예정"}
                          </b>
                        </Link>
                      ),
                    )
                  ) : (
                    <div className={styles.emptyMessage}>
                      선택한 날짜에는 등록된 일정이 없습니다.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>

          {loadError ? (
            <section className={styles.emptyStateCard}>
              <h2>내 활동 정보를 불러오지 못했습니다</h2>
              <p>{loadError}</p>
            </section>
          ) : loading ? (
            <section className={styles.emptyStateCard}>
              <h2>내 활동을 불러오는 중입니다</h2>
              <p>참여 정보와 생성한 모임을 정리하고 있어요.</p>
            </section>
          ) : (
            <>
              <section className={styles.activityBuckets}>
                <article className={styles.activityBucketCard}>
                  <div className={styles.activityBucketHead}>
                    <div>
                      <h2>예정 모임</h2>
                      <p>승인이 끝나 곧 참여할 모임입니다.</p>
                    </div>
                    <span>{scheduledMeetings.length}개</span>
                  </div>
                  <div className={styles.activityBucketList}>
                    {scheduledMeetings.length ? (
                      scheduledMeetings.slice(0, 3).map((meeting) => (
                        <Link
                          key={`scheduled-${meeting.id}`}
                          to={`/meetings/${meeting.id}`}
                          className={[
                            styles.activityMeetingCard,
                            meeting.status === "ONGOING"
                              ? styles.toneOngoing
                              : styles.toneScheduled,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div>
                            <div className={styles.dashboardMeetingBadges}>
                              <span>{meeting.sport}</span>
                              <span
                                className={[
                                  styles.dashboardStatusBadge,
                                  meeting.status === "ONGOING"
                                    ? styles.badgeOngoing
                                    : styles.badgeScheduled,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {meeting.status === "ONGOING"
                                  ? "진행중"
                                  : getParticipationLabel(
                                      meeting.participationStatus || "APPROVED",
                                    )}
                              </span>
                            </div>
                            <strong>{meeting.title}</strong>
                            <p>
                              {meeting.place} · {formatMeetingDateTime(meeting)}
                            </p>
                          </div>
                          <b className={styles.cardCountTone}>
                            {meeting.approvedCount}/{meeting.maxMembers}명
                          </b>
                        </Link>
                      ))
                    ) : (
                      <div className={styles.emptyMessage}>
                        예정된 모임이 아직 없습니다.
                      </div>
                    )}
                  </div>
                </article>

                <article className={styles.activityBucketCard}>
                  <div className={styles.activityBucketHead}>
                    <div>
                      <h2>대기 모임</h2>
                      <p>신청은 했지만 승인 결과를 기다리는 모임입니다.</p>
                    </div>
                    <span>{waitingMeetings.length}개</span>
                  </div>
                  <div className={styles.activityBucketList}>
                    {waitingMeetings.length ? (
                      waitingMeetings.slice(0, 3).map((meeting) => (
                        <Link
                          key={`waiting-${meeting.id}`}
                          to={`/meetings/${meeting.id}`}
                          className={[
                            styles.activityMeetingCard,
                            styles.toneWaiting,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div>
                            <div className={styles.dashboardMeetingBadges}>
                              <span>{meeting.sport}</span>
                              <span
                                className={[
                                  styles.dashboardStatusBadge,
                                  styles.badgeWaiting,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {getParticipationLabel(
                                  meeting.participationStatus || "PENDING",
                                )}
                              </span>
                            </div>
                            <strong>{meeting.title}</strong>
                            <p>
                              {meeting.place} · {formatMeetingDateTime(meeting)}
                            </p>
                          </div>
                          <b className={styles.cardCountTone}>
                            {meeting.approvedCount}/{meeting.maxMembers}명
                          </b>
                        </Link>
                      ))
                    ) : (
                      <div className={styles.emptyMessage}>
                        대기 중인 모임이 없습니다.
                      </div>
                    )}
                  </div>
                </article>

                <article className={styles.activityBucketCard}>
                  <div className={styles.activityBucketHead}>
                    <div>
                      <h2>완료 모임</h2>
                      <p>참여가 끝나 리뷰나 회고를 할 수 있는 모임입니다.</p>
                    </div>
                    <span>{completedMeetings.length}개</span>
                  </div>
                  <div className={styles.activityBucketList}>
                    {completedMeetings.length ? (
                      completedMeetings.slice(0, 3).map((meeting) => (
                        <Link
                          key={`completed-${meeting.id}`}
                          to={`/meetings/${meeting.id}`}
                          className={[
                            styles.activityMeetingCard,
                            styles.toneCompleted,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div>
                            <div className={styles.dashboardMeetingBadges}>
                              <span>{meeting.sport}</span>
                              <span
                                className={[
                                  styles.dashboardStatusBadge,
                                  styles.badgeCompleted,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {getParticipationLabel(
                                  meeting.participationStatus || "COMPLETED",
                                )}
                              </span>
                            </div>
                            <strong>{meeting.title}</strong>
                            <p>
                              {meeting.place} · {formatMeetingDateTime(meeting)}
                            </p>
                          </div>
                          <b className={styles.cardCountTone}>
                            {meeting.approvedCount}/{meeting.maxMembers}명
                          </b>
                        </Link>
                      ))
                    ) : (
                      <div className={styles.emptyMessage}>
                        완료한 모임이 아직 없습니다.
                      </div>
                    )}
                  </div>
                </article>
              </section>

              <section className={styles.dashboardPanel}>
                <div className={styles.dashboardSectionHead}>
                  <div>
                    <h2>내가 만든 모임</h2>
                    <p className={styles.dashboardSectionCopy}>
                      카드를 누르면 상태를 확인하고 모임 취소까지 바로 할 수 있습니다.
                    </p>
                  </div>
                  <span>{hostedMeetings.length}개</span>
                </div>

                <div className={styles.hostMeetingList}>
                  {hostedMeetings.length ? (
                    hostedMeetings.slice(0, 6).map((meeting) => (
                      <button
                        key={`hosted-${meeting.id}`}
                        type="button"
                        className={[
                          styles.hostMeetingCard,
                          getToneClassByHostedStatus(meeting.status),
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleOpenManageModal(meeting)}
                      >
                        <div className={styles.hostMeetingHeader}>
                          <div>
                            <div className={styles.dashboardMeetingBadges}>
                              <span>{meeting.sport}</span>
                              <span
                                className={[
                                  styles.dashboardStatusBadge,
                                  styles.badgeHosted,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {getHostedStatusLabel(meeting.status)}
                              </span>
                            </div>
                            <strong>{meeting.title}</strong>
                            <p>
                              {meeting.place} · {formatMeetingDateTime(meeting)}
                            </p>
                          </div>
                          <span className={styles.hostMeetingAction}>관리하기</span>
                        </div>
                        <div className={styles.hostMeetingMeta}>
                          <span>{meeting.region}</span>
                          <span>
                            {meeting.approvedCount}/{meeting.maxMembers}명
                          </span>
                          <b className={styles.hostMeetingMetaTone}>
                            {getHostedStatusLabel(meeting.status)}
                          </b>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyMessage}>
                      아직 내가 만든 모임이 없습니다.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      ) : null}

      <AppModal
        open={Boolean(manageModalMeeting)}
        variant="sheet"
        tone="danger"
        eyebrow="모임 상태 관리"
        title={manageModalMeeting?.title ?? ""}
        description={
          manageModalMeeting
            ? `${manageModalMeeting.region} · ${formatMeetingDateTime(manageModalMeeting)}`
            : ""
        }
        confirmText={manageAction?.confirmText || "확인"}
        cancelText="닫기"
        onConfirm={manageAction?.type ? handleManageHostedMeeting : undefined}
        onClose={handleCloseManageModal}
      >
        {manageModalMeeting ? (
          <div className={styles.manageModalBody}>
            <div className={styles.manageModalMeta}>
              <span>현재 상태</span>
              <strong>{getHostedStatusLabel(manageModalMeeting.status)}</strong>
              <p>
                {manageModalMeeting.approvedCount}/{manageModalMeeting.maxMembers}명 참여
              </p>
            </div>
            <div className={styles.manageModalMeta}>
              <span>모임 정보</span>
              <strong>{manageModalMeeting.sport}</strong>
              <p>
                {manageModalMeeting.place} · {manageModalMeeting.region}
              </p>
            </div>
            <Link
              to={`/meetings/${manageModalMeeting.id}`}
              className={styles.manageModalLink}
              onClick={handleCloseManageModal}
            >
              모임 상세 보기
            </Link>
            <p className={styles.manageModalNotice}>{manageAction?.notice}</p>
          </div>
        ) : null}
      </AppModal>
    </DashboardShell>
  );
}
