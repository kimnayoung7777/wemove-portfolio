package kr.co.iei.auth.model.vo;

import java.util.List;
import lombok.Data;

@Data
public class SignupRequest {
  private String loginId;
  private String email;
  private String password;
  private String nickname;
  private Integer gender;
  private Integer birthYear;
  private String phone;
  private Long regionId;
  private List<Long> sportIds;
}
