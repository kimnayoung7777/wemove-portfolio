package kr.co.iei.auth.model.vo;

import lombok.Data;

@Data
public class EmailVerificationRequest {
  private String email;
  private String purpose;
}
