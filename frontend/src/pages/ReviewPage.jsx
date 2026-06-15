import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { meetings } from "../data/demoData";
import styles from "../styles/ReviewPage.module.css";

const initialReviews = [
  {
    id: 1,
    writer: "러닝하나",
    rating: 5,
    content:
      "분위기가 편안하고 초보자도 참여하기 좋았어요. 다음에도 다시 신청하고 싶은 모임이었습니다.",
  },
  {
    id: 2,
    writer: "운정조거",
    rating: 4,
    content:
      "시간 안내가 정확했고 진행도 매끄러웠어요. 장소 안내만 조금 더 자세하면 더 좋을 것 같아요.",
  },
];

const reviewLabels = {
  1: "아쉬워요",
  2: "무난해요",
  3: "괜찮아요",
  4: "만족해요",
  5: "아주 좋아요",
};

const stars = [1, 2, 3, 4, 5];

export default function ReviewPage() {
  const { meetingId } = useParams();
  const meeting =
    meetings.find((item) => String(item.id) === meetingId) ?? meetings[0];
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);

  const previews = useMemo(() => {
    return files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  const visibleRating = hovered || rating;

  const handleFileChange = (event) => {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 4);
    setFiles(nextFiles);
  };

  const removeFile = (targetName) => {
    setFiles((current) => current.filter((file) => file.name !== targetName));
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <div>
          <h1>후기 작성</h1>
          <p>
            {meeting.title} 참여 경험을 남겨서 다음 참가자에게 도움이 되는
            정보를 전달해보세요.
          </p>
        </div>
      </div>

      <div className={styles.subGrid}>
        <section className={styles.softPanel}>
          <h2>모임 후기 남기기</h2>
          <p>
            모임 분위기, 진행 방식, 참여 난이도, 추천 포인트를 솔직하고 간결하게
            적어주세요.
          </p>

          <form className={styles.reviewForm}>
            <div>
              <span className={styles.kicker}>별점 선택</span>
              <div className={styles.ratingStars}>
                {stars.map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={
                      score <= visibleRating
                        ? styles.ratingStarActive
                        : styles.ratingStar
                    }
                    onMouseEnter={() => setHovered(score)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(score)}
                    aria-label={`${score}점 선택`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <strong className={styles.ratingCaption}>
                {rating}점 · {reviewLabels[rating]}
              </strong>
            </div>

            <label className={styles.uploadBlock}>
              <span className={styles.kicker}>이미지 첨부</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className={styles.uploadInput}
                onChange={handleFileChange}
              />
              <small className={styles.uploadHint}>
                최대 4장까지 첨부할 수 있습니다.
              </small>
            </label>

            {previews.length > 0 ? (
              <div className={styles.reviewPreviewGrid}>
                {previews.map((preview) => (
                  <article
                    key={preview.name}
                    className={styles.reviewPreviewCard}
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className={styles.reviewPreviewImage}
                    />
                    <div className={styles.reviewPreviewMeta}>
                      <span>{preview.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(preview.name)}
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            <textarea
              className={styles.reviewTextarea}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="예: 초보자도 부담 없이 참여할 수 있었고, 진행 안내가 꼼꼼해서 편하게 뛰었습니다. 스트레칭과 마무리 동선까지 잘 챙겨줘서 만족스러웠어요."
            />

            <div className={styles.formActions}>
              <button type="button">후기 등록</button>
            </div>
          </form>
        </section>

        <section className={styles.softPanel}>
          <h2>작성된 후기</h2>
          <p>
            참가자들이 남긴 실제 피드백을 보고 모임 분위기를 미리 확인할 수
            있습니다.
          </p>
          <div className={styles.reviewList}>
            {initialReviews.map((review) => (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <div className={styles.reviewMeta}>
                    <strong>{review.writer}</strong>
                    <p>참여 후기</p>
                  </div>
                  <span className={styles.reviewScore}>{review.rating}.0</span>
                </div>
                <p>{review.content}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
