package kr.co.iei.auth.model.service;

import kr.co.iei.auth.model.vo.EmailVerificationSendResponse;

public interface EmailVerificationService {
  EmailVerificationSendResponse sendVerificationEmail(String email);

  EmailVerificationSendResponse sendAccountRecoveryEmail(String email, String purpose);

  String verify(String token);

  boolean isVerified(String email);

  boolean isVerified(String email, String purpose);
}
