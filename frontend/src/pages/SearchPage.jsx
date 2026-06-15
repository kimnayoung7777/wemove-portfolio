import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getMeetings } from "../api/meetingApi";
import { getRegions } from "../api/regionApi";
import { getPopularKeywords, recordSearchKeyword } from "../api/searchApi";
import { getSports } from "../api/sportApi";
import AppModal from "../components/AppModal";
import DashboardShell from "../components/DashboardShell";
import UiIcon from "../components/UiIcon";
import {
  clearRecentSearches,
  getRecentSearches,
  registerSearchKeyword,
} from "../utils/searchInsights";
import styles from "../styles/SearchPage.module.css";

const REGION_PREVIEW_LIMIT = 100;

const meetingStatusText = {
  RECRUITING: "모집중",
  CLOSED: "모집완료",
  ONGOING: "진행중",
  COMPLETED: "진행완료",
  CANCELLED: "취소됨",
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const defaultRecommendedKeywords = [
  "러닝",
  "헬스",
  "배드민턴",
  "주말 모임",
  "강남",
  "한강",
];

const normalizeText = (value = "") => String(value).trim();

const sanitizeSearchKeyword = (value = "") => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return "";
  }

  return normalized;
};

const formatRegionName = (region) =>
  [region.sido, region.sigungu, region.dong]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

const keywordMatchesTerms = (sourceText, keyword) => {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const searchBase = normalizeText(sourceText).toLowerCase();
  const terms = normalizedKeyword.split(/\s+/).filter(Boolean);
  return terms.every((term) => searchBase.includes(term));
};

const buildRegionCandidates = (region) => {
  const sido = normalizeText(region.sido);
  const sigungu = normalizeText(region.sigungu);
  const dong = normalizeText(region.dong);
  const fullName = formatRegionName(region);

  return [
    {
      key: `sido:${sido}`,
      label: sido,
      level: "sido",
      sido,
      sigungu,
      dong,
    },
    {
      key: `sigungu:${sido}:${sigungu}`,
      label: [sido, sigungu].filter(Boolean).join(" "),
      level: "sigungu",
      sido,
      sigungu,
      dong,
    },
    {
      key: `dong:${region.regionId}`,
      label: fullName,
      level: "dong",
      sido,
      sigungu,
      dong,
    },
  ].filter((candidate) => normalizeText(candidate.label));
};

const matchesRegionCandidate = (candidate, keyword) => {
  const terms = normalizeText(keyword)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!terms.length) {
    return true;
  }

  const sidoText = normalizeText(candidate.sido).toLowerCase();
  const parentText = [candidate.sido, candidate.sigungu]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const fullText = [candidate.sido, candidate.sigungu, candidate.dong]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (candidate.level === "sido") {
    return terms.every((term) => sidoText.includes(term));
  }

  if (candidate.level === "sigungu") {
    return terms.every((term) => parentText.includes(term));
  }

  return terms.every((term) => fullText.includes(term));
};

const getRegionMatchScore = (candidate, keyword) => {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  const label = normalizeText(candidate.label).toLowerCase();

  if (label === normalizedKeyword) {
    if (candidate.level === "sido") return 0;
    if (candidate.level === "sigungu") return 1;
    return 2;
  }

  if (candidate.level === "sido") return 3;
  if (candidate.level === "sigungu") return 4;
  return 5;
};

const formatMeetingSchedule = (meetingDate, startTime, endTime) => {
  if (!meetingDate) {
    return "일정 정보 없음";
  }

  const date = new Date(`${meetingDate}T00:00:00`);
  const weekday = Number.isNaN(date.getTime())
    ? ""
    : weekdayLabels[date.getDay()];
  const timeText = String(startTime ?? "").slice(0, 5) || "--:--";
  const endTimeText = String(endTime ?? "").slice(0, 5);
  const nextDayText =
    endTimeText && timeText !== "--:--" && endTimeText < timeText
      ? "다음 날 "
      : "";

  return `${meetingDate}${weekday ? ` (${weekday})` : ""} ${timeText}${
    endTimeText ? ` ~ ${nextDayText}${endTimeText}` : ""
  }`;
};

