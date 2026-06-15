import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import defaultUserImage from "../assets/image/Default-user.png";
import defaultThumbnail from "../assets/image/bg1.jpg";
import AppModal from "../components/AppModal";
import DashboardShell from "../components/DashboardShell";
import MeetingRegionPickerModal from "../components/MeetingRegionPickerModal";
import MeetingMap from "../components/MeetingMap";
import Pagination from "../components/Pagination";
import ReactCalendarDatePicker from "../components/ReactCalendarDatePicker";
import SportPickerModal from "../components/SportPickerModal2";
import UiIcon from "../components/UiIcon";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getMeetings, getTopRegions } from "../api/meetingApi";
import { getMember, getMyActivity } from "../api/memberApi";
import { getRegions } from "../api/regionApi";
import { getSports } from "../api/sportApi";
import { meetingImages } from "../data/dashboardData";
import useSidebarInterestItems from "../hooks/useSidebarInterestItems";
import { copyMeetingShareUrl } from "../utils/shareLink";
import styles from "../styles/MeetingListPage.module.css";

const cx = (...names) =>
  names
    .filter(Boolean)
    .map((name) => styles[name] || name)
    .join(" ");

const ALL_REGION = "전체 지역";
const ALL_SPORT = "전체 종목";
const ALL_STATUS = "전체 상태";
const PAGE_SIZE = 10;
const MAP_RESULT_LIMIT = 100;
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_MAP = {
  RECRUITING: "모집중",
  CLOSED: "모집완료",
  ONGOING: "진행중",
  COMPLETED: "진행완료",
  CANCELLED: "취소됨",
};

const normalizeText = (value = "") => String(value).trim();

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

const getWeekRange = (baseDate) => {
  const weekStart = new Date(baseDate);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { weekStart, weekEnd };
};

const isVisibleWeeklyScheduleStatus = (status) =>
  ["RECRUITING", "CLOSED", "ONGOING"].includes(status);

const normalizeMeeting = (meeting) => ({
  ...meeting,
  id: meeting.meetingId ?? meeting.id,
  title: meeting.title ?? "-",
  sport: meeting.sportName ?? meeting.sport ?? "-",
  place: meeting.placeName ?? meeting.place ?? "-",
  region: meeting.regionName ?? meeting.region ?? "-",
  meetingDate: meeting.meetingDate ?? null,
  startTime: meeting.startTime ?? "",
  status: meeting.status ?? "RECRUITING",
});

const normalizeRegion = (region) => ({
  regionId: region.regionId,
  sido: normalizeText(region.sido),
  sigungu: normalizeText(region.sigungu),
  dong: normalizeText(region.dong),
});

const normalizeSport = (sport) => ({
  sportId: sport.sportId,
  name: sport.name ?? "-",
  category: sport.category ?? "기타",
  isActive: sport.isActive ?? true,
});

const formatRegionLabel = (selection) => {
  if (!selection) return ALL_REGION;

  const parts = [selection.sido, selection.sigungu, selection.dong]
    .map(normalizeText)
    .filter(Boolean);

  return parts.length ? parts.join(" ") : ALL_REGION;
};

const formatTopRegionLabel = (region) => {
  if (!region || typeof region !== "object") {
    return String(region || "");
  }

  const parts = [
    region.sido || region.sidoName,
    region.sigungu || region.sigunguName,
    region.dong || region.dongName,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" ")
    : region.regionName || region.name || "";
};

const resolveRegionSelectionFromLabel = (regions, label) => {
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) {
    return null;
  }

  const terms = normalizedLabel.split(/\s+/).filter(Boolean);

  if (terms.length === 1) {
    return {
      regionId: null,
      sido: terms[0],
      sigungu: "",
      dong: "",
    };
  }

  if (terms.length === 2) {
    return {
      regionId: null,
      sido: terms[0],
      sigungu: terms[1],
      dong: "",
    };
  }

  const dongName = terms.slice(2).join(" ");
  const matchedRegion =
    regions.find(
      (region) =>
        normalizeText(region.sido) === terms[0] &&
        normalizeText(region.sigungu) === terms[1] &&
        normalizeText(region.dong) === dongName,
    ) ?? null;

  if (matchedRegion) {
    return matchedRegion;
  }

  return {
    regionId: null,
    sido: terms[0],
    sigungu: terms[1],
    dong: dongName,
  };
};

