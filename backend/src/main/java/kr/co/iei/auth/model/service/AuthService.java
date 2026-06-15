package kr.co.iei.auth.model.service;

import kr.co.iei.auth.model.vo.*;

public interface AuthService {
  void signup(SignupRequest request);

  void checkLoginId(String loginId);

  void checkEmail(String email);

  void checkNickname(String nickname);

  FindLoginIdResponse findLoginId(FindLoginIdRequest request);

  void resetPassword(PasswordResetRequest request);

  AuthLoginResult login(LoginRequest request);

  AuthRefreshResult refresh(String refreshToken);

  void logout(String refreshToken);

  boolean isCurrentSession(String accessToken);

  void ensureAccountCanAccess(String accessToken);

  void invalidateUserSession(Long userId);
}
