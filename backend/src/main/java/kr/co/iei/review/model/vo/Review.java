package kr.co.iei.review.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Review {
  private Long reviewId;
  private Long meetingId;
  private Long writerId;
  private Integer rating;
  private String content;
  private LocalDateTime createdAt;
}
