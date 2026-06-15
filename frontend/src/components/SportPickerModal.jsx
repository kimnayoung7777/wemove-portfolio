import { useEffect, useMemo, useState } from "react";
import AppModal from "./AppModal";
import styles from "../styles/SportPickerModal.module.css";

const ALL_CATEGORY = "전체 분류";
const ALL_SPORT = "전체 종목";

const normalizeSelection = (selection = {}) => ({
  category: selection.category ?? ALL_CATEGORY,
  sportId: selection.sportId ?? null,
  name: selection.name ?? ALL_SPORT,
});

export default function SportPickerModal({
  open,
  sports = [], // DB에서 받아온 전체 스포츠 리스트 배열
  initialSelection,
  onApply,
  onClose,
}) {
  const [draft, setDraft] = useState(() =>
    normalizeSelection(initialSelection),
  );

  useEffect(() => {
    if (open) {
      setDraft(normalizeSelection(initialSelection));
    }
  }, [open, initialSelection]);

  // 1. 중복을 제거한 대분류(category) 목록 추출
  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      sports.map((s) => s.category).filter(Boolean),
    );
    return Array.from(uniqueCategories);
  }, [sports]);

  // 2. 현재 선택된 대분류에 속한 중분류(name) 목록 추출
  const currentCategorySports = useMemo(() => {
    if (draft.category === ALL_CATEGORY) return [];
    return sports.filter((s) => s.category === draft.category);
  }, [sports, draft.category]);

  // 3. 상단에 보여질 미리보기 텍스트 구성
  const previewText = useMemo(() => {
    const values = [draft.category, draft.name].filter(
      (value) => value !== ALL_CATEGORY && value !== ALL_SPORT,
    );

    return values.length ? values.join(" > ") : "운동 종목을 선택해주세요";
  }, [draft]);

  const applySelection = () => {
    // 최종 종목(name)까지 선택되지 않으면 적용 안 됨
    if (
      draft.category === ALL_CATEGORY ||
      draft.name === ALL_SPORT ||
      !draft.sportId
    ) {
      return;
    }
    onApply?.(draft);
  };

  return (
    <AppModal
      open={open}
      eyebrow="종목 조회"
      title="운동 종목 선택"
      description="대분류를 고른 뒤 상세 운동 종목을 선택해주세요."
      confirmText="적용"
      cancelText="닫기"
      onConfirm={applySelection}
      onClose={onClose}
    >
      <div className={styles.previewBar}>
        <span className={styles.previewKicker}>현재 선택</span>
        <strong>{previewText}</strong>
      </div>

      <div className={styles.browser}>
        {/* 1열: 대분류 (category) */}
        <section className={styles.column}>
          <header className={styles.columnHead}>대분류</header>
          <div className={styles.list}>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.item} ${
                  category === draft.category ? styles.itemCurrent : ""
                }`.trim()}
                onClick={() =>
                  setDraft({
                    category: category,
                    sportId: null, // 대분류가 바뀌면 하위 선택 초기화
                    name: ALL_SPORT,
                  })
                }
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* 2열: 중분류 (name) */}
        <section className={styles.column}>
          <header className={styles.columnHead}>상세 종목</header>
          {draft.category !== ALL_CATEGORY ? (
            <div className={styles.list}>
              {currentCategorySports.map((sport) => (
                <button
                  key={sport.sportId}
                  type="button"
                  className={`${styles.item} ${
                    sport.sportId === draft.sportId ? styles.itemCurrent : ""
                  }`.trim()}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      sportId: sport.sportId,
                      name: sport.name,
                    }))
                  }
                >
                  {sport.name}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>먼저 대분류를 선택해주세요.</div>
          )}
        </section>
      </div>
    </AppModal>
  );
}
