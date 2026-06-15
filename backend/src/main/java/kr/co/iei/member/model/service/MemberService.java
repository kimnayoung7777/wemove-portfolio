package kr.co.iei.member.model.service;

import kr.co.iei.member.model.vo.*;
import kr.co.iei.sport.model.vo.Sport;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface MemberService {
  MemberResponse getMe(Long memberId);

  List<Sport> getSports(Long memberId);

  void updateMe(Long memberId, MemberUpdateRequest request, MultipartFile image);

  void checkNickname(Long memberId, String nickname);

  void checkEmail(Long memberId, String email);

  void updateSports(Long memberId, MemberSportsUpdateRequest request);

  void withdraw(Long memberId, MemberWithdrawRequest request);

  MemberResponse getMember(Long memberId);

  MemberActivityResponse getActivity(Long memberId);
}
