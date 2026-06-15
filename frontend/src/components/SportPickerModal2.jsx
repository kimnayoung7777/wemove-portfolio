import { useEffect, useMemo, useState } from "react";
import AppModal from "./AppModal";
import styles from "../styles/SportPickerModal.module.css";

const ALL_CATEGORY = "전체 카테고리";

const normalizeText = (value = "") => String(value ?? "").trim();

export default function SportPickerModal({
  open,
  sports = [],
  selectedSportId,
  onApply,
  onClose,
}) {
  const [draftCategory, setDraftCategory] = useState(ALL_CATEGORY);
  const [draftSportId, setDraftSportId] = useState(selectedSportId ?? null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      sports
        .map((sport) => normalizeText(sport.category))
        .filter(Boolean),
    );

    return Array.from(uniqueCategories).sort((left, right) =>
      left.localeCompare(right, "ko"),
    );
  }, [sports]);

  const selectedSport = useMemo(
    () => sports.find((sport) => sport.sportId === draftSportId) ?? null,
    [draftSportId, sports],
  );

  const visibleSports = useMemo(() => {
    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.trim().toLowerCase();
      return sports.filter((sport) =>
        normalizeText(sport.name).toLowerCase().includes(lowerQuery),
      );
    }

    if (draftCategory === ALL_CATEGORY) {
      return sports;
    }

    return sports.filter(
      (sport) => normalizeText(sport.category) === draftCategory,
    );
  }, [draftCategory, sports, searchQuery]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const selected =
      sports.find((sport) => sport.sportId === selectedSportId) ?? null;
    const initialCategory =
      normalizeText(selected?.category) ||
      ALL_CATEGORY;

    setDraftSportId(selectedSportId ?? null);
    setDraftCategory(initialCategory);
  }, [open, selectedSportId, sports]);

  useEffect(() => {
    if (!categories.length) {
      setDraftCategory(ALL_CATEGORY);
      return;
    }

    if (
      draftCategory !== ALL_CATEGORY &&
      !categories.includes(draftCategory)
    ) {
      setDraftCategory(categories[0]);
    }
  }, [categories, draftCategory]);

  const previewText = selectedSport
      ? `${selectedSport.category ? `${selectedSport.category} · ` : ""}${selectedSport.name}`
      : (draftCategory !== ALL_CATEGORY ? draftCategory : "전체 운동");

  const applySelection = () => {
    onApply?.(selectedSport);
  };

  const clearSelection = () => {
    setDraftSportId(null);
    setDraftCategory(ALL_CATEGORY);
  };

  return (
    <AppModal
      open={open}
      eyebrow="운동 조회"
      title="운동 카테고리 선택"
      description="카테고리별로 먼저 좁혀서 고르면 더 빠르게 원하는 운동을 찾을 수 있어요."
      confirmText="적용"
      cancelText="닫기"
      onConfirm={applySelection}
      onClose={onClose}
    >
      <div className={styles.previewBar}>
        <span className={styles.previewKicker}>현재 선택</span>
        <strong>{previewText}</strong>
        <button
          type="button"
          className={styles.textButton}
          onClick={clearSelection}
        >
          전체 운동으로 보기
        </button>
      </div>

      <input
        type="text"
        placeholder="운동 이름으로 검색"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.browser}>
        <section className={styles.column}>
          <header className={styles.columnHead}>카테고리</header>
          <div className={styles.list}>
            <button
              type="button"
              className={`${styles.item} ${
                draftCategory === ALL_CATEGORY ? styles.itemCurrent : ""
              }`.trim()}
              onClick={() => {
                setDraftCategory(ALL_CATEGORY);
                setDraftSportId(null);
              }}
            >
              전체 카테고리
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.item} ${
                  category === draftCategory ? styles.itemCurrent : ""
                }`.trim()}
                onClick={() => {
                  setDraftCategory(category);
                  setDraftSportId(null);
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.column}>
          <header className={styles.columnHead}>운동</header>
          {visibleSports.length ? (
            <div className={styles.list}>
              {visibleSports.map((sport) => (
                <button
                  key={sport.sportId}
                  type="button"
                  className={`${styles.item} ${
                    sport.sportId === draftSportId ? styles.itemCurrent : ""
                  }`.trim()}
                  onClick={() => {
                    setDraftSportId(sport.sportId);
                    setDraftCategory(normalizeText(sport.category) || ALL_CATEGORY);
                  }}
                >
                  {sport.name}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              카테고리를 먼저 선택하면 운동 목록이 보여요.
            </div>
          )}
        </section>
      </div>
    </AppModal>
  );
}
