import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import defaultUserImage from "../assets/image/Default-user.png";
import AppModal from "../components/AppModal";
import Pagination from "../components/Pagination";
import RegionPickerModal from "../components/RegionPickerModal";
import {
  createAdminSport,
  deleteAdminSport,
  getAdminMeetings,
  getAdminMembers,
  getAdminRegions,
  getAdminReports,
  getAdminSports,
  getSummary,
  updateAdminSport,
  processAdminReport,
} from "../api/adminApi";
import { useToast } from "../contexts/ToastContext";
import styles from "../styles/AdminPage.module.css";

const cx = (...names) =>
    names
        .flat()
        .filter(Boolean)
        .map((name) => styles[name] ?? name)
        .join(" ");

const PAGE_SIZE = 10;
const ALL_SIDO = "전체 시도";
const ALL_SIGUNGU = "전체 시군구";
const ALL_DONG = "전체 읍면동";
const ALL_CATEGORY = "전체 카테고리";

const tabs = [
  { id: "members", label: "회원 관리" },
  { id: "meetings", label: "모임 관리" },
  { id: "reports", label: "신고 내역" },
  { id: "sports", label: "운동 종목" },
];

const summaryCards = [
  {
    key: "totalMembers",
    label: "전체 회원",
    toneClass: "summaryCardMembers",
    caption: "가입을 완료한 전체 회원 수",
  },
  {
    key: "totalMeetings",
    label: "등록 모임",
    toneClass: "summaryCardMeetings",
    caption: "현재 서비스에 등록된 전체 모임 수",
  },
  {
    key: "pendingReports",
    label: "대기 신고",
    toneClass: "summaryCardReports",
    caption: "빠른 확인이 필요한 미처리 신고 수",
  },
  {
    key: "totalSports",
    label: "운동 종목",
    toneClass: "summaryCardSports",
    caption: "서비스에서 관리 중인 전체 종목 수",
  },
];

const initialSummary = {
  totalMembers: 0,
  totalMeetings: 0,
  pendingReports: 0,
  totalSports: 0,
};

const initialSportForm = {
  name: "",
  category: "",
  isActive: true,
};

const meetingStatusText = {
  RECRUITING: "모집중",
  CLOSED: "모집완료",
  ONGOING: "진행중",
  COMPLETED: "모임완료",
  CANCELLED: "취소됨",
};

const reportStatusText = {
  PENDING: "대기중",
  RESOLVED: "처리완료",
  REJECTED: "반려됨",
};

const roleText = {
  USER: "유저",
  ADMIN: "관리자",
};

const memberStatusText = {
  ACTIVE: "활동중",
  SUSPENDED: "정지",
  DELETED: "탈퇴",
};

const sportStatusOptions = [
  { value: true, label: "사용중" },
  { value: false, label: "비활성" },
];

const normalizeText = (value = "") => String(value).trim();

// 신고 대상 번역 함수
const translateTarget = (target) => {
  if (!target) return "";
  const t = String(target).toUpperCase();
  if (t === "MEMBER") return "회원";
  if (t === "MEETING") return "모임";
  if (t === "COMMENT") return "댓글";
  return target;
};

// 신고 사유 번역 함수 (노쇼 추가)
const translateReason = (reason) => {
  if (!reason) return "-";
  const r = String(reason).toUpperCase();
  if (r.includes("SPAM") || r.includes("PROMOTION")) return "스팸/홍보성";
  if (r.includes("ABUSE") || r.includes("PROFANITY") || r.includes("INSULT")) return "욕설/비방";
  if (r.includes("INAPPROPRIATE") || r.includes("OBSCENE")) return "부적절한 내용";
  if (r.includes("FRAUD") || r.includes("SCAM")) return "사기/거짓 정보";
  if (r.includes("ADVERTISEMENT") || r.includes("AD")) return "상업적 광고";
  if (r.includes("NO_SHOW") || r.includes("NOSHOW")) return "노쇼";
  if (r === "OTHER") return "기타";

  return reason;
};

const getReportContent = (report) => {
  const content =
    report?.content ??
    report?.reportContent ??
    report?.detail ??
    report?.originalData?.content ??
    report?.originalData?.reportContent ??
    report?.originalData?.detail ??
    "";

  return String(content).trim();
};

const getReportRawReason = (report) =>
  report?.rawReason ?? report?.originalData?.reason ?? report?.reason ?? "";

const normalizeReportDetail = (value) =>
  String(value ?? "")
    .replace(/^\[상세 내용\]\s*/u, "")
    .trim();

const parseReportContent = (report) => {
  const rawContent = getReportContent(report);
  const rawReason = String(getReportRawReason(report)).toUpperCase();
  const emptyMessage = "상세 내용 없음";

  const labeledMatch = rawContent.match(
    /^\[직접 입력 사유\]\s*(.+?)(?:\r?\n\r?\n\[상세 내용\]\r?\n([\s\S]*)|\r?\n([\s\S]*)|$)/u,
  );

  if (labeledMatch) {
    const detail = normalizeReportDetail(labeledMatch[2] ?? labeledMatch[3] ?? "");
    return {
      customReason: labeledMatch[1].trim(),
      detail,
      summary: detail ? detail.replace(/\s+/g, " ") : emptyMessage,
    };
  }

  const legacyMatch = rawContent.match(/^\[직접 입력 사유:?\s*(.+?)\]\s*([\s\S]*)$/u);

  if (legacyMatch) {
    const detail = normalizeReportDetail(legacyMatch[2]);
    return {
      customReason: legacyMatch[1].trim(),
      detail,
      summary: detail ? detail.replace(/\s+/g, " ") : emptyMessage,
    };
  }

  if (rawReason === "OTHER") {
    const lines = rawContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const customReason = lines[0] ?? "";
    const detail = normalizeReportDetail(lines.slice(1).join("\n"));

    return {
      customReason,
      detail,
      summary: detail ? detail.replace(/\s+/g, " ") : emptyMessage,
    };
  }

  return {
    customReason: "",
    detail: rawContent,
    summary: rawContent ? rawContent.replace(/\s+/g, " ") : emptyMessage,
  };
};

