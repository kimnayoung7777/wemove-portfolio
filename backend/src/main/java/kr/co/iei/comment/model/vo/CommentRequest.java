package kr.co.iei.comment.model.vo;

import lombok.Data;

@Data
public class CommentRequest {
  private Long writerId;
  private Long parentCommentId;
  private String content;
}
