package kr.co.iei.member.controller;

import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.member.model.service.MemberService;
import kr.co.iei.member.model.vo.*;
import kr.co.iei.sport.model.vo.Sport;
import lombok.RequiredArgsConstructor;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {
  private final MemberService memberService;
  private final JwtTokenProvider jwtTokenProvider;

  @GetMapping("/me")
  public ResponseEntity<MemberResponse> me(@RequestParam(defaultValue = "1") Long memberId) {
    return ResponseEntity.ok(memberService.getMe(memberId));
  }

  @GetMapping("/me/sports")
  public ResponseEntity<List<Sport>> mySports(@RequestParam(defaultValue = "1") Long memberId) {
    return ResponseEntity.ok(memberService.getSports(memberId));
  }

  @GetMapping("/me/activity")
  public ResponseEntity<MemberActivityResponse> myActivity(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(required = false) Long memberId) {
    Long resolvedMemberId = resolveMemberId(authorization, memberId);
    return ResponseEntity.ok(memberService.getActivity(resolvedMemberId));
  }

  @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Void> updateMe(
      @RequestParam(defaultValue = "1") Long memberId,
      @RequestPart("request") MemberUpdateRequest req,
      @RequestPart(value = "image", required = false) MultipartFile image) {
    memberService.updateMe(memberId, req, image);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/me/check-nickname")
  public ResponseEntity<Void> checkNickname(
      @RequestParam(defaultValue = "1") Long memberId, @RequestParam String nickname) {
    memberService.checkNickname(memberId, nickname);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/me/check-email")
  public ResponseEntity<Void> checkEmail(
      @RequestParam(defaultValue = "1") Long memberId, @RequestParam String email) {
    memberService.checkEmail(memberId, email);
    return ResponseEntity.ok().build();
  }

  @PutMapping("/me/sports")
  public ResponseEntity<Void> updateMySports(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(required = false) Long memberId,
      @RequestBody MemberSportsUpdateRequest request) {
    Long resolvedMemberId = resolveMemberId(authorization, memberId);
    memberService.updateSports(resolvedMemberId, request);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/me")
  public ResponseEntity<Void> withdrawMe(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody MemberWithdrawRequest request) {
    Long resolvedMemberId = resolveMemberId(authorization, null);
    memberService.withdraw(resolvedMemberId, request);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/{memberId}")
  public ResponseEntity<MemberResponse> member(@PathVariable Long memberId) {
    return ResponseEntity.ok(memberService.getMember(memberId));
  }

  private Long resolveMemberId(String authorization, Long fallbackMemberId) {
    if (authorization != null && authorization.startsWith("Bearer ")) {
      String accessToken = authorization.substring("Bearer ".length());
      if (jwtTokenProvider.isValid(accessToken)) {
        return jwtTokenProvider.parseUserId(accessToken);
      }
    }

    if (fallbackMemberId != null) {
      return fallbackMemberId;
    }

    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
  }
}