const parseRegionLabel = (label = "") => {
  const [sido = "", sigungu = "", dong = ""] = normalizeText(label).split(/\s+/);
  return { sido, sigungu, dong };
};

const matchesRegionSelection = (regionLabel, sido, sigungu, dong) => {
  const parsed = parseRegionLabel(regionLabel);
  return (
      (sido === ALL_SIDO || parsed.sido === sido) &&
      (sigungu === ALL_SIGUNGU || parsed.sigungu === sigungu) &&
      (dong === ALL_DONG || parsed.dong === dong)
  );
};

const formatMeetingDate = (meetingDate) => {
  if (!meetingDate) return "-";
  return String(meetingDate);
};

const formatMeetingTime = (startTime) => {
  if (!startTime) return "--:--";
  return String(startTime).slice(0, 5);
};

const formatCreatedDate = (createdAt) => {
  if (!createdAt) return "-";
  return String(createdAt).slice(0, 10);
};

const paginate = (items, page) => {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
};

const badgeToneByMemberStatus = (status) => {
  if (status === "SUSPENDED" || status === "DELETED") return "warning";
  return "success";
};

const badgeToneByMeetingStatus = (status) => {
  if (status === "CLOSED" || status === "CANCELLED") return "warning";
  return "success";
};

const badgeToneByReportStatus = (status) => {
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "success";
};

