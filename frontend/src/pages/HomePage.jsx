import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import MeetingRegionPickerModal from "../components/MeetingRegionPickerModal";
import ReactCalendarDatePicker from "../components/ReactCalendarDatePicker";
import SportPickerModal from "../components/SportPickerModal2";
import UiIcon from "../components/UiIcon";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { categoryItems, meetingImages } from "../data/dashboardData";
import { getComments } from "../api/commentApi";
import defaultImage from "../assets/image/bg1.jpg";
import {
  getMainMeetings,
  getMeetings,
  getPopularMeetings,
} from "../api/meetingApi";
import { getMyActivity } from "../api/memberApi";
import { getParticipants } from "../api/participantApi";
import { getRegions } from "../api/regionApi";
import { getSports } from "../api/sportApi";
import useSidebarInterestItems from "../hooks/useSidebarInterestItems";
import { getMeetingThumbnail } from "../utils/meetingVisuals";
import { copyMeetingShareUrl } from "../utils/shareLink";
import styles from "../styles/HomePage.module.css";
// 기본 썸네일 이미지 import
import defaultThumbnail from "../assets/image/bg1.jpg";

const POPULAR_PERIOD_STORAGE_KEY = "wemove:home:popular-period";

const heroSlides = [
  {
    title: "가볍게 시작하는 5km 러닝",
    description: "러닝부터 헬스, 풋살까지 원하는 운동을 자연스럽게 이어가요.",
    image: meetingImages[1],
  },
  {
    title: "오늘도 힘내는 웨이트 루틴",
    description: "운동 메이트가 있으면 루틴 유지가 훨씬 쉬워져요.",
    image: meetingImages[2],
  },
  {
    title: "이번 주말, 동네에서 운동할 사람 찾기",
    description:
      "지역과 날짜를 먼저 고르고, 그다음 운동을 더하면 딱 맞는 모임만 보여요.",
    image: meetingImages[5],
  },
];

