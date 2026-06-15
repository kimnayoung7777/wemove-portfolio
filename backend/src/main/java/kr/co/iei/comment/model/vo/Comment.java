package kr.co.iei.comment.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Comment {
  private Long commentId;
  private Long meetingId;
  private Long writerId;
  private Long parentCommentId;
  private String content;
  private Integer isDeleted;
  private LocalDateTime createdAt;
  private String profileImage;

}
