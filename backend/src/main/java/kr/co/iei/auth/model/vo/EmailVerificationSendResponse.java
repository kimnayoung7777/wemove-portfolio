package kr.co.iei.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EmailVerificationSendResponse {
  private String message;
  private String verificationUrl;
}
