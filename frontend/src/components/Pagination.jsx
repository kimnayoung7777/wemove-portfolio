import styles from "../styles/Pagination.module.css";

const buildPageButtons = (currentPage, totalPages) => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const first = Math.max(1, end - 4);
  const buttons = [];

  for (let page = first; page <= end; page += 1) {
    buttons.push(page);
  }

  return buttons;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  previousLabel = "이전",
  nextLabel = "다음",
  showingLabel = "표시 중",
  variant = "default", // 'default' or 'centered'
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pageButtons = buildPageButtons(currentPage, totalPages);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const containerClass = `${styles.pagination} ${
    variant === "centered" ? styles.paginationCentered : ""
  }`.trim();

  return (
    <div className={containerClass}>
      <div className={styles.paginationMeta}>
        <strong>
          {startItem}-{endItem}
        </strong>
        <span>{showingLabel}</span>
      </div>

      <div className={styles.paginationNav}>
        <button
          type="button"
          className={styles.paginationArrow}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {previousLabel}
        </button>

        <div className={styles.paginationNumbers}>
          {pageButtons.map((page) => (
            <button
              key={page}
              type="button"
              className={`${styles.paginationNumber} ${
                currentPage === page ? styles.paginationNumberCurrent : ""
              }`.trim()}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.paginationArrow}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          {nextLabel}
        </button>
      </div>

      <div className={styles.paginationSpacer} />
    </div>
  );
}
