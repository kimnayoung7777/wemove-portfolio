import { useEffect, useMemo, useState } from "react";
import AppModal from "./AppModal";
import styles from "../styles/RegionPickerModal.module.css";

const ALL_SIDO = "전체 시도";
const ALL_SIGUNGU = "전체 시군구";
const ALL_DONG = "전체 읍면동";

const normalizeSelection = (selection = {}) => ({
  sido: selection?.sido ?? ALL_SIDO,
  sigungu: selection?.sigungu ?? ALL_SIGUNGU,
  dong: selection?.dong ?? ALL_DONG,
});

export default function RegionPickerModal({
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

  const activeSido = draft.sido;

  const currentSidoGroup =
    regions.find((region) => region.sido === activeSido) ?? null;

  const activeSigungu = draft.sigungu;

  const currentSigunguGroup =
    currentSidoGroup?.sigungus?.find((sigungu) => sigungu.sigungu === activeSigungu) ??
    null;

  const previewText = useMemo(() => {
    const values = [draft.sido, draft.sigungu, draft.dong].filter(
      (value) =>
        value !== ALL_SIDO && value !== ALL_SIGUNGU && value !== ALL_DONG,
    );

    return values.length ? values.join(" > ") : "지역을 선택해주세요";
  }, [draft]);

  const applySelection = () => {
    if (
      draft.sido === ALL_SIDO ||
      draft.sigungu === ALL_SIGUNGU ||
      draft.dong === ALL_DONG
    ) {
      return;
    }

    onApply?.(draft);
  };

  return (
    <AppModal
      open={open}
      eyebrow="지역 조회"
      title="조회할 지역 선택"
      description="시도, 시군구, 읍면동을 차례대로 고른 뒤 적용하면 관리자 목록이 해당 지역 기준으로 바뀝니다."
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
        <section className={styles.column}>
          <header className={styles.columnHead}>시도</header>
          <div className={styles.list}>
            {regions.map((region) => (
              <button
                key={region.sido}
                type="button"
                className={`${styles.item} ${
                  region.sido === activeSido ? styles.itemCurrent : ""
                }`.trim()}
                onClick={() =>
                  setDraft({
                    sido: region.sido,
                    sigungu: ALL_SIGUNGU,
                    dong: ALL_DONG,
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
              {currentSidoGroup.sigungus?.map((sigungu) => (
                <button
                  key={`${currentSidoGroup.sido}-${sigungu.sigungu}`}
                  type="button"
                  className={`${styles.item} ${
                    sigungu.sigungu === activeSigungu ? styles.itemCurrent : ""
                  }`.trim()}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      sigungu: sigungu.sigungu,
                      dong: ALL_DONG,
                    }))
                  }
                >
                  {sigungu.sigungu}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>먼저 시도를 선택해주세요.</div>
          )}
        </section>

        <section className={styles.column}>
          <header className={styles.columnHead}>읍면동</header>
          {currentSigunguGroup ? (
            <div className={styles.list}>
              {currentSigunguGroup.dongs?.map((dong) => (
                <button
                  key={`${activeSido}-${activeSigungu}-${dong}`}
                  type="button"
                  className={`${styles.item} ${
                    dong === draft.dong ? styles.itemCurrent : ""
                  }`.trim()}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      dong,
                    }))
                  }
                >
                  {dong}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>시군구를 선택하면 읍면동이 보입니다.</div>
          )}
        </section>
      </div>
    </AppModal>
  );
}
