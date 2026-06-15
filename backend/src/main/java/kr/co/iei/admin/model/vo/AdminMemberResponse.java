package kr.co.iei.admin.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class AdminMemberResponse {
  private Long userId;
  private String loginId;
  private String nickname;
  private String profileImage;
  private String regionName;
  private String role;
  private String status;
  private LocalDateTime suspendedUntil;
}
