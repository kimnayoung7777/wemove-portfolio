package kr.co.iei.auth.model.vo;

import lombok.Data;

@Data
public class FindLoginIdRequest {
  private String email;
  private String nickname;
}
