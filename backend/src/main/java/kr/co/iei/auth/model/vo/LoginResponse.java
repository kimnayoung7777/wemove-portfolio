package kr.co.iei.auth.model.vo;

import lombok.*;

@Data
@AllArgsConstructor
public class LoginResponse {
  private Long memberId;
  private String loginId;
  private String nickname;
  private String role;
}