const includesAllTerms = (sourceText, keyword) => {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }
  const terms = normalizedKeyword.split(/\s+/).filter(Boolean);
  const searchBase = normalizeText(sourceText).toLowerCase();
  return terms.every((term) => searchBase.includes(term));
};

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("members");
  const [summary, setSummary] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [regions, setRegions] = useState([]);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [sports, setSports] = useState([]);
  const [reports, setReports] = useState([]);

  const [selectedSido, setSelectedSido] = useState(ALL_SIDO);
  const [selectedSigungu, setSelectedSigungu] = useState(ALL_SIGUNGU);
  const [selectedDong, setSelectedDong] = useState(ALL_DONG);
  const [selectedMeetingCategory, setSelectedMeetingCategory] = useState(ALL_CATEGORY);
  const [selectedSportCategory, setSelectedSportCategory] = useState(ALL_CATEGORY);
  const [selectedSportUsage, setSelectedSportUsage] = useState("ALL");
  const [selectedMemberStatus, setSelectedMemberStatus] = useState("ALL");
  const [memberKeyword, setMemberKeyword] = useState("");
  const [meetingKeyword, setMeetingKeyword] = useState("");
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [draftRegionSelection, setDraftRegionSelection] = useState({
    sido: ALL_SIDO,
    sigungu: ALL_SIGUNGU,
    dong: ALL_DONG,
  });

  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [sportForm, setSportForm] = useState(initialSportForm);
  const [sportFormError, setSportFormError] = useState("");

  const [updatingSportId, setUpdatingSportId] = useState(null);
  const [deletingSportId, setDeletingSportId] = useState(null);

  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);
  const [selectedMeetingDetail, setSelectedMeetingDetail] = useState(null);

  // 신고 처리 관련 상태
  const [selectedReportAction, setSelectedReportAction] = useState(null);
  const [reportActionForm, setReportActionForm] = useState({
    actionType: "WARNING", // WARNING(경고알림), SUSPEND(정지), REJECT(반려)
    suspendDuration: "24", // 시간 단위 (문자열)
    message: "", // 유저에게 보낼 메시지
  });

  const [pages, setPages] = useState({
    members: 1,
    meetings: 1,
    reports: 1,
    sports: 1,
  });

  const updatePage = (tab, nextPage) => {
    setPages((current) => ({ ...current, [tab]: nextPage }));
  };

  const changeTab = (nextTab) => {
    setActiveTab(nextTab);
    navigate(`/admin#${nextTab}`);
    window.setTimeout(() => {
      document.getElementById(nextTab)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    const [
      summaryResult,
      membersResult,
      regionsResult,
      meetingsResult,
      sportsResult,
      reportsResult,
    ] = await Promise.allSettled([
      getSummary(),
      getAdminMembers(),
      getAdminRegions(),
      getAdminMeetings(),
      getAdminSports(),
      getAdminReports(),
    ]);

    if (summaryResult.status === "fulfilled" && summaryResult.value.data) {
      setSummary({
        totalMembers: summaryResult.value.data.totalMembers ?? 0,
        totalMeetings: summaryResult.value.data.totalMeetings ?? 0,
        pendingReports: summaryResult.value.data.pendingReports ?? 0,
        totalSports: summaryResult.value.data.totalSports ?? 0,
      });
    }

    if (
        membersResult.status === "fulfilled" &&
        Array.isArray(membersResult.value.data)
    ) {
      setMembers(
          membersResult.value.data
              .filter((member) => (member.role ?? "USER") !== "ADMIN")
              .map((member) => ({
                id: member.userId,
                loginId: member.loginId,
                nickname: member.nickname,
                profileImage:
                    typeof member.profileImage === "string" && member.profileImage.trim()
                        ? member.profileImage.trim()
                        : defaultUserImage,
                region: member.regionName ?? "-",
                role: member.role ?? "USER",
                status: member.status ?? "ACTIVE",
                roleText: roleText[member.role] ?? member.role ?? "유저",
                statusText:
                    memberStatusText[member.status] ?? member.status ?? "활동중",
              })),
      );
    }

    if (
        regionsResult.status === "fulfilled" &&
        Array.isArray(regionsResult.value.data)
    ) {
      setRegions(
          regionsResult.value.data
              .map((region) => ({
                regionId: region.regionId,
                sido: normalizeText(region.sido),
                sigungu: normalizeText(region.sigungu),
                dong: normalizeText(region.dong),
              }))
              .filter((region) => region.sido && region.sigungu && region.dong),
      );
    }

    if (
        meetingsResult.status === "fulfilled" &&
        Array.isArray(meetingsResult.value.data)
    ) {
      setMeetings(
          meetingsResult.value.data.map((meeting) => ({
            id: meeting.meetingId,
            title: meeting.title ?? "-",
            sport: meeting.sportName ?? "-",
            sportCategory: meeting.sportCategory ?? "기타",
            region: meeting.regionName ?? "-",
            meetingDate: formatMeetingDate(meeting.meetingDate),
            startTime: formatMeetingTime(meeting.startTime),
            createdAt: formatCreatedDate(meeting.createdAt),
            current: meeting.approvedCount ?? 0,
            max: meeting.maxMembers ?? 0,
            status: meeting.status ?? "RECRUITING",
            statusText:
                meetingStatusText[meeting.status] ?? meeting.status ?? "모집중",
            hostNickname: meeting.hostNickname ?? "-",
          })),
      );
    }

    if (
        sportsResult.status === "fulfilled" &&
        Array.isArray(sportsResult.value.data)
    ) {
      setSports(
          sportsResult.value.data.map((sport) => ({
            id: sport.sportId,
            name: sport.name ?? "-",
            category: sport.category ?? "기타",
            isActive: sport.isActive ?? true,
          })),
      );
    }

    if (
        reportsResult.status === "fulfilled" &&
        Array.isArray(reportsResult.value.data)
    ) {
      setReports(
          reportsResult.value.data.map((report) => {
            const targetName =
                report.reportedNickname ||
                report.targetNickname ||
                report.targetName ||
                report.targetTitle ||
                report.target;

            let displayTarget = targetName;

            if (targetName === "MEMBER" || targetName === "MEETING" || targetName === "COMMENT") {
              const translated = translateTarget(targetName);
              const id = report.targetId || report.reportedId;
              displayTarget = id ? `${translated} (ID: ${id})` : translated;
            } else if (report.targetType) {
              displayTarget = `[${translateTarget(report.targetType)}] ${targetName}`;
            }

            if (!displayTarget) {
              displayTarget = `신고 #${report.reportId}`;
            }

            const targetUserId =
                report.targetUserId ?? report.targetId ?? report.reportedId ?? null;

            return {
              id: report.reportId,
              target: displayTarget,
              targetUserId,
              targetId: targetUserId,
              rawReason: report.reason,
              reason: translateReason(report.reason),
              content: getReportContent(report),
              status: report.status ?? "PENDING",
              statusText: reportStatusText[report.status] ?? report.status ?? "대기중",
              createdAt: report.createdAt ? String(report.createdAt).slice(0, 10) : "-",
              originalData: report // 백엔드로 넘길 때 필요할 수 있으므로 원본 유지
            };
          }),
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (tabs.some((tab) => tab.id === hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  const regionHierarchy = useMemo(() => {
    const grouped = new Map();

    regions.forEach((region) => {
      if (!grouped.has(region.sido)) {
        grouped.set(region.sido, new Map());
      }
      const sigunguMap = grouped.get(region.sido);
      if (!sigunguMap.has(region.sigungu)) {
        sigunguMap.set(region.sigungu, []);
      }
      sigunguMap.get(region.sigungu).push(region.dong);
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
  }, [regions]);

  const meetingCategoryOptions = useMemo(
      () =>
          [...new Set(meetings.map((meeting) => meeting.sportCategory))].sort(
              (left, right) => left.localeCompare(right, "ko"),
          ),
      [meetings],
  );

  const sportCategoryOptions = useMemo(
      () =>
          [...new Set(sports.map((sport) => sport.category))].sort((left, right) =>
              left.localeCompare(right, "ko"),
          ),
      [sports],
  );

  const normalizedSportNames = useMemo(
      () => new Set(sports.map((sport) => normalizeText(sport.name).toLowerCase())),
      [sports],
  );

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesRegion = matchesRegionSelection(
          member.region,
          selectedSido,
          selectedSigungu,
          selectedDong,
      );
      const matchesStatus =
          selectedMemberStatus === "ALL" || member.status === selectedMemberStatus;
      const searchBase = [
        member.nickname,
        member.loginId,
        String(member.id),
        member.region,
      ].join(" ");

      return matchesRegion && matchesStatus && includesAllTerms(searchBase, memberKeyword);
    });
  }, [members, memberKeyword, selectedMemberStatus, selectedSido, selectedSigungu, selectedDong]);

  const filteredMeetings = useMemo(() => {
    const keyword = normalizeText(meetingKeyword).toLowerCase();

    return meetings.filter((meeting) => {
      const matchesRegion = matchesRegionSelection(
          meeting.region,
          selectedSido,
          selectedSigungu,
          selectedDong,
      );
      const matchesCategory =
          selectedMeetingCategory === ALL_CATEGORY ||
          meeting.sportCategory === selectedMeetingCategory;

      if (!keyword) {
        return matchesRegion && matchesCategory;
      }

      const searchBase = [
        meeting.title,
        meeting.hostNickname,
        meeting.sport,
        meeting.region,
        `M${String(meeting.id).padStart(3, "0")}`,
      ].join(" ").toLowerCase();

      return matchesRegion && matchesCategory && searchBase.includes(keyword);
    });
  }, [meetings, meetingKeyword, selectedSido, selectedSigungu, selectedDong, selectedMeetingCategory]);

  const filteredSports = useMemo(
      () =>
          sports.filter(
              (sport) =>
                  (selectedSportCategory === ALL_CATEGORY ||
                      sport.category === selectedSportCategory) &&
                  (selectedSportUsage === "ALL" ||
                      (selectedSportUsage === "ACTIVE" && sport.isActive) ||
                      (selectedSportUsage === "INACTIVE" && !sport.isActive)),
          ),
      [sports, selectedSportCategory, selectedSportUsage],
  );

  const memberPageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const meetingPageCount = Math.max(1, Math.ceil(filteredMeetings.length / PAGE_SIZE));
  const reportPageCount = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const sportPageCount = Math.max(1, Math.ceil(filteredSports.length / PAGE_SIZE));

  const memberPage = Math.min(pages.members, memberPageCount);
  const meetingPage = Math.min(pages.meetings, meetingPageCount);
  const reportPage = Math.min(pages.reports, reportPageCount);
  const sportPage = Math.min(pages.sports, sportPageCount);

  const pagedMembers = paginate(filteredMembers, memberPage);
  const pagedMeetings = paginate(filteredMeetings, meetingPage);
  const pagedReports = paginate(reports, reportPage);
  const pagedSports = paginate(filteredSports, sportPage);
  const selectedReportContent = selectedReportAction
    ? parseReportContent(selectedReportAction)
    : null;

  const regionSummary = [selectedSido, selectedSigungu, selectedDong]
      .filter((value) => value !== ALL_SIDO && value !== ALL_SIGUNGU && value !== ALL_DONG)
      .join(" · ");

  let filterSummaryText = "";
  let filterPanelTitle = "";
  let filterPanelDescription = "";

  if (activeTab === "sports") {
    filterSummaryText = `${selectedSportCategory === ALL_CATEGORY ? "전체 카테고리" : selectedSportCategory} 기준으로 종목을 보고 있습니다.`;
    filterPanelTitle = "카테고리별 조회";
    filterPanelDescription = "운동 종목은 카테고리별로 나눠서 빠르게 확인할 수 있습니다.";
  } else if (activeTab === "reports") {
    filterSummaryText = "전체 신고 내역을 보고 있습니다.";
    filterPanelTitle = "신고 내역 조회";
    filterPanelDescription = "접수된 신고 내역을 최신순으로 확인합니다.";
  } else {
    filterSummaryText = `${regionSummary || "전체 지역"} 기준으로 목록을 보고 있습니다.`;
    filterPanelTitle = "지역별 조회";
    filterPanelDescription = "시도, 시군구, 읍면동을 차례대로 선택해 목록을 좁혀볼 수 있습니다.";
  }

  const resetSelection = () => {
    setSelectedSido(ALL_SIDO);
    setSelectedSigungu(ALL_SIGUNGU);
    setSelectedDong(ALL_DONG);
    setDraftRegionSelection({
      sido: ALL_SIDO,
      sigungu: ALL_SIGUNGU,
      dong: ALL_DONG,
    });
    setSelectedMeetingCategory(ALL_CATEGORY);
    setSelectedSportCategory(ALL_CATEGORY);
    setMemberKeyword("");
    setMeetingKeyword("");
    setPages({ members: 1, meetings: 1, reports: 1, sports: 1 });
  };

  const closeSportModal = () => {
    setIsSportModalOpen(false);
    setSportForm(initialSportForm);
    setSportFormError("");
  };

  const openRegionModal = () => {
    setDraftRegionSelection({ sido: selectedSido, sigungu: selectedSigungu, dong: selectedDong });
    setIsRegionModalOpen(true);
  };

  const closeRegionModal = () => {
    setDraftRegionSelection({ sido: selectedSido, sigungu: selectedSigungu, dong: selectedDong });
    setIsRegionModalOpen(false);
  };

  const applyRegionSelection = (selection) => {
    setSelectedSido(selection.sido);
    setSelectedSigungu(selection.sigungu);
    setSelectedDong(selection.dong);
    setDraftRegionSelection(selection);
    updatePage("members", 1);
    updatePage("meetings", 1);
    setIsRegionModalOpen(false);
  };

  const submitSport = async () => {
    const normalizedName = sportForm.name.trim();
    const normalizedCategory = sportForm.category.trim();

    if (!normalizedName) {
      setSportFormError("종목명을 입력해주세요.");
      return;
    }
    if (!normalizedCategory) {
      setSportFormError("카테고리를 선택해주세요.");
      return;
    }
    if (normalizedSportNames.has(normalizedName.toLowerCase())) {
      setSportFormError("이미 존재하는 종목명입니다.");
      return;
    }

    try {
      setSportFormError("");
      await createAdminSport({
        name: normalizedName,
        category: normalizedCategory,
        isActive: sportForm.isActive,
      });

      await loadAdminData();
      closeSportModal();
      updatePage("sports", 1);
    } catch (error) {
      setSportFormError(error?.response?.data?.message ?? "종목을 추가하지 못했습니다.");
    }
  };

  const handleSportStatusChange = async (sport, nextActive) => {
    setUpdatingSportId(sport.id);
    try {
      await updateAdminSport(sport.id, {
        name: sport.name,
        category: sport.category,
        isActive: nextActive,
      });
      await loadAdminData();
      toast.success("종목 상태 변경", "종목 사용 상태를 반영했습니다.");
    } catch {
      toast.error("종목 상태 변경 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setUpdatingSportId(null);
    }
  };

  const handleSportDelete = async (sportId) => {
    setDeletingSportId(sportId);
    try {
      await deleteAdminSport(sportId);
      await loadAdminData();
      updatePage("sports", 1);
      toast.success("종목 삭제", "선택한 종목을 목록에서 제거했습니다.");
    } catch {
      toast.error("종목 삭제 실패", "삭제 중 문제가 발생했습니다.");
    } finally {
      setDeletingSportId(null);
    }
  };

  // 신고 처리 제출
  const submitReportAction = async () => {
    if (!selectedReportAction) return;

    if (reportActionForm.actionType !== "REJECT" && !reportActionForm.message.trim()) {
      toast.error("입력 오류", "유저에게 보낼 안내 메시지를 입력해주세요.");
      return;
    }

    const targetUserId =
        selectedReportAction.targetUserId ??
        selectedReportAction.targetId ??
        selectedReportAction.originalData?.targetUserId ??
        null;

    if (reportActionForm.actionType !== "REJECT" && !targetUserId) {
      toast.error("처리 불가", "신고 대상 회원 정보가 없어 제재를 적용할 수 없습니다.");
      return;
    }

    try {
      await processAdminReport(selectedReportAction.id, {
        actionType: reportActionForm.actionType,
        suspendDuration: Number(reportActionForm.suspendDuration),
        message: reportActionForm.message,
        targetUserId: targetUserId ? Number(targetUserId) : null,
      });

      toast.success(
          "신고 처리 완료",
          reportActionForm.actionType === "WARNING"
              ? "해당 유저에게 경고 알림을 보냈습니다."
              : reportActionForm.actionType === "SUSPEND"
                ? "계정 정지 처리가 완료되었습니다."
                : "신고가 반려되었습니다.",
      );

      await loadAdminData();
      setSelectedReportAction(null);
      setReportActionForm({ actionType: "WARNING", suspendDuration: "24", message: "" });
    } catch (error) {
      toast.error("처리 실패", error?.response?.data?.message ?? "신고 처리에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
      <div className={styles.page}>
        <div className={styles.adminShell}>
          <aside className={styles.adminSidebar}>
            <div className={styles.adminBrand}>
              <span>W</span>
              <div>
                <strong>WeMove</strong>
                <small>Admin Console</small>
              </div>
            </div>

            <nav className={styles.adminNav} aria-label="관리자 메뉴">
              {tabs.map((tab) => (
                  <button
                      key={tab.id}
                      type="button"
                      className={cx("adminNavButton", activeTab === tab.id && "adminNavButtonActive")}
                      onClick={() => changeTab(tab.id)}
                  >
                    <span className={styles.adminNavDot} />
                    {tab.label}
                  </button>
              ))}
            </nav>

          </aside>

          <div className={styles.adminWorkspace}>
        <div className={styles.pageTitle}>
          <div>
            <span className={styles.adminEyebrow}>ADMIN DASHBOARD</span>
            <h1>관리자 페이지</h1>
            <p>회원, 모임, 신고, 운동 종목 현황을 한 화면에서 관리합니다.</p>
          </div>
          <div className={styles.adminTopMeta}>
            <span>운영 상태</span>
            <strong>{isLoading ? "동기화 중" : "정상 운영"}</strong>
          </div>
        </div>

        <section className={styles.statGrid}>
          {summaryCards.map((card) => (
              <article key={card.key} className={styles[card.toneClass]}>
                <div className={styles.summaryEyebrow}>{card.label}</div>
                <strong>{summary[card.key]}</strong>
                <p className={styles.summaryCaption}>{card.caption}</p>
              </article>
          ))}
        </section>

        <section className={styles.filterPanel}>
          <div className={styles.filterHead}>
            <div>
              <h2>{filterPanelTitle}</h2>
              <p>{filterPanelDescription}</p>
            </div>
            <button type="button" onClick={resetSelection}>전체 보기</button>
          </div>

          <div className={styles.filterSummaryBar}>
            <span className={styles.filterSummaryKicker}>조회 기준</span>
            <strong>{filterSummaryText}</strong>
          </div>

          {activeTab === "members" || activeTab === "meetings" ? (
              <div className={styles.regionPickerRow}>
                <button type="button" className={styles.regionPickerButton} onClick={openRegionModal}>
                  지역 조회
                </button>
                <div className={styles.regionPickerSummary}>
                  <span className={styles.regionPickerLabel}>선택 지역</span>
                  <strong>{regionSummary || "전체 지역"}</strong>
                </div>
              </div>
          ) : null}

          {activeTab === "meetings" ? (
              <div className={styles.categorySection}>
                <span className={styles.categoryLabel}>운동 카테고리</span>
                <div className={styles.categoryChips}>
                  {[ALL_CATEGORY, ...meetingCategoryOptions].map((category) => (
                      <button
                          key={category}
                          type="button"
                          className={cx("categoryChip", selectedMeetingCategory === category && "categoryChipCurrent")}
                          onClick={() => { setSelectedMeetingCategory(category); updatePage("meetings", 1); }}
                      >
                        {category}
                      </button>
                  ))}
                </div>
              </div>
          ) : null}

          {activeTab === "sports" ? (
              <div className={styles.categorySection}>
                <span className={styles.categoryLabel}>운동 종목 카테고리</span>
                <div className={styles.categoryChips}>
                  {[ALL_CATEGORY, ...sportCategoryOptions].map((category) => (
                      <button
                          key={category}
                          type="button"
                          className={cx("categoryChip", selectedSportCategory === category && "categoryChipCurrent")}
                          onClick={() => { setSelectedSportCategory(category); updatePage("sports", 1); }}
                      >
                        {category}
                      </button>
                  ))}
                </div>
              </div>
          ) : null}

          <div className={styles.filterMeta}>
            <span>{filterSummaryText}</span>
            <strong>
              {activeTab === "sports"
                  ? `종목 ${filteredSports.length}개`
                  : activeTab === "reports"
                      ? `신고 ${reports.length}건`
                      : `회원 ${filteredMembers.length}명 · 모임 ${filteredMeetings.length}개`}
            </strong>
          </div>
        </section>

        {/* 회원 관리 탭 */}
        {activeTab === "members" ? (
            <section id="members" className={styles.tableCard}>
              <div className={styles.tableHead}>
                <div>
                  <h2>회원 관리</h2>
                  <p>닉네임, 로그인 ID로 회원을 확인합니다. 회원 상태는 신고 처리 결과로만 변경됩니다.</p>
                </div>
              </div>
              <div className={styles.tableToolbar}>
                <label className={styles.searchField}>
                  <span>회원 검색</span>
                  <input
                      value={memberKeyword}
                      onChange={(event) => { setMemberKeyword(event.target.value); updatePage("members", 1); }}
                      placeholder="닉네임, 로그인 ID, 회원 ID 검색"
                  />
                </label>
              </div>
              <table>
                <thead>
                <tr>
                  <th>회원 ID</th>
                  <th>닉네임</th>
                  <th>로그인 ID</th>
                  <th>지역</th>
                  <th>권한</th>
                  <th>상태</th>
                </tr>
                </thead>
                <tbody>
                {pagedMembers.map((member) => (
                    <tr
                        key={member.id}
                        className={styles.clickableRow}
                        onClick={() => setSelectedMemberDetail(member)}
                    >
                      <td>{member.id}</td>
                      <td>
                        <div className={styles.memberIdentity}>
                          <img src={member.profileImage} alt={`${member.nickname} 프로필`} className={styles.memberAvatar} />
                          <strong>{member.nickname}</strong>
                        </div>
                      </td>
                      <td>{member.loginId}</td>
                      <td>{member.region}</td>
                      <td>{member.roleText}</td>
                      <td>
                    <span className={cx("badge", badgeToneByMemberStatus(member.status))}>
                      {member.statusText}
                    </span>
                      </td>
                    </tr>
                ))}
                {pagedMembers.length === 0 ? (
                    <tr><td colSpan="6" className={styles.emptyCell}>선택한 조건에 해당하는 회원이 없습니다.</td></tr>
                ) : null}
                </tbody>
              </table>
              <Pagination
                  currentPage={memberPage}
                  totalPages={memberPageCount}
                  totalItems={filteredMembers.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => updatePage("members", page)}
              />
            </section>
        ) : null}

        {/* 모임 관리 탭 */}
        {activeTab === "meetings" ? (
            <section id="meetings" className={styles.tableCard}>
              <div className={styles.tableHead}>
                <div>
                  <h2>모임 관리</h2>
                  <p>제목, 주최자, 종목으로 검색할 수 있습니다.</p>
                </div>
              </div>
              <div className={styles.tableToolbar}>
                <label className={styles.searchField}>
                  <span>모임 검색</span>
                  <input
                      value={meetingKeyword}
                      onChange={(event) => { setMeetingKeyword(event.target.value); updatePage("meetings", 1); }}
                      placeholder="제목, 주최자, 종목, 모임 ID 검색"
                  />
                </label>
              </div>
              <table>
                <thead>
                <tr>
                  <th>모임 ID</th>
                  <th>제목</th>
                  <th>종목</th>
                  <th>카테고리</th>
                  <th>지역</th>
                  <th>일정</th>
                  <th>참가 인원</th>
                  <th>상태</th>
                </tr>
                </thead>
                <tbody>
                {pagedMeetings.map((meeting) => (
                    <tr key={meeting.id} className={styles.clickableRow} onClick={() => setSelectedMeetingDetail(meeting)}>
                      <td>M{String(meeting.id).padStart(3, "0")}</td>
                      <td>
                        <div className={styles.stackCell}>
                          <strong>{meeting.title}</strong>
                          <span>주최자: {meeting.hostNickname}</span>
                        </div>
                      </td>
                      <td>{meeting.sport}</td>
                      <td><span className={styles.categoryPill}>{meeting.sportCategory}</span></td>
                      <td>{meeting.region}</td>
                      <td>
                        <div className={styles.scheduleCell}>
                          <strong>{meeting.meetingDate}</strong>
                          <span>{meeting.startTime}</span>
                          <span>등록 {meeting.createdAt}</span>
                        </div>
                      </td>
                      <td>{meeting.current}/{meeting.max}</td>
                      <td>
                    <span className={cx("badge", badgeToneByMeetingStatus(meeting.status))}>
                      {meeting.statusText}
                    </span>
                      </td>
                    </tr>
                ))}
                {pagedMeetings.length === 0 ? (
                    <tr><td colSpan="8" className={styles.emptyCell}>조건에 맞는 모임이 없습니다.</td></tr>
                ) : null}
                </tbody>
              </table>
              <Pagination
                  currentPage={meetingPage}
                  totalPages={meetingPageCount}
                  totalItems={filteredMeetings.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => updatePage("meetings", page)}
              />
            </section>
        ) : null}

        {/* 신고 내역 탭 */}
        {activeTab === "reports" ? (
            <section id="reports" className={styles.tableCard}>
              <div className={styles.tableHead}>
                <div>
                  <h2>신고 내역</h2>
                  <p>최근 접수된 신고를 확인하고 제재 조치를 취할 수 있습니다.</p>
                </div>
              </div>
              <table>
                <thead>
                <tr>
                  <th>신고 ID</th>
                  <th>대상</th>
                  <th>사유</th>
                  <th>상태</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
                </thead>
                <tbody>
                {pagedReports.map((report) => {
                  const reportContent = parseReportContent(report);

                  return (
                    <tr key={report.id}>
                      <td>{report.id}</td>
                      <td><strong>{report.target}</strong></td>
                      <td>
                        <div className={styles.reportReasonCell}>
                          <strong className={styles.reportReasonBadge}>[{report.reason}]</strong>
                          {reportContent.customReason ? (
                            <em className={styles.reportCustomReasonPreview}>
                              직접 입력: {reportContent.customReason}
                            </em>
                          ) : null}
                          <span>{reportContent.summary}</span>
                        </div>
                      </td>
                      <td>
                    <span className={cx("badge", badgeToneByReportStatus(report.status))}>
                      {report.statusText}
                    </span>
                      </td>
                      <td>{report.createdAt}</td>
                      <td className={styles.reportActionCell}>
                        {report.status === "PENDING" ? (
                            <button
                                type="button"
                                onClick={() => setSelectedReportAction(report)}
                            >
                              처리하기
                            </button>
                        ) : (
                            <span className={styles.processedLabel}>처리됨</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pagedReports.length === 0 ? (
                    <tr><td colSpan="6" className={styles.emptyCell}>표시할 신고 내역이 없습니다.</td></tr>
                ) : null}
                </tbody>
              </table>
              <Pagination
                  currentPage={reportPage}
                  totalPages={reportPageCount}
                  totalItems={reports.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => updatePage("reports", page)}
              />
            </section>
        ) : null}

        {/* 운동 종목 관리 탭 */}
        {activeTab === "sports" ? (
            <section id="sports" className={styles.tableCard}>
              <div className={styles.tableHead}>
                <div>
                  <h2>운동 종목</h2>
                  <p>카테고리별로 10개씩 확인하고 모달에서 새 종목을 추가할 수 있습니다.</p>
                </div>
                <button type="button" onClick={() => setIsSportModalOpen(true)}>종목 관리</button>
              </div>
              <div className={styles.sectionHint}>
                카테고리와 사용 상태를 함께 보면 현재 운영 중인 종목을 빠르게 정리할 수 있습니다.
              </div>
              <table>
                <thead>
                <tr>
                  <th>종목 ID</th>
                  <th>이름</th>
                  <th>카테고리</th>
                  <th>사용 여부</th>
                  <th>활성화 변경</th>
                </tr>
                </thead>
                <tbody>
                {pagedSports.map((sport) => (
                    <tr key={sport.id}>
                      <td>{sport.id}</td>
                      <td>{sport.name}</td>
                      <td>{sport.category}</td>
                      <td>
                    <span className={cx("badge", sport.isActive ? "success" : "warning")}>
                      {sport.isActive ? "사용중" : "비활성"}
                    </span>
                      </td>
                      <td>
                        <select
                            className={styles.inlineSelect}
                            value={sport.isActive ? "true" : "false"}
                            disabled={updatingSportId === sport.id}
                            onChange={(event) => handleSportStatusChange(sport, event.target.value === "true")}
                        >
                          {sportStatusOptions.map((option) => (
                              <option key={String(option.value)} value={String(option.value)}>
                                {option.label}
                              </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                ))}
                {pagedSports.length === 0 ? (
                    <tr><td colSpan="5" className={styles.emptyCell}>선택한 카테고리에 해당하는 종목이 없습니다.</td></tr>
                ) : null}
                </tbody>
              </table>
              <Pagination
                  currentPage={sportPage}
                  totalPages={sportPageCount}
                  totalItems={filteredSports.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => updatePage("sports", page)}
              />
            </section>
        ) : null}

          </div>
        </div>

        {/* 모달 모음 */}

        {/* 신고 처리 모달 */}
        <AppModal
            open={Boolean(selectedReportAction)}
            eyebrow={`신고 #${selectedReportAction?.id}`}
            title="신고 처리"
            description="이 신고 내역에 대해 어떤 조치를 취할지 선택해주세요."
            confirmText="처리 완료"
            cancelText="취소"
            onConfirm={submitReportAction}
            onClose={() => {
              setSelectedReportAction(null);
              setReportActionForm({ actionType: "WARNING", suspendDuration: "24", message: "" });
            }}
        >
          {selectedReportAction && (
              <div className={styles.modalPanel}>
                <div className={styles.modalSection}>
                  <div className={styles.detailModalGrid}>
                    <div className={styles.detailModalItem} style={{ gridColumn: "1 / -1" }}>
                      <span>신고 대상</span>
                      <strong style={{ color: "#e11d48" }}>{selectedReportAction.target}</strong>
                    </div>
                    <div className={styles.detailModalItem} style={{ gridColumn: "1 / -1" }}>
                      <span>신고 사유</span>
                      <strong className={styles.reportReasonBadge}>[{selectedReportAction.reason}]</strong>
                    </div>
                    {selectedReportContent?.customReason ? (
                      <div className={styles.detailModalItem} style={{ gridColumn: "1 / -1" }}>
                        <span>직접 입력 사유</span>
                        <div className={styles.reportCustomReasonBox}>
                          <strong>[기타] {selectedReportContent.customReason}</strong>
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.detailModalItem} style={{ gridColumn: "1 / -1" }}>
                      <span>신고 내용</span>
                      <p className={styles.reportContentText}>
                        {selectedReportContent?.detail ||
                          "신고자가 상세 내용을 입력하지 않았습니다."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection} style={{ marginTop: "24px" }}>
                  <div className={styles.sportFormGrid}>
                    <label className={styles.modalField}>
                      <span>처리 방법 선택</span>
                      <select
                          value={reportActionForm.actionType}
                          onChange={(e) => setReportActionForm(cur => ({ ...cur, actionType: e.target.value }))}
                      >
                        <option value="WARNING">경고 안내</option>
                        <option value="SUSPEND">계정 일시 정지 (로그인 차단)</option>
                        <option value="REJECT">신고 반려 (문제 없음 처리)</option>
                      </select>
                    </label>

                    {reportActionForm.actionType === "SUSPEND" && (
                        <label className={styles.modalField}>
                          <span>정지 기간 (시간 단위)</span>
                          <select
                              value={reportActionForm.suspendDuration}
                              onChange={(e) => setReportActionForm(cur => ({ ...cur, suspendDuration: e.target.value }))}
                          >
                            <option value="12">12시간 정지</option>
                            <option value="24">24시간 (1일) 정지</option>
                            <option value="72">72시간 (3일) 정지</option>
                            <option value="168">168시간 (7일) 정지</option>
                            <option value="876000">영구 정지</option>
                          </select>
                        </label>
                    )}

                    {reportActionForm.actionType !== "REJECT" && (
                        <label className={styles.modalField}>
                          <span>회원 안내 메시지</span>
                          <textarea
                              rows={3}
                              value={reportActionForm.message}
                              onChange={(e) =>
                                  setReportActionForm((cur) => ({
                                    ...cur,
                                    message: e.target.value,
                                  }))
                              }
                              placeholder="처리 사유와 후속 안내를 회원이 이해하기 쉽게 입력해 주세요."
                              style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                resize: "vertical",
                              }}
                          />
                        </label>
                    )}

                  </div>
                </div>
              </div>
          )}
        </AppModal>

        {/* 종목 추가 모달 */}
        <AppModal
            open={isSportModalOpen}
            eyebrow="운동 종목"
            title="운동 종목 관리"
            description="현재 종목 목록을 확인하고 새 종목을 바로 추가할 수 있습니다."
            confirmText="종목 추가"
            cancelText="닫기"
            onConfirm={submitSport}
            onClose={closeSportModal}
        >
          <div className={styles.modalPanel}>
            <div className={styles.modalSection}>
              <div className={styles.sportFormGrid}>
                <label className={styles.modalField}>
                  <span>종목명</span>
                  <input
                      value={sportForm.name}
                      onChange={(event) => setSportForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="예: 클라이밍"
                  />
                </label>
                <label className={styles.modalField}>
                  <span>카테고리</span>
                  <select
                      value={sportForm.category}
                      onChange={(event) => setSportForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    <option value="">카테고리 선택</option>
                    {sportCategoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.modalCheck}>
                  <input
                      type="checkbox"
                      checked={sportForm.isActive}
                      onChange={(event) => setSportForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>즉시 사용 가능한 상태로 추가</span>
                </label>
                {sportFormError ? <p className={styles.modalErrorText}>{sportFormError}</p> : null}
              </div>
            </div>
          </div>
        </AppModal>

        <RegionPickerModal
            open={isRegionModalOpen}
            regions={regionHierarchy}
            initialSelection={draftRegionSelection}
            onApply={applyRegionSelection}
            onClose={closeRegionModal}
        />

        {/* 회원 상세 모달 */}
        <AppModal
            open={Boolean(selectedMemberDetail)}
            title="회원 정보"
            confirmText="닫기"
            onConfirm={() => setSelectedMemberDetail(null)}
            onClose={() => setSelectedMemberDetail(null)}
            hideCancel
        >
          {selectedMemberDetail ? (
              <div className={styles.detailModalGrid}>
                <div className={styles.detailModalProfile}>
                  <img src={selectedMemberDetail.profileImage} alt={`${selectedMemberDetail.nickname} 프로필`} className={styles.detailAvatar} />
                </div>
                <div className={styles.detailModalItem}><span>회원 ID</span><strong>{selectedMemberDetail.id}</strong></div>
                <div className={styles.detailModalItem}><span>닉네임</span><strong>{selectedMemberDetail.nickname}</strong></div>
                <div className={styles.detailModalItem}><span>로그인 ID</span><strong>{selectedMemberDetail.loginId}</strong></div>
                <div className={styles.detailModalItem}><span>지역</span><strong>{selectedMemberDetail.region}</strong></div>
                <div className={styles.detailModalItem}><span>권한</span><strong>{selectedMemberDetail.roleText}</strong></div>
                <div className={styles.detailModalItem}><span>상태</span><strong>{selectedMemberDetail.statusText}</strong></div>
              </div>
          ) : null}
        </AppModal>

        {/* 모임 상세 모달 */}
        <AppModal
            open={Boolean(selectedMeetingDetail)}
            title="모임 정보"
            confirmText="닫기"
            onConfirm={() => setSelectedMeetingDetail(null)}
            onClose={() => setSelectedMeetingDetail(null)}
            hideCancel
        >
          {selectedMeetingDetail ? (
              <div className={styles.detailModalGrid}>
                <div className={styles.detailModalItem}><span>모임 ID</span><strong>M{String(selectedMeetingDetail.id).padStart(3, "0")}</strong></div>
                <div className={styles.detailModalItem}><span>제목</span><strong>{selectedMeetingDetail.title}</strong></div>
                <div className={styles.detailModalItem}><span>주최자</span><strong>{selectedMeetingDetail.hostNickname}</strong></div>
                <div className={styles.detailModalItem}><span>종목</span><strong>{selectedMeetingDetail.sport} · {selectedMeetingDetail.sportCategory}</strong></div>
                <div className={styles.detailModalItem}><span>지역</span><strong>{selectedMeetingDetail.region}</strong></div>
                <div className={styles.detailModalItem}><span>일정</span><strong>{selectedMeetingDetail.meetingDate} {selectedMeetingDetail.startTime}</strong></div>
                <div className={styles.detailModalItem}><span>등록일</span><strong>{selectedMeetingDetail.createdAt}</strong></div>
                <div className={styles.detailModalItem}><span>참가 인원</span><strong>{selectedMeetingDetail.current}/{selectedMeetingDetail.max}</strong></div>
                <div className={styles.detailModalItem}><span>상태</span><strong>{selectedMeetingDetail.statusText}</strong></div>
              </div>
          ) : null}
        </AppModal>
      </div>
  );
}
