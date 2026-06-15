package kr.co.iei.member.model.vo;

import lombok.Data;

@Data
public class MemberResponse {
  private Long userId;
  private String loginId;
  private String email;
  private String nickname;
  private String phone;
  private String profileImage;
  private Long regionId;
  private String role;
  private String status;
}
