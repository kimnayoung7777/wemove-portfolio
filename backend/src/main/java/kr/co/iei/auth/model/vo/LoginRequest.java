package kr.co.iei.auth.model.vo;

import lombok.Data;

@Data
public class LoginRequest {
  private String loginId;
  private String password;
  private Boolean autoLogin;
  private Boolean forceLogin;
}