export default function MeetingListPage() {
  const navigate = useNavigate();
  const [urlSearchParams, setSearchParams] = useSearchParams();
  const listStartRef = useRef(null);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();
  const sidebarInterestItems = useSidebarInterestItems();
  
  // 1. URL 검색 파라미터 파싱
  const keywordParam = urlSearchParams.get("keyword") ?? "";
  const regionLabelParam = urlSearchParams.get("regionLabel") ?? "";
  const sportNameParam = urlSearchParams.get("sportName") ?? "";
  const statusParam = urlSearchParams.get("status") ?? "";
  const meetingDateParam = urlSearchParams.get("meetingDate") ?? "";
  const pageParam = urlSearchParams.get("page") ?? "1";
  
  const isGlobalSearch =
    urlSearchParams.get("global") === "1" ||
    Boolean(keywordParam || sportNameParam || (regionLabelParam && regionLabelParam !== "전체"));

  // 2. 파생 상태 (Single Source of Truth)
  // 로컬 입력 버퍼 (검색창 타자 중에만 사용되며 엔터 칠 때 URL로 동기화)
  const [tempKeyword, setTempKeyword] = useState(keywordParam);
  const prevKeywordRef = useRef(keywordParam);
  
  const currentPage = useMemo(() => {
    const parsed = parseInt(pageParam, 10);
    return isNaN(parsed) ? 1 : parsed;
  }, [pageParam]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);

  const [memberRegionId, setMemberRegionId] = useState(null);
  const [memberRegionReady, setMemberRegionReady] = useState(false);

  const [meetingList, setMeetingList] = useState([]);
  const [mapMeetingList, setMapMeetingList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [topRegions, setTopRegions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [sportOptions, setSportOptions] = useState([]);
  const [filterOptionsReady, setFilterOptionsReady] = useState(false);
  
  const [scheduleItems, setScheduleItems] = useState([]);
  const handleSelectMeeting = useCallback(
    (meetingId) => navigate(`/meetings/${meetingId}`),
    [navigate],
  );

  const handleShareMeeting = useCallback(
    async (event, meetingId) => {
      event.preventDefault();
      event.stopPropagation();

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

  const loadActivity = useCallback(async () => {
    if (authLoading || !isAuthenticated || !user?.memberId) {
      setScheduleItems([]);
      return;
    }

    try {
      const response = await getMyActivity(user.memberId);
      const payload = response.data ?? {};
      const hosted = Array.isArray(payload.hostedMeetings)
        ? payload.hostedMeetings
            .map(normalizeMeeting)
            .filter((meeting) => isVisibleWeeklyScheduleStatus(meeting.status))
            .map((meeting) => ({
              ...meeting,
              scheduleSource: "hosted",
            }))
        : [];
      const approved = Array.isArray(payload.approvedMeetings)
        ? payload.approvedMeetings.map(normalizeMeeting).map((meeting) => ({
            ...meeting,
            scheduleSource: "approved",
          }))
        : [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { weekStart, weekEnd } = getWeekRange(today);

      const filteredAndSorted = [...hosted, ...approved]
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
        );

      setScheduleItems(filteredAndSorted.slice(0, 4));
    } catch (error) {
      console.error("Failed to load activity:", error);
      setScheduleItems([]);
    }
  }, [authLoading, isAuthenticated, user?.memberId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [regionsResponse, sportsResponse] = await Promise.all([
          getRegions(),
          getSports(),
        ]);

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
                .filter((sport) => sport.isActive !== false)
            : [],
        );
      } catch (error) {
        console.error(error);
        setRegionOptions([]);
        setSportOptions([]);
      } finally {
        setFilterOptionsReady(true);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    const fetchMemberRegion = async () => {
      if (!isAuthenticated || !user?.memberId) {
        setMemberRegionId(null);
        setMemberRegionReady(true);
        return;
      }

      setMemberRegionReady(false);

      try {
        const response = await getMember(user.memberId);

        if (active) {
          setMemberRegionId(response.data?.regionId ?? null);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setMemberRegionId(null);
        }
      } finally {
        if (active) {
          setMemberRegionReady(true);
        }
      }
    };

    fetchMemberRegion();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, user?.memberId]);

  const selectedRegion = useMemo(() => {
    if (!regionOptions.length || !regionLabelParam || regionLabelParam === "전체") {
      return null;
    }
    return resolveRegionSelectionFromLabel(regionOptions, regionLabelParam);
  }, [regionOptions, regionLabelParam]);

  const selectedSport = useMemo(() => {
    if (!sportOptions.length || !sportNameParam) {
      return null;
    }
    return sportOptions.find((sport) => sport.name === sportNameParam) ?? null;
  }, [sportOptions, sportNameParam]);

  const memberRegion = useMemo(
    () =>
      regionOptions.find((region) => region.regionId === memberRegionId) ??
      null,
    [regionOptions, memberRegionId],
  );

  const regionParams = useMemo(() => {
    if (!selectedRegion) {
      return {};
    }

    if (selectedRegion.regionId) {
      return { regionId: selectedRegion.regionId };
    }

    return {
      sido: selectedRegion.sido || null,
      sigungu: selectedRegion.sigungu || null,
      dong: selectedRegion.dong || null,
    };
  }, [selectedRegion]);

  const searchParams = useMemo(
    () => {
      const isAllRegionSelected = regionLabelParam === "전체" || !regionLabelParam;
      return {
        ...regionParams,
        baseRegionId:
          selectedRegion || isAllRegionSelected || isGlobalSearch
            ? null
            : memberRegionId,
        sportId: selectedSport?.sportId ?? null,
        status: statusParam,
        keyword: keywordParam,
        meetingDate: meetingDateParam,
        page: currentPage,
        size: PAGE_SIZE,
      };
    },
    [
      regionParams,
      selectedRegion,
      regionLabelParam,
      memberRegionId,
      isGlobalSearch,
      selectedSport,
      statusParam,
      keywordParam,
      meetingDateParam,
      currentPage,
    ],
  );

  // 1. URL 파라미터가 외부 요인(뒤로가기, 초기화 등)으로 변경될 때 검색창 내용만 동기화
  useEffect(() => {
    if (prevKeywordRef.current !== keywordParam) {
      setTempKeyword(keywordParam);
      prevKeywordRef.current = keywordParam;
    }
  }, [keywordParam]);

  // 3. 최초 진입 시 로그인 유무에 따른 기본 지역 주입 및 전체 지역 리다이렉트
  useEffect(() => {
    if (authLoading || !memberRegionReady || !filterOptionsReady) return;

    const hasNoRegionKey = !urlSearchParams.has("regionLabel");
    const hasNoOtherFilters = !keywordParam && !sportNameParam && !statusParam && !meetingDateParam && urlSearchParams.get("global") !== "1";

    // 완전히 비어있는 깨끗한 최초 접속인 경우 리다이렉트
    if (hasNoRegionKey && hasNoOtherFilters) {
      if (isAuthenticated && memberRegion) {
        const userDefaultRegion = `${memberRegion.sido} ${memberRegion.sigungu}`;
        updateURLParams({ regionLabel: userDefaultRegion, page: "1" });
      } else {
        updateURLParams({ regionLabel: "전체", page: "1" });
      }
      return;
    }

    // 메인 등에서 다른 조건은 존재하나 regionLabel만 유실되어 들어온 경우 "전체"로 주입 보완
    if (hasNoRegionKey && !hasNoOtherFilters) {
      updateURLParams({ regionLabel: "전체" });
    }
  }, [authLoading, isAuthenticated, memberRegion, memberRegionReady, filterOptionsReady, urlSearchParams]);

  // 지역과 운동 모달 인풋 복원을 위한 상태 동기화 useEffect 들은
  // useMemo 로 완전히 대체되어 제거되었습니다.

  useEffect(() => {
    if (authLoading || !memberRegionReady) return;

    const fetchMeetings = async () => {
      try {
        const {
          regionId: _regionId,
          sido: _sido,
          sigungu: _sigungu,
          dong: _dong,
          baseRegionId: _baseRegionId,
          ...mapSearchParams
        } = searchParams;

        const [response, firstMapResponse] = await Promise.all([
          getMeetings(searchParams),
          getMeetings({
            ...mapSearchParams,
            status: "RECRUITING",
            page: 1,
            size: MAP_RESULT_LIMIT,
          }),
        ]);

        if (response.data) {
          setMeetingList(response.data.list || []);
          setTotalCount(response.data.totalCount || 0);
        }

        const firstMapPage = firstMapResponse.data?.list || [];
        const mapTotalCount =
          firstMapResponse.data?.totalCount ?? firstMapPage.length;
        const mapPageCount = Math.ceil(mapTotalCount / MAP_RESULT_LIMIT);

        if (mapPageCount <= 1) {
          setMapMeetingList(firstMapPage);
          return;
        }

        const remainingMapResponses = await Promise.all(
          Array.from({ length: mapPageCount - 1 }, (_, index) =>
            getMeetings({
              ...mapSearchParams,
              status: "RECRUITING",
              page: index + 2,
              size: MAP_RESULT_LIMIT,
            }),
          ),
        );
        const remainingMeetings = remainingMapResponses.flatMap(
          (mapResponse) => mapResponse.data?.list || [],
        );

        setMapMeetingList([...firstMapPage, ...remainingMeetings]);
      } catch (error) {
        console.error(error);
        setMeetingList([]);
        setMapMeetingList([]);
        setTotalCount(0);
      }
    };

    fetchMeetings();
  }, [authLoading, memberRegionReady, searchParams]);

  useEffect(() => {
    const fetchTopRegions = async () => {
      try {
        const response = await getTopRegions();
        setTopRegions(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(error);
        setTopRegions([]);
      }
    };

    fetchTopRegions();
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const displayedRegionLabel = useMemo(() => {
    if (selectedRegion && regionLabelParam !== "전체") {
      return formatRegionLabel(selectedRegion);
    }
    return ALL_REGION;
  }, [selectedRegion, regionLabelParam]);

  const displayedSportLabel = selectedSport?.name ?? ALL_SPORT;
  const mapInitialAddress = useMemo(() => {
    if (selectedRegion) {
      return formatRegionLabel(selectedRegion);
    }

    if (memberRegion) {
      return [memberRegion.sido, memberRegion.sigungu, memberRegion.dong]
        .filter(Boolean)
        .join(" ");
    }

    return "";
  }, [memberRegion, selectedRegion]);

  const mobileSummary = `${displayedRegionLabel} · ${displayedSportLabel} · ${
    statusParam ? STATUS_MAP[statusParam] || statusParam : ALL_STATUS
  }`;

  const updateURLParams = useCallback((newParams) => {
    setSearchParams((prevParams) => {
      const nextParams = new URLSearchParams(prevParams);
      let hasChanges = false;

      Object.entries(newParams).forEach(([key, value]) => {
        const currentValue = nextParams.get(key) ?? "";
        const newValue = value ?? "";

        if (currentValue !== newValue) {
          hasChanges = true;
          if (newValue) {
            nextParams.set(key, newValue);
          } else {
            nextParams.delete(key);
          }
        }
      });

      if (!hasChanges) {
        return prevParams;
      }

      const isPageChange = "page" in newParams;
      if (!isPageChange) {
        nextParams.set("page", "1");
      }

      return nextParams;
    });
  }, [setSearchParams]);

  const handlePageChange = (page) => {
    updateURLParams({ page: String(page) });

    if (!listStartRef.current) {
      return;
    }

    const listTop =
      listStartRef.current.getBoundingClientRect().top + window.scrollY - 8;

    window.scrollTo({ top: listTop, behavior: "smooth" });
  };

  const resetFilters = () => {
    setTempKeyword("");
    setSearchParams({
      regionLabel: "전체",
      page: "1"
    });
  };

  const applyRegionSelection = (selection) => {
    const label = formatRegionLabel(selection);
    updateURLParams({
      regionLabel: label,
      page: "1"
    });
    setIsRegionModalOpen(false);
  };

  const applySportSelection = (sport) => {
    updateURLParams({
      sportName: sport ? sport.name : "",
      page: "1"
    });
    setIsSportModalOpen(false);
  };

  const isMyHostedMeeting = (meeting) => {
    if (!isAuthenticated || !user || !meeting) {
      return false;
    }

    const currentUserId = Number(user.memberId);
    const hostIds = [
      meeting.hostUserId,
      meeting.hostId,
      meeting.meetingHostId,
      meeting.userId,
    ];

    if (
      Number.isFinite(currentUserId) &&
      hostIds.some((hostId) => Number(hostId) === currentUserId)
    ) {
      return true;
    }

    return Boolean(
      user.nickname &&
        meeting.meetingHostName &&
        user.nickname === meeting.meetingHostName,
    );
  };

  const getButtonText = (meeting) => {
    if (isMyHostedMeeting(meeting)) {
      return "내 모임";
    }

    if (meeting.status !== "RECRUITING") {
      return STATUS_MAP[meeting.status] || "알 수 없음";
    }

    if (!isAuthenticated || !meeting.myParticipantStatus) {
      return "신청 가능";
    }

    switch (meeting.myParticipantStatus) {
      case "PENDING":
        return "승인 대기 중";
      case "APPROVED":
        return "참가 확정";
      case "REJECTED":
        return "신청 반려";
      default:
        return "신청 가능";
    }
  };

  const getButtonClass = (meeting) => {
    if (isMyHostedMeeting(meeting)) {
      return styles.actionOwned;
    }

    if (
      meeting.status !== "RECRUITING" ||
      (isAuthenticated && meeting.myParticipantStatus === "REJECTED")
    ) {
      return styles.actionClosed;
    }

    if (!isAuthenticated || !meeting.myParticipantStatus) {
      return styles.actionAvailable;
    }

    switch (meeting.myParticipantStatus) {
      case "PENDING":
        return styles.actionPending;
      case "APPROVED":
        return styles.actionApproved;
      default:
        return styles.actionAvailable;
    }
  };

  return (
    <DashboardShell
      active="모임 찾기"
      title="모임 찾기"
      description="지역과 운동 종목을 기준으로 지금 참여할 수 있는 모임을 빠르게 골라보세요."
      sidebarInterestItems={sidebarInterestItems}
      aside={
        <>
          <section className={styles.dashboardPanel}>
            <div className={styles.dashboardPanelHead}>
              <h3>인기 지역</h3>
            </div>
            <div className={styles.dashboardSimpleList}>
              {topRegions.map((item, index) => {
                const regionLabel = formatTopRegionLabel(item);
                const meetingCount =
                  item && typeof item === "object" ? item.count : 0;

                return (
                  <div key={`${regionLabel}-${index}`}>
                    <span>
                      {index + 1}. {regionLabel}
                    </span>
                    <strong>{meetingCount}개</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.dashboardPanel}>
            <div className={styles.dashboardPanelHead}>
              <h3>이번 주 일정</h3>
            </div>
            <div className={styles.dashboardScheduleList}>
              {scheduleItems.length ? (
                scheduleItems.map((meeting) => {
                  const relativeDate = buildRelativeText(meeting.meetingDate);
                  const weekday = getWeekdayLabel(meeting.meetingDate);
                  const displayDate = relativeDate.includes("일 전") || relativeDate.includes("일 후") 
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
        </>
      }
    >
      <section className={styles.notice}>
        <div>
          <h1>이번 주말, 동네에서 같이 운동할 사람을 찾아보세요.</h1>
          <p>
            운동 종목과 지역을 선택하면 모집 중인 모임을 빠르게 확인할 수
            있습니다.
          </p>
        </div>
        <Link to="/meetings/new">모임 만들기</Link>
      </section>

      <div className={styles.mobileFilterBar}>
        <button type="button" onClick={() => setIsFilterOpen(true)}>
          필터 열기
        </button>
        <span>{mobileSummary}</span>
      </div>

      <section className={styles.filterPanel} ref={listStartRef}>
        <div className={styles.selectionBar}>
          <strong>
            {displayedRegionLabel} · {displayedSportLabel}
          </strong>
          <span>
            {selectedRegion && regionLabelParam !== "전체"
              ? "선택한 지역 기준으로 조회 중"
              : isAuthenticated && memberRegion && regionLabelParam === `${memberRegion.sido} ${memberRegion.sigungu}`
                ? "사용자의 지역 기준으로 조회 중"
                : "전체 지역 기준으로 조회 중"}
          </span>
        </div>

        <div className={styles.filterRow}>
          <button
            type="button"
            className={styles.pickerButton}
            onClick={() => setIsRegionModalOpen(true)}
          >
            지역 조회
          </button>

          <button
            type="button"
            className={styles.pickerButton}
            onClick={() => setIsSportModalOpen(true)}
          >
            운동 조회
          </button>

          <select
            value={statusParam}
            onChange={(event) => {
              updateURLParams({ status: event.target.value });
            }}
          >
            <option value="">전체 상태</option>
            <option value="RECRUITING">모집중</option>
            <option value="CLOSED">모집완료</option>
            <option value="ONGOING">진행중</option>
            <option value="COMPLETED">모임완료</option>
          </select>

          <ReactCalendarDatePicker
            value={meetingDateParam}
            buttonClassName={styles.dateFilterButton}
            onChange={(event) => {
              updateURLParams({ meetingDate: event.target.value });
            }}
          />

          <input
            value={tempKeyword}
            onChange={(event) => setTempKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateURLParams({ keyword: tempKeyword });
              }
            }}
            placeholder="운동명, 제목, 지역 검색"
          />

          <button
            type="button"
            className={styles.resetButton}
            onClick={resetFilters}
          >
            <UiIcon name="refresh" className={styles.resetIcon} />
            초기화
          </button>
        </div>
      </section>

      <MeetingMap
        meetings={mapMeetingList}
        onSelectMeeting={handleSelectMeeting}
        initialAddress={mapInitialAddress}
      />

      <section className={styles.meetingResultsCard}>
        <div className={styles.listHead}>
          <div className={styles.listHeadCopy}>
            <span className={styles.listEyebrow}>LIVE MEETINGS</span>
            <h2>
              {displayedRegionLabel === ALL_REGION
                ? "전체 지역"
                : displayedRegionLabel}{" "}
              모임
            </h2>
            <p>
              지금 열려 있는 모임을 한눈에 비교하고 바로 참여 요청까지 이어가세요.
            </p>
          </div>
          <div className={styles.listHeadCount}>
            <span className={styles.listCountLabel}>RESULT</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div className={styles.meetingList}>
          {meetingList.length === 0 ? (
            <div className={styles.emptyList}>
              <div className={styles.emptyIconWrap}>
                <UiIcon name="search" className={styles.emptyIcon} />
              </div>
              <span className={styles.emptyEyebrow}>NO MATCH FOUND</span>
              <h3>조건에 맞는 모임이 없습니다</h3>
              <p>
                지역, 종목, 날짜를 조금만 넓혀보면 바로 참여할 수 있는 모임이 더
                잘 보여요.
              </p>
              <div className={styles.emptyActions}>
                <button type="button" onClick={resetFilters}>
                  <UiIcon name="refresh" className={styles.emptyButtonIcon} />
                  검색 조건 초기화
                </button>
                <Link to="/search" className={styles.emptyLink}>
                  <UiIcon name="spark" className={styles.emptyButtonIcon} />
                  통합 검색으로 둘러보기
                </Link>
              </div>
            </div>
          ) : (
            meetingList.map((meeting) => {
            const fallbackThumbnail =
              meetingImages[meeting.meetingId] ||
              meetingImages[meeting.id] ||
              defaultThumbnail;

            return (
              <Link
                key={meeting.meetingId}
                className={cx(
                  "listCard",
                  meeting.status === "RECRUITING" && "listCardRecruiting",
                  meeting.status === "ONGOING" && "listCardOngoing",
                  meeting.status === "COMPLETED" && "listCardCompleted",
                  (meeting.status === "CLOSED" ||
                    meeting.status === "CANCELLED") &&
                    "listCardClosed",
                )}
                to={`/meetings/${meeting.meetingId}`}
              >
              <div className={styles.listCardBody}>
                <img
                  src={meeting.thumbnailImage || fallbackThumbnail}
                  alt={meeting.title}
                  className={styles.listCardImage}
                  onError={(e) => {
                    e.currentTarget.src = fallbackThumbnail;
                  }}
                />

                <div className={styles.listCardContent}>
                  <div className={styles.listTags}>
                    <span className={styles.badge}>{meeting.sportName}</span>
                    <span
                      className={cx(
                        "badge",
                        meeting.status === "CLOSED" ||
                          meeting.status === "CANCELLED"
                          ? "warning"
                          : "success",
                      )}
                    >
                      {STATUS_MAP[meeting.status] || "알 수 없음"}
                    </span>
                  </div>

                  <h3>{meeting.title}</h3>
                  <p>{meeting.content}</p>

                  <div className={styles.listMeta}>
                    <span>
                      <UiIcon
                        name="location"
                        className={styles.dashboardMetaIcon}
                      />
                      {meeting.regionName}
                    </span>
                    <span className={styles.metaDivider}></span>
                    <span>
                      <UiIcon
                        name="compass"
                        className={styles.dashboardMetaIcon}
                      />
                      {meeting.placeName}
                    </span>
                  </div>

                  <div className={styles.host} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img
                        src={
                          meeting.hostProfileImage ||
                          defaultUserImage
                        }
                        alt={meeting.meetingHostName}
                        className={styles.dashboardHostAvatar}
                        onError={(e) => {
                          e.currentTarget.src = defaultUserImage;
                        }}
                      />
                      <span>{meeting.meetingHostName || "익명"}</span>
                    </div>
                    <div className={styles.participantMetaRow}>
                      <div className={styles.participantMetaHeader}>
                        <span className={styles.participantCount}>
                          <UiIcon
                            name="user"
                            className={styles.dashboardMetaIcon}
                          />
                          {meeting.approvedCount || 1}/{meeting.maxMembers}명
                        </span>
                        <strong className={styles.progressPercentText}>
                          {Math.round(((meeting.approvedCount || 1) / meeting.maxMembers) * 100)}%
                        </strong>
                      </div>
                      <div className={styles.progressBarBg}>
                        <div 
                          className={styles.progressBarFill} 
                          style={{ width: `${Math.min(100, Math.round(((meeting.approvedCount || 1) / meeting.maxMembers) * 100))}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside>
                <div className={styles.dateBox}>
                  <span>
                    {meeting.meetingDate
                      ? String(meeting.meetingDate)
                          .split("-")
                          .slice(1)
                          .join(".")
                      : "-"}
                  </span>
                  <strong>
                    {meeting.startTime
                      ? String(meeting.startTime).slice(0, 5)
                      : "-"}
                    {meeting.endTime
                      ? ` ~ ${
                          String(meeting.endTime).slice(0, 5) <
                          String(meeting.startTime || "").slice(0, 5)
                            ? "다음 날 "
                            : ""
                        }${String(meeting.endTime).slice(0, 5)}`
                      : ""}
                  </strong>
                </div>

                <button
                  type="button"
                  className={styles.shareButton}
                  aria-label={`${meeting.title} 링크 공유`}
                  onClick={(event) =>
                    handleShareMeeting(event, meeting.meetingId)
                  }
                >
                  <UiIcon
                    name="share"
                    className={styles.dashboardActionIcon}
                  />
                  공유
                </button>

                <button
                  type="button"
                  className={getButtonClass(meeting)}
                >
                  {getButtonText(meeting)}
                </button>
              </aside>
              </Link>
            );
            })
          )}
        </div>

        {totalCount > 0 && (
          <div className={styles.paginationWrapper}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              variant="centered"
            />
          </div>
        )}
      </section>

      <AppModal
        open={isFilterOpen}
        variant="sheet"
        eyebrow="모임 필터"
        title="원하는 모임만 빠르게 볼까요?"
        description="지역과 운동 종목을 모달에서 고르고 세부 조건을 조정할 수 있습니다."
        confirmText="필터 적용"
        onClose={() => setIsFilterOpen(false)}
        onConfirm={() => setIsFilterOpen(false)}
      >
        <div className={styles.sheetPickerGrid}>
          <button
            type="button"
            onClick={() => {
              setIsFilterOpen(false);
              setIsRegionModalOpen(true);
            }}
          >
            지역 조회
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFilterOpen(false);
              setIsSportModalOpen(true);
            }}
          >
            운동 조회
          </button>
        </div>

        <div className={styles.sheetFilterFields}>
          <select
            value={statusParam}
            onChange={(event) => {
              updateURLParams({ status: event.target.value });
            }}
          >
            <option value="">전체 상태</option>
            <option value="RECRUITING">모집중</option>
            <option value="CLOSED">모집완료</option>
            <option value="ONGOING">진행중</option>
            <option value="COMPLETED">모임완료</option>
          </select>

          <ReactCalendarDatePicker
            value={meetingDateParam}
            buttonClassName={styles.dateFilterButton}
            onChange={(event) => {
              updateURLParams({ meetingDate: event.target.value });
            }}
          />

          <div className={styles.sheetSearchBox}>

            <input
              value={tempKeyword}
              onChange={(event) => setTempKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateURLParams({ keyword: tempKeyword });
                  setIsFilterOpen(false); // 엔터치면 모달도 닫히게 처리
                }
              }}
              placeholder="검색어를 입력하세요"
            />
          </div>

          <button
            type="button"
            className={styles.mobileResetBtn}
            onClick={() => {
              resetFilters();
              setIsFilterOpen(false);
            }}
          >
            <UiIcon name="refresh" className={styles.mobileResetIcon} />
            필터 초기화
          </button>
        </div>
      </AppModal>

      <MeetingRegionPickerModal
        open={isRegionModalOpen}
        regions={regionOptions}
        initialSelection={selectedRegion}
        onApply={applyRegionSelection}
        onClose={() => setIsRegionModalOpen(false)}
      />

      <SportPickerModal
        open={isSportModalOpen}
        sports={sportOptions}
        selectedSportId={selectedSport?.sportId ?? null}
        onApply={applySportSelection}
        onClose={() => setIsSportModalOpen(false)}
      />
    </DashboardShell>
  );
}
