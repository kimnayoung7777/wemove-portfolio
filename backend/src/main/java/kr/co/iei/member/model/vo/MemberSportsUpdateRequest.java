package kr.co.iei.member.model.vo;

import java.util.List;
import lombok.Data;

@Data
public class MemberSportsUpdateRequest {
  private List<Long> sportIds;
}
