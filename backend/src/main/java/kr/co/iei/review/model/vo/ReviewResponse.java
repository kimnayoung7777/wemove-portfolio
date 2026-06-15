package kr.co.iei.review.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ReviewResponse {
  private Long reviewId;
  private Long writerId;
  private String nickname;
  private Integer rating;
  private String content;
  private LocalDateTime createdAt;
}
