package kr.co.iei.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthLoginResult {
  private LoginResponse user;
  private String accessToken;
  private String refreshToken;
  private long accessTokenSeconds;
  private long refreshTokenSeconds;
  private boolean persistentLogin;
}
