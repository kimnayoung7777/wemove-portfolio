package kr.co.iei.member.model.service;


import java.util.List;
import java.util.Comparator;

import kr.co.iei.auth.model.dao.AuthDao;
import kr.co.iei.auth.model.service.EmailVerificationService;
import kr.co.iei.common.exception.DuplicateResourceException;
import kr.co.iei.common.service.CloudinaryImageService;
import kr.co.iei.common.util.PasswordUtil;

import kr.co.iei.member.model.dao.MemberDao;
import kr.co.iei.member.model.exception.MemberWithdrawBlockedException;
import kr.co.iei.member.model.vo.*;
import kr.co.iei.sport.model.vo.Sport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;


@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {
  private static final String EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
  private static final String NICKNAME_PATTERN = "^[가-힣a-zA-Z0-9]+$";

  private final MemberDao memberDao;
  private final AuthDao authDao;
  private final EmailVerificationService emailVerificationService;
  private final CloudinaryImageService cloudinaryImageService;
  private final PasswordUtil passwordUtil;

  public MemberResponse getMe(Long memberId) {
    return memberDao.selectMemberById(memberId);
  }

  public List<Sport> getSports(Long memberId) {
    requireMember(memberId);
    return memberDao.selectMemberSports(memberId);
  }

  public void updateMe(Long memberId, MemberUpdateRequest req, MultipartFile image) {
    validateUpdateRequest(memberId, req);

    String uploadedProfileImage = cloudinaryImageService.uploadProfileImage(image);
    if (uploadedProfileImage != null) {
      req.setProfileImage(uploadedProfileImage);
    }
    memberDao.updateMember(memberId, req);
  }

  public void checkNickname(Long memberId, String nickname) {
    MemberResponse currentMember = requireMember(memberId);
    String normalizedNickname = normalizeNickname(nickname);

    if (normalizedNickname.equals(currentMember.getNickname())) {
      return;
    }

    Member duplicatedMember = authDao.selectByNickname(normalizedNickname);
    if (duplicatedMember != null && !duplicatedMember.getUserId().equals(memberId)) {
      throw new DuplicateResourceException("이미 사용 중인 닉네임입니다.");
    }
  }

  public void checkEmail(Long memberId, String email) {
    MemberResponse currentMember = requireMember(memberId);
    String normalizedEmail = normalizeEmail(email);

    if (normalizedEmail.equalsIgnoreCase(currentMember.getEmail())) {
      return;
    }

    Member duplicatedMember = authDao.selectByEmail(normalizedEmail);
    if (duplicatedMember != null && !duplicatedMember.getUserId().equals(memberId)) {
      throw new DuplicateResourceException("이미 사용 중인 이메일입니다.");
    }
  }

  @Transactional
  public void updateSports(Long memberId, MemberSportsUpdateRequest req) {
    if (memberId == null) {
      throw new IllegalArgumentException("회원 정보가 없습니다.");
    }
    if (req == null || req.getSportIds() == null) {
      throw new IllegalArgumentException("관심종목 정보를 입력해주세요.");
    }

    List<Long> sportIds =
        req.getSportIds().stream()
            .filter((sportId) -> sportId != null && sportId > 0)
            .distinct()
            .toList();

    memberDao.deleteMemberSports(memberId);
    sportIds.forEach((sportId) -> memberDao.insertMemberSport(memberId, sportId));
  }

  @Transactional
  public void withdraw(Long memberId, MemberWithdrawRequest request) {
    if (memberId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
    if (request == null || request.getPassword() == null || request.getPassword().isBlank()) {
      throw new IllegalArgumentException("비밀번호를 입력해주세요.");
    }

    Member member = authDao.selectByUserId(memberId);
    if (member == null || "DELETED".equals(member.getStatus())) {
      throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
    }
    if (!isPasswordMatched(request.getPassword(), member.getPassword())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다.");
    }

    List<MemberActivityMeetingResponse> hostedBlockingMeetings =
        memberDao.selectActiveHostedMeetingsWithOtherParticipants(memberId);
    if (!hostedBlockingMeetings.isEmpty()) {
      throw new MemberWithdrawBlockedException(
          "HOSTED_MEETINGS_EXIST",
          "모임장인 모임에 다른 참가자가 있어 회원탈퇴를 할 수 없습니다. 모임을 완료하거나 취소한 뒤 다시 시도해주세요.",
          hostedBlockingMeetings);
    }

    List<MemberActivityMeetingResponse> participatingMeetings =
        memberDao.selectActiveParticipatingMeetings(memberId);
    if (!participatingMeetings.isEmpty()
        && !Boolean.TRUE.equals(request.getConfirmParticipatingMeetings())) {
      throw new MemberWithdrawBlockedException(
          "PARTICIPATING_MEETINGS_EXIST",
          "가입한 모임이 있습니다. 그래도 탈퇴하시겠습니까?",
          participatingMeetings);
    }

    memberDao.cancelParticipatingMeetingsForWithdrawal(memberId);
    memberDao.cancelSoloHostedMeetingsForWithdrawal(memberId);
    authDao.updateMemberStatus(memberId, "DELETED");
  }

  public MemberResponse getMember(Long memberId) {
    return memberDao.selectMemberById(memberId);
  }

  public MemberActivityResponse getActivity(Long memberId) {
    requireMember(memberId);

    List<MemberActivityMeetingResponse> hostedMeetings =
        memberDao.selectHostedActivityMeetings(memberId).stream()
            .sorted(activityMeetingComparator())
            .toList();

    List<MemberActivityMeetingResponse> participantMeetings =
        memberDao.selectParticipantActivityMeetings(memberId).stream()
            .sorted(activityMeetingComparator())
            .toList();

    List<MemberActivityMeetingResponse> approvedMeetings =
        participantMeetings.stream()
            .filter(
                meeting ->
                    "APPROVED".equals(meeting.getParticipationStatus())
                        && !"COMPLETED".equals(meeting.getStatus())
                        && !"CANCELLED".equals(meeting.getStatus()))
            .toList();

    List<MemberActivityMeetingResponse> pendingMeetings =
        participantMeetings.stream()
            .filter(meeting -> "PENDING".equals(meeting.getParticipationStatus()))
            .toList();

    List<MemberActivityMeetingResponse> completedMeetings =
        participantMeetings.stream()
            .filter(
                meeting ->
                    "APPROVED".equals(meeting.getParticipationStatus())
                        && "COMPLETED".equals(meeting.getStatus()))
            .toList();

    return MemberActivityResponse.builder()
        .hostedMeetings(hostedMeetings)
        .approvedMeetings(approvedMeetings)
        .pendingMeetings(pendingMeetings)
        .completedMeetings(completedMeetings)
        .build();
  }

  private void validateUpdateRequest(Long memberId, MemberUpdateRequest req) {
    if (req == null) {
      throw new IllegalArgumentException("수정할 프로필 정보를 입력해주세요.");
    }

    MemberResponse currentMember = requireMember(memberId);
    String normalizedEmail = normalizeEmail(req.getEmail());
    String normalizedNickname = normalizeNickname(req.getNickname());
    String normalizedPhone = normalizePhone(req.getPhone());

    if (!normalizedPhone.isBlank()
        && (normalizedPhone.length() < 9 || normalizedPhone.length() > 11)) {
      throw new IllegalArgumentException("연락처는 숫자 9자리에서 11자리까지 입력해주세요.");
    }

    req.setEmail(normalizedEmail);
    req.setNickname(normalizedNickname);
    req.setPhone(normalizedPhone);

    checkNickname(memberId, normalizedNickname);
    checkEmail(memberId, normalizedEmail);

    if (!normalizedEmail.equalsIgnoreCase(currentMember.getEmail())
        && !emailVerificationService.isVerified(normalizedEmail)) {
      throw new IllegalArgumentException("변경할 이메일 인증을 완료해주세요.");
    }
  }

  private MemberResponse requireMember(Long memberId) {
    if (memberId == null) {
      throw new IllegalArgumentException("회원 정보가 없습니다.");
    }

    MemberResponse member = memberDao.selectMemberById(memberId);
    if (member == null) {
      throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
    }

    return member;
  }

  private String normalizeEmail(String email) {
    if (email == null || !email.trim().matches(EMAIL_PATTERN)) {
      throw new IllegalArgumentException("올바른 이메일 형식으로 입력해주세요.");
    }

    return email.trim().toLowerCase();
  }

  private String normalizeNickname(String nickname) {
    if (nickname == null || !nickname.trim().matches(NICKNAME_PATTERN)) {
      throw new IllegalArgumentException("닉네임은 한글, 영문, 숫자만 입력해주세요.");
    }

    return nickname.trim();
  }

  private String normalizePhone(String phone) {
    if (phone == null) {
      return "";
    }

    return phone.replaceAll("\\D", "");
  }

  private boolean isPasswordMatched(String rawPassword, String savedPassword) {
    if (rawPassword == null || savedPassword == null) {
      return false;
    }

    return passwordUtil.matches(rawPassword, savedPassword) || rawPassword.equals(savedPassword);
  }

  private Comparator<MemberActivityMeetingResponse> activityMeetingComparator() {
    return Comparator.comparing(
            MemberActivityMeetingResponse::getMeetingDate,
            Comparator.nullsLast(Comparator.reverseOrder()))
        .thenComparing(
            MemberActivityMeetingResponse::getStartTime,
            Comparator.nullsLast(Comparator.reverseOrder()))
        .thenComparing(
            MemberActivityMeetingResponse::getCreatedAt,
            Comparator.nullsLast(Comparator.reverseOrder()));
  }
}
