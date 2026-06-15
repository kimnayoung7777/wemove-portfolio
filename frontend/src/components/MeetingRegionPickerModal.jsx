import { useEffect, useMemo, useState } from "react";
import AppModal from "./AppModal";
import styles from "../styles/MeetingPickerModal.module.css";

const EMPTY_SELECTION = {
  regionId: null,
  sido: "",
  sigungu: "",
  dong: "",
};

const normalizeSelection = (selection = {}) => ({
  regionId: selection?.regionId ?? null,
  sido: selection?.sido ?? "",
  sigungu: selection?.sigungu ?? "",
  dong: selection?.dong ?? "",
});

export default function MeetingRegionPickerModal({
  open,
  regions,
  initialSelection,
  onApply,
  onClose,
}) {
  const [draft, setDraft] = useState(() => normalizeSelection(initialSelection));

  useEffect(() => {
    if (open) {
      setDraft(normalizeSelection(initialSelection));
    }
  }, [open, initialSelection]);

  const hierarchy = useMemo(() => {
    const grouped = new Map();

    regions.forEach((region) => {
      if (!region?.sido || !region?.sigungu) return;

      if (!grouped.has(region.sido)) {
        grouped.set(region.sido, new Map());
      }

      const sigunguMap = grouped.get(region.sido);
      if (!sigunguMap.has(region.sigungu)) {
        sigunguMap.set(region.sigungu, []);
      }

      sigunguMap.get(region.sigungu).push(region);
    });

    return [...grouped.entries()]
      .sort((left, right) => left[0].localeCompare(right[0], "ko"))
      .map(([sido, sigunguMap]) => ({
        sido,
        sigungus: [...sigunguMap.entries()]
          .sort((left, right) => left[0].localeCompare(right[0], "ko"))
          .map(([sigungu, dongs]) => ({
            sigungu,
            dongs: dongs
              .filter((region) => region.dong)
              .sort((left, right) => left.dong.localeCompare(right.dong, "ko")),
          })),
      }));
  }, [regions]);

  const currentSidoGroup =
    hierarchy.find((region) => region.sido === draft.sido) ?? null;
  const currentSigunguGroup =
    currentSidoGroup?.sigungus?.find(
      (sigungu) => sigungu.sigungu === draft.sigungu,
    ) ?? null;

  const previewText = [draft.sido, draft.sigungu, draft.dong]
    .filter(Boolean)
    .join(" > ");

  const applySelection = () => {
    onApply?.(normalizeSelection(draft));
  };

  return (
    <AppModal
      open={open}
      eyebrow="지역 조회"
      title="모임 지역 선택"
      description="시도만 선택하거나 시군구까지만 선택해도 해당 범위의 모임을 조회할 수 있습니다."
      confirmText="적용"
      cancelText="닫기"
      onConfirm={applySelection}
      onClose={onClose}
    >
      <div className={styles.previewBar}>
        <span>현재 선택</span>
        <strong>{previewText || "전체 지역"}</strong>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => setDraft(EMPTY_SELECTION)}
        >
          전체 지역으로 보기
        </button>
      </div>

      <div className={styles.browser}>
        <section className={styles.column}>
          <header className={styles.columnHead}>시도</header>
          <div className={styles.list}>
            {hierarchy.map((region) => (
              <button
                key={region.sido}
                type="button"
                className={`${styles.item} ${
                  region.sido === draft.sido ? styles.itemCurrent : ""
                }`.trim()}
                onClick={() =>
                  setDraft({
                    regionId: null,
                    sido: region.sido,
                    sigungu: "",
                    dong: "",
                  })
                }
              >
                {region.sido}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.column}>
          <header className={styles.columnHead}>시군구</header>
          {currentSidoGroup ? (
            <div className={styles.list}>
              {currentSidoGroup.sigungus.map((sigungu) => (
                <button
                  key={`${currentSidoGroup.sido}-${sigungu.sigungu}`}
                  type="button"
                  className={`${styles.item} ${
                    sigungu.sigungu === draft.sigungu ? styles.itemCurrent : ""
                  }`.trim()}
                  onClick={() =>
                    setDraft({
                      regionId: null,
                      sido: currentSidoGroup.sido,
                      sigungu: sigungu.sigungu,
                      dong: "",
                    })
                  }
                >
                  {sigungu.sigungu}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>시도를 선택하면 시군구가 보입니다.</div>
          )}
        </section>

        <section className={styles.column}>
          <header className={styles.columnHead}>읍면동</header>
          {currentSigunguGroup ? (
            <div className={styles.list}>
              {currentSigunguGroup.dongs.map((region) => (
                <button
                  key={region.regionId}
                  type="button"
                  className={`${styles.item} ${
                    region.dong === draft.dong ? styles.itemCurrent : ""
                  }`.trim()}
                  onClick={() =>
                    setDraft({
                      regionId: region.regionId,
                      sido: region.sido,
                      sigungu: region.sigungu,
                      dong: region.dong,
                    })
                  }
                >
                  {region.dong}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              시군구를 선택하면 읍면동이 보입니다.
            </div>
          )}
        </section>
      </div>
    </AppModal>
  );
}
