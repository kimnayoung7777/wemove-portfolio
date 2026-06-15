package kr.co.iei.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthRefreshResult {
  private String accessToken;
}