const STATUS_LABELS = {
  RECRUITING: "모집중",
  CLOSED: "모집완료",
  ONGOING: "진행중",
  COMPLETED: "모임완료",
  CANCELLED: "취소됨",
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const pad2 = (value) => String(value).padStart(2, "0");

const toDateKey = (value) => {
  if (!value) return "";
  const date =
    value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const formatRegionLabel = (region) => {
  if (!region) return "";
  return [region.sido, region.sigungu, region.dong].filter(Boolean).join(" ");
};

const formatMeetingDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";

  const hour = Number.parseInt(String(timeStr).slice(0, 2), 10);
  const minute = String(timeStr).slice(3, 5);
  const ampm = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const dayLabel = DAY_LABELS[date.getDay()] ?? "";

  return `${date.getMonth() + 1}.${date.getDate()}(${dayLabel}) ${ampm} ${displayHour}:${minute}`;
};

const normalizeRegion = (region) => ({
  regionId: region.regionId,
  sido: region.sido ?? "",
  sigungu: region.sigungu ?? "",
  dong: region.dong ?? "",
});

const normalizeSport = (sport) => ({
  sportId: sport.sportId,
  name: sport.name ?? "",
  category: sport.category ?? "",
  isActive: sport.isActive ?? true,
});

const normalizeActivityMeeting = (meeting) => ({
  ...meeting,
  id: meeting.meetingId ?? meeting.id,
  title: meeting.title ?? "-",
  sport: meeting.sportName ?? meeting.sport ?? "-",
  region: meeting.regionName ?? meeting.region ?? "-",
  hostName:
    meeting.meetingHostName ?? meeting.hostNickname ?? meeting.host ?? "",
  meetingDate: meeting.meetingDate ?? null,
  startTime: meeting.startTime ?? "",
  status: meeting.status ?? "RECRUITING",
});

const isVisibleWeeklyScheduleStatus = (status) =>
  ["RECRUITING", "CLOSED", "ONGOING"].includes(status);

const buildRelativeText = (dateValue) => {
  if (!dateValue) return "최근";
  const today = new Date();
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return String(dateValue).slice(0, 10);

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

const defaultEmptyRegion = {regionId : null, sido: "", sigungu: "", dong: ""};

export default function HomePage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";
  const sidebarInterestItems = useSidebarInterestItems();

  const [activeSlide, setActiveSlide] = useState(0);
  const [meetings, setMeetings] = useState([]);
  const [popularMeetings, setPopularMeetings] = useState([]);
  const [popularPeriod, setPopularPeriod] = useState(() => {
    if (typeof window === "undefined") {
      return "today";
    }

    const savedPeriod = window.localStorage.getItem(POPULAR_PERIOD_STORAGE_KEY);
    return savedPeriod === "7d" ? "7d" : "today";
  });
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activityData, setActivityData] = useState({
    hostedMeetings: [],
    approvedMeetings: [],
    pendingMeetings: [],
    completedMeetings: [],
  });
  const [regionOptions, setRegionOptions] = useState([]);
  const [sportOptions, setSportOptions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isExplicitAllRegion, setIsExplicitAllRegion] = useState(false);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [neighborhoodStats, setNeighborhoodStats] = useState({
    recruitingCount: 0,
    applicantCount: 0,
    todayCount: 0,
    newCommentCount: 0,
  });

  const memberRegion = useMemo(() => {
    if (!user?.regionId) return null;
    return (
      regionOptions.find(
        (region) => Number(region.regionId) === Number(user.regionId),
      ) ?? null
    );
  }, [regionOptions, user?.regionId]);

  const effectiveRegion = isExplicitAllRegion
    ? null
    : (selectedRegion ?? memberRegion ?? null);
  const heroRegionLabel = effectiveRegion
    ? formatRegionLabel(effectiveRegion)
    : "전체 지역";
  const heroSportLabel = selectedSport
    ? selectedSport.name || "전체 운동"
    : "전체 운동";
  const neighborhoodRegionLabel = memberRegion
    ? formatRegionLabel(memberRegion)
    : "내 동네";

  const currentHero = heroSlides[activeSlide];

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  const handleShareMeeting = useCallback(
    async (meetingId) => {
      if (!meetingId || typeof window === "undefined") {
        toast.error("링크 복사 실패", "공유할 모임 정보를 찾을 수 없습니다.");
        return;
      }

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
    },
    [toast],
  );

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

  const recentActivities = [
    ...activityData.hostedMeetings.slice(0, 3).map((meeting) => ({
      key: 'host-' + meeting.id,
      kindLabel: "모임 생성",
      toneClass: styles.dashboardActivityToneHosted,
      title: meeting.title,
      meta: meeting.sport + " · " + (meeting.region || "지역 미정"),
      time: buildRelativeText(meeting.createdAt || meeting.meetingDate),
    })),
    ...activityData.approvedMeetings.slice(0, 2).map((meeting) => ({
      key: 'approved-' + meeting.id,
      kindLabel: "참여 확정",
      toneClass: styles.dashboardActivityToneScheduled,
      title: meeting.title,
      meta: meeting.sport + " · " + formatMeetingDateTime(meeting.meetingDate, meeting.startTime),
      time: buildRelativeText(meeting.meetingDate),
    })),
    ...activityData.pendingMeetings.slice(0, 2).map((meeting) => ({
      key: 'pending-' + meeting.id,
      kindLabel: "참여 대기",
      toneClass: styles.dashboardActivityToneWaiting,
      title: meeting.title,
      meta: meeting.sport + " · " + (meeting.region || "지역 미정"),
      time: buildRelativeText(meeting.meetingDate),
    })),
  ].slice(0, 4);

  // 메인페이지 카테고리별 모임목록조회
  useEffect(() => {
    const params =
      !activeCategory || activeCategory === "전체" || activeCategory === "?꾩껜"
        ? undefined
        : { category: activeCategory };

    getMainMeetings(params)
      .then((res) => {
        setMeetings(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
      })
      .catch((err) => {
        console.error(err);
        setMeetings([]);
      });
  }, [activeCategory]);

  // 히어로 슬라이드 타이머
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((index) => (index + 1) % heroSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  // 필터 옵션 로드
  useEffect(() => {
    let active = true;
    const fetchFilterOptions = async () => {
      try {
        const [regionsResponse, sportsResponse] = await Promise.all([
          getRegions(),
          getSports(),
        ]);
        if (!active) return;

        setRegionOptions(
          Array.isArray(regionsResponse.data)
            ? regionsResponse.data
                .map(normalizeRegion)
                .filter((region) => region.sido && region.sigungu)
            : [],
        );

        setSportOptions(
          Array.isArray(sportsResponse.data)
            ? sportsResponse.data
                .map(normalizeSport)
                .filter((sport) => sport.isActive !== false && sport.name)
            : [],
        );
      } catch (error) {
        console.error(error);
        if (active) {
          setRegionOptions([]);
          setSportOptions([]);
        }
      }
    };
    fetchFilterOptions();
    return () => {
      active = false;
    };
  }, []);

  // 인기 모임 로드
  useEffect(() => {
    let active = true;
    let intervalId = null;
    let midnightTimeoutId = null;

    const fetchPopularMeetings = async () => {
      try {
        const response = await getPopularMeetings(popularPeriod);
        if (!active) return;

        const popularList = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data?.list)
              ? response.data.list
              : [];

        const recruitingMeetings = popularList.filter(
          (meeting) => meeting?.status === "RECRUITING",
        );

        setPopularMeetings(recruitingMeetings.slice(0, 5));
      } catch (error) {
        console.error(error);
        if (active) setPopularMeetings([]);
      }
    };

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);

      midnightTimeoutId = window.setTimeout(
        () => {
          fetchPopularMeetings();
          scheduleMidnightRefresh();
        },
        Math.max(nextMidnight.getTime() - now.getTime(), 0),
      );
    };

    fetchPopularMeetings();
    intervalId = window.setInterval(fetchPopularMeetings, 60 * 1000);
    scheduleMidnightRefresh();

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
      if (midnightTimeoutId) window.clearTimeout(midnightTimeoutId);
    };
  }, [popularPeriod]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(POPULAR_PERIOD_STORAGE_KEY, popularPeriod);
  }, [popularPeriod]);

  // 내 활동 데이터 로드
  useEffect(() => {
    if (!user?.memberId) {
      setActivityData({
        hostedMeetings: [],
        approvedMeetings: [],
        pendingMeetings: [],
        completedMeetings: [],
      });
      return undefined;
    }
    let active = true;
    const fetchActivity = async () => {
      try {
        const response = await getMyActivity(user.memberId);
        const payload = response.data ?? {};
        if (!active) return;

        setActivityData({
          hostedMeetings: Array.isArray(payload.hostedMeetings)
            ? payload.hostedMeetings.map(normalizeActivityMeeting)
            : [],
          approvedMeetings: Array.isArray(payload.approvedMeetings)
            ? payload.approvedMeetings.map(normalizeActivityMeeting)
            : [],
          pendingMeetings: Array.isArray(payload.pendingMeetings)
            ? payload.pendingMeetings.map(normalizeActivityMeeting)
            : [],
          completedMeetings: Array.isArray(payload.completedMeetings)
            ? payload.completedMeetings.map(normalizeActivityMeeting)
            : [],
        });
      } catch (error) {
        console.error(error);
        if (active) {
          setActivityData({
            hostedMeetings: [],
            approvedMeetings: [],
            pendingMeetings: [],
            completedMeetings: [],
          });
        }
      }
    };
    fetchActivity();
    return () => {
      active = false;
    };
  }, [user?.memberId]);

  // 우리 동네 현황 통계 데이터 계산
  useEffect(() => {
    if (!user?.regionId) {
      setNeighborhoodStats({
        recruitingCount: 0,
        applicantCount: 0,
        todayCount: 0,
        newCommentCount: 0,
      });
      return undefined;
    }
    let active = true;
    const fetchNeighborhoodStats = async () => {
      try {
        const todayKey = toDateKey(new Date());
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const { data } = await getMeetings({
          regionId: user.regionId,
          page: 1,
          size: 100,
        });
        const regionMeetings = Array.isArray(data?.list) ? data.list : [];

        const recruitingCount = regionMeetings.filter(
          (meeting) => meeting.status === "RECRUITING",
        ).length;
        const todayCount = regionMeetings.filter(
          (meeting) =>
            toDateKey(meeting.meetingDate) === todayKey &&
            meeting.status !== "CANCELLED",
        ).length;
        const activeMeetings = regionMeetings.filter((meeting) =>
          ["RECRUITING", "CLOSED", "ONGOING"].includes(meeting.status),
        );

        const [participantsResult, commentsResult] = await Promise.all([
          Promise.allSettled(
            activeMeetings.map((meeting) => getParticipants(meeting.meetingId)),
          ),
          Promise.allSettled(
            activeMeetings.map((meeting) => getComments(meeting.meetingId)),
          ),
        ]);

        if (!active) return;

        const applicantCount = participantsResult.reduce((sum, result) => {
          const participants = Array.isArray(result.value?.data)
            ? result.value.data
            : [];
          return sum + participants.length;
        }, 0);

        const newCommentCount = commentsResult.reduce((sum, result) => {
          const comments = Array.isArray(result.value?.data)
            ? result.value.data
            : [];
          return (
            sum +
            comments.filter((comment) => {
              const createdAt = comment?.createdAt
                ? new Date(String(comment.createdAt).replace(" ", "T"))
                : null;
              return (
                createdAt &&
                !Number.isNaN(createdAt.getTime()) &&
                createdAt >= sevenDaysAgo
              );
            }).length
          );
        }, 0);

        setNeighborhoodStats({
          recruitingCount,
          applicantCount,
          todayCount,
          newCommentCount,
        });
      } catch (error) {
        console.error(error);
        if (active) {
          setNeighborhoodStats({
            recruitingCount: 0,
            applicantCount: 0,
            todayCount: 0,
            newCommentCount: 0,
          });
        }
      }
    };
    fetchNeighborhoodStats();
    return () => {
      active = false;
    };
  }, [user?.regionId]);

  const statsCards = [
    {
      label: "모집중 모임",
      value: `${neighborhoodStats.recruitingCount}개`,
      tone: "blue",
      icon: "spark",
    },
    {
      label: "참여 예정 인원",
      value: `${neighborhoodStats.applicantCount}명`,
      tone: "indigo",
      icon: "user",
    },
    {
      label: "오늘 진행 모임",
      value: `${neighborhoodStats.todayCount}개`,
      tone: "green",
      icon: "calendar",
    },
    {
      label: "신규 댓글",
      value: `${neighborhoodStats.newCommentCount}개`,
      tone: "mint",
      icon: "comment",
    },
  ];

  const buildMeetingSearchUrl = () => {
    const params = new URLSearchParams();
    if (effectiveRegion)
      params.set("regionLabel", formatRegionLabel(effectiveRegion));
    else params.set("global", "1");
    if (selectedSport?.name) params.set("sportName", selectedSport.name);
    if (selectedDate) params.set("meetingDate", selectedDate);
    return `/meetings${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const handleApplyRegion = (selection) => {
    const hasSelection = Boolean(
      selection?.regionId ||
      selection?.sido ||
      selection?.sigungu ||
      selection?.dong,
    );
    if (!hasSelection) {
      setSelectedRegion(null);
      setIsExplicitAllRegion(true);
      setIsRegionModalOpen(false);
      return;
    }
    setSelectedRegion(selection);
    setIsExplicitAllRegion(false);
    setIsRegionModalOpen(false);
  };

  const handleApplySport = (sport) => {
    setSelectedSport(sport ?? null);
    setIsSportModalOpen(false);
  };

  const topRegionLabel = memberRegion ? neighborhoodRegionLabel : "전체 지역";

  const homeAside = isAdmin ? null : (
    <>
      <section className={styles.dashboardPanel}>
        <div className={`${styles.dashboardPanelHead} ${styles.dashboardPopularHead}`}>
          <div className={styles.dashboardPopularTitle}>
            <h3>실시간 인기 모임</h3>
            <span className={styles.dashboardPanelHint}>
              기준: {popularPeriod === "today" ? "오늘" : "최근 7일"} 조회수 · 모집중 모임만 표시
            </span>
          </div>
          <div className={styles.dashboardPeriodToggle}>
            <button
              type="button"
              className={
                popularPeriod === "today"
                  ? styles.dashboardPeriodToggleActive
                  : styles.dashboardPeriodToggleButton
              }
              onClick={() => setPopularPeriod("today")}
            >
              오늘
            </button>
            <button
              type="button"
              className={
                popularPeriod === "7d"
                  ? styles.dashboardPeriodToggleActive
                  : styles.dashboardPeriodToggleButton
              }
              onClick={() => setPopularPeriod("7d")}
            >
              최근 7일
            </button>
          </div>
        </div>
        <div className={styles.dashboardRankList}>
          {popularMeetings.length ? (
            popularMeetings.slice(0, 5).map((meeting, index) => (
              <Link
                key={meeting.meetingId}
                to={`/meetings/${meeting.meetingId}`}
                className={styles.dashboardRankItem}
              >
                <b>{index + 1}</b>
                <div>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.viewCount ?? meeting.views ?? 0}회 조회</span>
                </div>
              </Link>
            ))
          ) : (
            <div className={styles.dashboardPopularEmpty}>
              <strong>
                {popularPeriod === "today"
                  ? "오늘 아직 집계된 인기 모임이 없어요."
                  : "최근 7일 기준 인기 모임이 아직 없어요."}
              </strong>
              <p>모집중인 모임이 조회되면 여기에 순위가 표시됩니다.</p>
              <Link to="/meetings" className={styles.dashboardPopularEmptyLink}>
                모임 보러 가기
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className={styles.dashboardPanel}>
        <div className={styles.dashboardPanelHead}>
          <h3>이번 주 일정</h3>
          <Link to="/activity">전체 일정 보기</Link>
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
                      {String(meeting.startTime ?? "").slice(0, 5) || "--:--"}
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

      <section
        className={`${styles.dashboardPanel} ${styles.dashboardActivityPanelMatchActivity}`}
      >
        <div className={styles.dashboardPanelHead}>
          <h3>최근 활동</h3>
        </div>
        <div className={styles.dashboardActivityList}>
          {recentActivities.length ? (
            recentActivities.map((activity) => (
              <div key={activity.key} className={styles.dashboardActivityItem}>
                <i>
                  <UiIcon
                    name="activity"
                    className={styles.dashboardActivityGlyph}
                  />
                </i>
                <div className={styles.dashboardActivityBody}>
                  <div className={styles.dashboardActivityHeader}>
                    <span
                      className={`${styles.dashboardActivityBadge} ${activity.toneClass}`}
                    >
                      {activity.kindLabel}
                    </span>
                  </div>
                  <strong className={styles.dashboardActivityTitle}>
                    {activity.title}
                  </strong>
                  <p className={styles.dashboardActivityMeta}>{activity.meta}</p>
                </div>
                <span className={styles.dashboardActivityTime}>{activity.time}</span>
              </div>
            ))
          ) : (
            <div className={styles.emptyMessage}>최근 활동이 아직 없습니다.</div>
          )}
        </div>
      </section>
    </>
  );

  return (
    <DashboardShell
      active="홈"
      aside={homeAside}
      sidebarInterestItems={sidebarInterestItems}
    >
      <section className={styles.dashboardHeroRow}>
        <div className={styles.dashboardHeroCard}>
          <div className={styles.heroCarousel} aria-hidden="true">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.title}
                src={slide.image}
                alt=""
                className={
                  index === activeSlide
                    ? styles.heroSlideActive
                    : styles.heroSlide
                }
              />
            ))}
          </div>

          <div className={styles.dashboardHeroContent}>
            <div>
              <span className={styles.heroKicker}>LOCAL FITNESS COMMUNITY</span>
              <h1>{currentHero.title}</h1>
              <p>{currentHero.description}</p>
            </div>

            <div className={styles.dashboardHeroFilters}>
              <button
                type="button"
                className={styles.dashboardHeroChoiceButton}
                onClick={() => setIsRegionModalOpen(true)}
              >
                <span>
                  <UiIcon
                    name="location"
                    className={styles.dashboardInlineIcon}
                  />
                </span>
                <div className={styles.dashboardHeroChoiceText}>
                  <small>지역</small>
                  <strong>{heroRegionLabel}</strong>
                </div>
                <UiIcon
                  name="chevronDown"
                  className={styles.dashboardHeroChoiceChevron}
                />
              </button>

              <button
                type="button"
                className={styles.dashboardHeroChoiceButton}
                onClick={() => setIsSportModalOpen(true)}
              >
                <span>
                  <UiIcon name="spark" className={styles.dashboardInlineIcon} />
                </span>
                <div className={styles.dashboardHeroChoiceText}>
                  <small>운동</small>
                  <strong>{heroSportLabel}</strong>
                </div>
                <UiIcon
                  name="chevronDown"
                  className={styles.dashboardHeroChoiceChevron}
                />
              </button>

              <ReactCalendarDatePicker
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                buttonClassName={`${styles.dashboardHeroChoiceButton} ${styles.dashboardHeroDateInput}`}
              >
                <span>
                  <UiIcon
                    name="calendar"
                    className={styles.dashboardInlineIcon}
                  />
                </span>
                <div className={styles.dashboardHeroChoiceText}>
                  <small>날짜</small>
                  <strong>{selectedDate || "날짜 선택"}</strong>
                </div>
              </ReactCalendarDatePicker>

              <Link
                to={buildMeetingSearchUrl()}
                className={styles.dashboardHeroButton}
              >
                모임 찾기
              </Link>
            </div>

            <div className={styles.heroDots} aria-label="메인 배너 슬라이드">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={
                    index === activeSlide
                      ? styles.heroDotActive
                      : styles.heroDot
                  }
                  onClick={() => setActiveSlide(index)}
                  aria-label={`${index + 1}번째 배너 보기`}
                />
              ))}
            </div>
          </div>
        </div>

        <section className={styles.dashboardSummaryCard}>
          <div className={styles.dashboardSidebarHead}>
            <strong>우리 동네 현황</strong>
            <span>{topRegionLabel}</span>
          </div>
          <div className={styles.dashboardSummaryGrid}>
            {statsCards.map((stat) => (
              <article key={stat.label}>
                <i
                  className={
                    styles[
                      `dashboardTone${stat.tone[0].toUpperCase()}${stat.tone.slice(1)}`
                    ]
                  }
                >
                  <UiIcon
                    name={stat.icon}
                    className={styles.dashboardStatIcon}
                  />
                </i>
                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className={styles.dashboardCategoryStrip}>
        {categoryItems.map((item) => (
          <button
            key={item.name}
            type="button"
            className={`${styles.dashboardCategoryItem} ${activeCategory === item.name ? styles.active : ""}`}
            onClick={() => setActiveCategory(item.name)}
            style={{ flex: "1", minWidth: "0", padding: "6px 2px" }}
          >
            <i
              className={
                styles[
                  `dashboardTone${item.accent[0].toUpperCase()}${item.accent.slice(1)}`
                ]
              }
            >
              <UiIcon
                name={item.icon}
                className={styles.dashboardCategoryGlyph}
              />
            </i>
            <span>{item.name}</span>
          </button>
        ))}
      </section>

      <section className={styles.dashboardSection}>
        <div className={styles.dashboardSectionHead}>
          <div>
            <h2>신규 생성 모임</h2>
          </div>
        </div>

        <div className={styles.dashboardFeed}>
          {meetings.length > 0 ? (
            meetings.slice(0, 5).map((meeting, index) => (
              <article
                key={meeting.meetingId}
                className={`${styles.dashboardMeetingCard} ${styles.homeCardOverride}`}
              >
                <img
                  src={getMeetingThumbnail(meeting) || defaultThumbnail}
                  alt={meeting.title}
                  className={`${styles.dashboardMeetingImage} ${styles.homeImageOverride}`}
                  onError={(e) => {
                    e.currentTarget.src = defaultThumbnail;
                  }}
                />
                <div className={styles.dashboardMeetingBody}>
                  <div className={styles.dashboardMeetingBadges}>
                    <span>{meeting.sportName}</span>
                    <span className={styles.dashboardStatusBadge}>
                      {STATUS_LABELS[meeting.status] ?? meeting.status}
                    </span>
                  </div>

                  <h3>{meeting.title}</h3>
                  <p>{truncateText(meeting.content, 80)}</p>

                  <div className={styles.dashboardMeetingMeta}>
                    <span>
                      <UiIcon
                        name="location"
                        className={styles.dashboardMetaIcon}
                      />{" "}
                      {meeting.regionName}
                    </span>
                    <span>
                      <UiIcon
                        name="calendar"
                        className={styles.dashboardMetaIcon}
                      />{" "}
                      {formatMeetingDateTime(
                        meeting.meetingDate,
                        meeting.startTime,
                      )}
                    </span>
                    <span>
                      <UiIcon
                        name="user"
                        className={styles.dashboardMetaIcon}
                      />{" "}
                      {meeting.approvedCount ?? 0} / {meeting.maxMembers}명
                    </span>
                  </div>

                  <div className={`${styles.dashboardMeetingFooter} ${styles.footerContainerOverride}`}>
                    <div className={styles.dashboardMeetingActions}>

                      <button type="button" onClick={()=> navigate(`/meetings/${meeting.meetingId}`)}>
                        <UiIcon
                          name="comment"
                          className={styles.dashboardActionIcon}
                        />
                        {meeting.commentCount}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareMeeting(meeting.meetingId)}
                      >
                        <UiIcon
                          name="share"
                          className={styles.dashboardActionIcon}
                        />
                      </button>
                      <Link to={`/meetings/${meeting.meetingId}`}>
                        상세 보기
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            /* 모임 데이터가 없을 때 보여줄 fallback UI (공백일 경우 null 처리 가능) */
            <div className={styles.emptyContainer}>
              <h3>해당 카테고리의 모임이 없습니다.</h3>
              <p>
                새로운 모임을 직접 만들어보거나 다른 카테고리를 확인해보세요!
              </p>
              <Link to="/meetings/new" className={styles.dashboardHeroButton}>
                모임만들기
              </Link>
            </div>
          )}
        </div>
      </section>

      <MeetingRegionPickerModal
        open={isRegionModalOpen}
        regions={regionOptions}
        initialSelection={
          selectedRegion ??
          (isExplicitAllRegion
            ? defaultEmptyRegion
            : (memberRegion ?? defaultEmptyRegion))
        }
        onApply={handleApplyRegion}
        onClose={() => setIsRegionModalOpen(false)}
      />

      <SportPickerModal
        open={isSportModalOpen}
        sports={sportOptions}
        selectedSportId={selectedSport?.sportId ?? null}
        onApply={handleApplySport}
        onClose={() => setIsSportModalOpen(false)}
      />
    </DashboardShell>
  );
}
