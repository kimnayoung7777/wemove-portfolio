package kr.co.iei.comment.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CommentResponse {
  private Long commentId;
  private Long writerId;
  private String nickname;
  private String content;
  private LocalDateTime createdAt;
  private Boolean isDeleted;
  private String profileImage;
  private Long parentCommentId;
}
