package kr.co.iei.review.model.vo;

import lombok.Data;

@Data
public class ReviewRequest {
  private Long writerId;
  private Integer rating;
  private String content;
}
