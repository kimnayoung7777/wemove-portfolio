package kr.co.iei.member.model.vo;

import lombok.Data;

@Data
public class MemberUpdateRequest {
  private String email;
  private String nickname;
  private String phone;
  private Long regionId;
  private String profileImage;
}
