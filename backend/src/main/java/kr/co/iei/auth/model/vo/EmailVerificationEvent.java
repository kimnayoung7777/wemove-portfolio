package kr.co.iei.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EmailVerificationEvent {
  private String type;
  private String email;
  private boolean verified;
}
