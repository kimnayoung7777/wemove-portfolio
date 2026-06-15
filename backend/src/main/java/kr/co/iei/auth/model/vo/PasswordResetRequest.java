package kr.co.iei.auth.model.vo;

import lombok.Data;

@Data
public class PasswordResetRequest {
  private String loginId;
  private String email;
  private String password;
}