function SearchEmptyState({
  icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className={styles.emptyBlock}>
      <div className={styles.emptyBlockIconWrap}>
        <UiIcon name={icon} className={styles.emptyBlockIcon} />
      </div>
      <span className={styles.emptyBlockEyebrow}>{eyebrow}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel ? (
        <button
          type="button"
          className={styles.emptyBlockButton}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = sanitizeSearchKeyword(searchParams.get("q"));
  const [keyword, setKeyword] = useState(query);
  const [meetingResults, setMeetingResults] = useState([]);
  const [meetingTotalCount, setMeetingTotalCount] = useState(0);
  const [regionResults, setRegionResults] = useState([]);
  const [sportResults, setSportResults] = useState([]);
  const [allRegionNames, setAllRegionNames] = useState([]);
  const [allSportKeywords, setAllSportKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [recentKeywords, setRecentKeywords] = useState(() =>
    getRecentSearches(),
  );
  const [popularKeywords, setPopularKeywords] = useState([]);

  useEffect(() => {
    setKeyword(query);
  }, [query]);

  useEffect(() => {
    let active = true;

    const loadPopularKeywords = async () => {
      try {
        const { data } = await getPopularKeywords(8);
        if (active) {
          setPopularKeywords(
            Array.isArray(data)
              ? data
                  .map((item) => normalizeText(item))
                  .filter(
                    (item) =>
                      item &&
                      item.toLowerCase() !== "null" &&
                      item.toLowerCase() !== "undefined",
                  )
              : [],
          );
        }
      } catch {
        if (active) {
          setPopularKeywords([]);
        }
      }
    };

    loadPopularKeywords();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadResults = async () => {
      if (!query) {
        setMeetingResults([]);
        setMeetingTotalCount(0);
        setRegionResults([]);
        setSportResults([]);
        return;
      }

      setLoading(true);

      try {
        const [meetingResponse, regionResponse, sportResponse] =
          await Promise.all([
            getMeetings({ keyword: query, page: 1, size: 8 }),
            getRegions(),
            getSports(),
          ]);

        if (!active) {
          return;
        }

        const regionList = Array.isArray(regionResponse.data)
          ? regionResponse.data
          : [];
        const sportList = Array.isArray(sportResponse.data)
          ? sportResponse.data
          : [];
        const normalizedQuery = query.toLowerCase();
        const regionNames = regionList
          .map((region) => formatRegionName(region))
          .filter(Boolean);
        const sportKeywords = sportList
          .filter((sport) => sport.isActive !== false)
          .flatMap((sport) => [sport.name, sport.category])
          .map(normalizeText)
          .filter(Boolean);

        setAllRegionNames(regionNames);
        setAllSportKeywords(sportKeywords);
        setMeetingResults(meetingResponse.data?.list ?? []);
        setMeetingTotalCount(meetingResponse.data?.totalCount ?? 0);
        setRegionResults(
          regionList
            .flatMap((region) => buildRegionCandidates(region))
            .filter((candidate) =>
              matchesRegionCandidate(candidate, normalizedQuery),
            )
            .filter(
              (candidate, index, array) =>
                array.findIndex((item) => item.key === candidate.key) === index,
            )
            .sort((left, right) => {
              const scoreDiff =
                getRegionMatchScore(left, normalizedQuery) -
                getRegionMatchScore(right, normalizedQuery);

              if (scoreDiff !== 0) {
                return scoreDiff;
              }

              return left.label.localeCompare(right.label, "ko");
            })
            .map((candidate) => ({
              regionId: candidate.key,
              name: candidate.label,
            })),
        );
        setSportResults(
          sportList
            .filter((sport) => sport.isActive !== false)
            .filter((sport) =>
              [sport.name, sport.category].some((value) =>
                keywordMatchesTerms(value, normalizedQuery),
              ),
            )
            .slice(0, 8),
        );
      } catch {
        if (!active) {
          return;
        }

        setMeetingResults([]);
        setMeetingTotalCount(0);
        setRegionResults([]);
        setSportResults([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadResults();
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (!query) {
      return;
    }

    registerSearchKeyword(query);
    setRecentKeywords(getRecentSearches());

    let active = true;

    const syncPopularKeyword = async () => {
      try {
        await recordSearchKeyword(query);
        const { data } = await getPopularKeywords(8);
        if (active) {
          setPopularKeywords(
            Array.isArray(data)
              ? data
                  .map((item) => normalizeText(item))
                  .filter(
                    (item) =>
                      item &&
                      item.toLowerCase() !== "null" &&
                      item.toLowerCase() !== "undefined",
                  )
              : [],
          );
        }
      } catch {
        // Keep the previous popular keywords if sync fails.
      }
    };

    syncPopularKeyword();
    return () => {
      active = false;
    };
  }, [query]);

  const totalResultCount = useMemo(
    () => meetingTotalCount + regionResults.length + sportResults.length,
    [meetingTotalCount, regionResults.length, sportResults.length],
  );

  const visibleRegionResults = useMemo(
    () => regionResults.slice(0, REGION_PREVIEW_LIMIT),
    [regionResults],
  );

  const hiddenRegionCount = Math.max(
    0,
    regionResults.length - REGION_PREVIEW_LIMIT,
  );

  const recommendedKeywords = useMemo(() => {
    const source = [
      ...popularKeywords,
      ...allSportKeywords,
      ...allRegionNames,
      ...defaultRecommendedKeywords,
    ];

    return source
      .map(normalizeText)
      .filter(Boolean)
      .filter(
        (value, index, array) =>
          array.findIndex(
            (item) => item.toLowerCase() === value.toLowerCase(),
          ) === index,
      )
      .filter((value) => value.toLowerCase() !== query.toLowerCase())
      .slice(0, 8);
  }, [allRegionNames, allSportKeywords, popularKeywords, query]);

  const submitSearch = (nextKeyword) => {
    const normalizedKeyword = sanitizeSearchKeyword(nextKeyword);
    if (!normalizedKeyword) {
      setSearchParams({});
      return;
    }

    setSearchParams({ q: normalizedKeyword });
  };

  const triggerKeywordSearch = (nextKeyword) => {
    const normalizedKeyword = sanitizeSearchKeyword(nextKeyword);
    if (!normalizedKeyword) {
      return;
    }

    setKeyword(normalizedKeyword);
    submitSearch(normalizedKeyword);
  };

  const hasNoResults =
    query &&
    !loading &&
    meetingTotalCount === 0 &&
    !regionResults.length &&
    !sportResults.length;

  return (
    <DashboardShell
      title="통합 검색"
      description="모임, 지역, 운동 종목을 한 번에 찾아보고 바로 이동할 수 있습니다."
      showHeaderSearch={false}
    >
      <section className={styles.heroCard}>
        <div>
          <span className={styles.eyebrow}>UNIFIED SEARCH</span>
          <h1>모임, 지역, 운동을 한 번에 찾아보세요</h1>
          <p>
            검색어를 입력하면 관련 모임과 지역, 운동 종목을 함께 보여주고 모임
            찾기 화면으로 자연스럽게 이어집니다.
          </p>
        </div>

        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(keyword);
          }}
        >
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: 파주 러닝, 경기, 배드민턴"
          />
          <button type="submit">검색</button>
        </form>

        <div className={styles.searchMeta}>
          <strong>
            {query ? `"${query}" 검색 결과` : "검색어를 입력해보세요"}
          </strong>
          <span>
            {query
              ? `총 ${totalResultCount}개의 관련 결과를 찾았습니다.`
              : "모임명, 지역명, 운동 종목명으로 검색할 수 있습니다."}
          </span>
          <div className={styles.searchStats}>
            <div className={styles.searchStat}>
              <span>모임</span>
              <strong>{meetingTotalCount}</strong>
            </div>
            <div className={styles.searchStat}>
              <span>지역</span>
              <strong>{regionResults.length}</strong>
            </div>
            <div className={styles.searchStat}>
              <span>운동</span>
              <strong>{sportResults.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.insightGrid}>
        <article className={styles.insightCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>최근 검색어</h2>
              <p>
                최근에 찾아본 키워드를 다시 눌러 빠르게 이어서 검색할 수
                있습니다.
              </p>
            </div>
            {recentKeywords.length ? (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  clearRecentSearches();
                  setRecentKeywords([]);
                }}
              >
                비우기
              </button>
            ) : null}
          </div>
          <div className={styles.chipList}>
            {recentKeywords.length ? (
              recentKeywords.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.resultChip}
                  onClick={() => triggerKeywordSearch(item)}
                >
                  {item}
                </button>
              ))
            ) : (
              <SearchEmptyState
                icon="refresh"
                eyebrow="EMPTY HISTORY"
                title="아직 저장된 최근 검색어가 없습니다"
                description="검색을 한 번 시작하면 여기에서 바로 이어서 다시 찾아볼 수 있어요."
              />
            )}
          </div>
        </article>

        <article className={styles.insightCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>인기 검색어</h2>
              <p>오늘 서비스 전체에서 많이 검색된 키워드 순으로 표시합니다.</p>
            </div>
          </div>
          <div className={styles.chipList}>
            {popularKeywords.length ? (
              popularKeywords.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={styles.resultChip}
                  onClick={() => triggerKeywordSearch(item)}
                >
                  <strong>{index + 1}</strong>
                  <span>{item}</span>
                </button>
              ))
            ) : (
              <SearchEmptyState
                icon="spark"
                eyebrow="TREND WAITING"
                title="아직 집계된 인기 검색어가 없습니다"
                description="조금 더 검색 데이터가 쌓이면 지금 많이 찾는 키워드를 여기서 바로 보여드릴게요."
              />
            )}
          </div>
        </article>
      </section>

      {loading ? (
        <section className={styles.sectionCard}>
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className={styles.skeletonCard} />
            ))}
          </div>
        </section>
      ) : (
        <div className={styles.resultLayout}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>관련 모임</h2>
                <p>모임명, 내용, 지역, 운동 종목이 포함된 결과입니다.</p>
              </div>
              {query ? (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() =>
                    navigate(`/meetings?keyword=${encodeURIComponent(query)}`)
                  }
                >
                  전체 모임 보기
                </button>
              ) : null}
            </div>

            <div className={styles.meetingList}>
              {meetingResults.length ? (
                meetingResults.map((meeting) => (
                  <Link
                    key={meeting.meetingId}
                    to={`/meetings/${meeting.meetingId}`}
                    className={styles.meetingCard}
                  >
                    <div className={styles.meetingTags}>
                      <span>{meeting.sportName}</span>
                      <span>
                        {meetingStatusText[meeting.status] ?? "상태 확인 필요"}
                      </span>
                    </div>
                    <strong>{meeting.title}</strong>
                    <p>{meeting.regionName}</p>
                    <small>
                      {formatMeetingSchedule(
                        meeting.meetingDate,
                        meeting.startTime,
                        meeting.endTime,
                      )}
                    </small>
                  </Link>
                ))
              ) : (
                <SearchEmptyState
                  icon="search"
                  eyebrow="MEETING GAP"
                  title="관련 모임이 아직 보이지 않습니다"
                  description="검색어를 조금 넓히거나 목록 페이지에서 전체 모임 흐름을 함께 살펴보세요."
                  actionLabel="모임 찾기로 이동"
                  onAction={() => navigate("/meetings")}
                />
              )}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>관련 지역</h2>
                <p>검색어가 포함된 지역명입니다.</p>
              </div>
              {hiddenRegionCount > 0 ? (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setIsRegionModalOpen(true)}
                >
                  전체 {regionResults.length}개 보기
                </button>
              ) : null}
            </div>

            {hiddenRegionCount > 0 ? (
              <p className={styles.resultHint}>
                상위 {REGION_PREVIEW_LIMIT}개만 먼저 보여주고 있습니다. 나머지{" "}
                {hiddenRegionCount}개는 전체 보기에서 확인할 수 있습니다.
              </p>
            ) : null}

            <div className={styles.chipList}>
              {visibleRegionResults.length ? (
                visibleRegionResults.map((region) => (
                  <button
                    key={`${region.regionId}-${region.name}`}
                    type="button"
                    className={styles.resultChip}
                    onClick={() =>
                      navigate(
                        `/meetings?regionLabel=${encodeURIComponent(region.name)}&global=1`,
                      )
                    }
                  >
                    {region.name}
                  </button>
                ))
              ) : (
                <SearchEmptyState
                  icon="location"
                  eyebrow="REGION GAP"
                  title="관련 지역 결과가 없습니다"
                  description="동 이름 대신 시·군·구 단위로 넓혀 검색하면 더 많은 후보를 찾을 수 있어요."
                />
              )}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>관련 운동</h2>
                <p>운동명과 카테고리에 검색어가 포함된 결과입니다.</p>
              </div>
            </div>

            <div className={styles.chipList}>
              {sportResults.length ? (
                sportResults.map((sport) => (
                  <button
                    key={sport.sportId}
                    type="button"
                    className={styles.resultChip}
                    onClick={() =>
                      navigate(
                        `/meetings?sportName=${encodeURIComponent(sport.name)}&global=1`,
                      )
                    }
                  >
                    <strong>{sport.name}</strong>
                    <span>{sport.category || "기타"}</span>
                  </button>
                ))
              ) : (
                <SearchEmptyState
                  icon="dumbbell"
                  eyebrow="SPORT GAP"
                  title="관련 운동 결과가 없습니다"
                  description="운동 이름이 정확하지 않다면 카테고리나 지역 조합으로 먼저 찾아보는 것도 좋아요."
                />
              )}
            </div>
          </section>

          {hasNoResults ? (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>추천 키워드</h2>
                  <p>
                    검색 결과가 없어서 다른 키워드를 바로 시도할 수 있게
                    준비했습니다.
                  </p>
                </div>
              </div>
              <div className={styles.chipList}>
                {recommendedKeywords.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={styles.resultChip}
                    onClick={() => triggerKeywordSearch(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <AppModal
        open={isRegionModalOpen}
        title="지역 검색 전체 결과"
        description={`"${query}" 검색과 관련된 지역 ${regionResults.length}개를 확인할 수 있습니다.`}
        confirmText="닫기"
        onConfirm={() => setIsRegionModalOpen(false)}
        onClose={() => setIsRegionModalOpen(false)}
        hideCancel
      >
        <div className={styles.regionModalList}>
          {regionResults.map((region) => (
            <button
              key={`modal-${region.regionId}-${region.name}`}
              type="button"
              className={styles.resultChip}
              onClick={() => {
                setIsRegionModalOpen(false);
                navigate(
                  `/meetings?regionLabel=${encodeURIComponent(region.name)}&global=1`,
                );
              }}
            >
              {region.name}
            </button>
          ))}
        </div>
      </AppModal>
    </DashboardShell>
  );
}
