package kr.co.iei.auth.model.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.UUID;
import kr.co.iei.admin.model.service.AccountSanctionMessageUtil;
import kr.co.iei.auth.exception.DuplicateLoginException;
import kr.co.iei.auth.model.dao.AuthDao;
import kr.co.iei.auth.model.vo.AuthLoginResult;
import kr.co.iei.auth.model.vo.AuthRefreshResult;
import kr.co.iei.auth.model.vo.FindLoginIdRequest;
import kr.co.iei.auth.model.vo.FindLoginIdResponse;
import kr.co.iei.auth.model.vo.LoginRequest;
import kr.co.iei.auth.model.vo.LoginResponse;
import kr.co.iei.auth.model.vo.PasswordResetRequest;
import kr.co.iei.auth.model.vo.SignupRequest;
import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.common.exception.AccountSuspendedException;
import kr.co.iei.common.exception.DuplicateResourceException;
import kr.co.iei.common.util.PasswordUtil;
import kr.co.iei.member.model.vo.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
  private static final String REFRESH_KEY_PREFIX = "auth:refresh:";
  private static final String SESSION_KEY_PREFIX = "auth:session:";
  private static final String FIND_LOGIN_ID_PURPOSE = "FIND_LOGIN_ID";
  private static final String RESET_PASSWORD_PURPOSE = "RESET_PASSWORD";
  private static final String LOGIN_ID_PATTERN = "^[a-z0-9]{5,20}$";
  private static final String PASSWORD_PATTERN =
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,16}$";
  private static final String NICKNAME_PATTERN = "^[가-힣a-zA-Z0-9]+$";

  private final AuthDao authDao;
  private final PasswordUtil passwordUtil;
  private final JwtTokenProvider jwtTokenProvider;
  private final StringRedisTemplate stringRedisTemplate;
  private final EmailVerificationService emailVerificationService;

  @Value("${wemove.auth.access-token-seconds}")
  private long accessTokenSeconds;

  @Value("${wemove.auth.refresh-token-seconds}")
  private long refreshTokenSeconds;

  @Value("${wemove.auth.auto-login-refresh-token-seconds}")
  private long autoLoginRefreshTokenSeconds;

  @Transactional
  public void signup(SignupRequest req) {
    validateSignupRequest(req);
    checkLoginId(req.getLoginId());
    checkEmail(req.getEmail());
    checkNickname(req.getNickname());
    if (!emailVerificationService.isVerified(req.getEmail())) {
      throw new IllegalArgumentException("이메일 인증을 완료해주세요.");
    }

    Member member = new Member();
    member.setLoginId(req.getLoginId().trim());
    member.setEmail(req.getEmail().trim().toLowerCase());
    member.setPassword(passwordUtil.hash(req.getPassword()));
    member.setNickname(req.getNickname().trim());
    member.setGender(req.getGender());
    member.setBirthYear(req.getBirthYear());
    member.setPhone(normalizePhone(req.getPhone()));
    member.setRegionId(req.getRegionId());
    member.setRole("USER");
    member.setStatus("ACTIVE");
    authDao.insertMember(member);

    if (req.getSportIds() != null) {
      for (Long sportId : req.getSportIds()) {
        authDao.insertUserSport(member.getUserId(), sportId);
      }
    }
  }

  public void checkLoginId(String loginId) {
    if (loginId == null || !loginId.trim().matches(LOGIN_ID_PATTERN)) {
      throw new IllegalArgumentException("아이디는 소문자와 숫자를 조합해 5자 이상 20자 이하로 입력해주세요.");
    }

    if (authDao.selectByLoginId(loginId.trim()) != null) {
      throw new DuplicateResourceException("이미 사용 중인 아이디입니다.");
    }
  }

  public void checkEmail(String email) {
    if (!hasText(email) || !email.contains("@")) {
      throw new IllegalArgumentException("올바른 이메일 형식으로 입력해주세요.");
    }

    if (authDao.selectByEmail(email.trim().toLowerCase()) != null) {
      throw new DuplicateResourceException("이미 사용 중인 이메일입니다.");
    }
  }

  public void checkNickname(String nickname) {
    if (nickname == null || !nickname.trim().matches(NICKNAME_PATTERN)) {
      throw new IllegalArgumentException("닉네임은 한글, 영문, 숫자만 입력해주세요.");
    }

    if (authDao.selectByNickname(nickname.trim()) != null) {
      throw new DuplicateResourceException("이미 사용 중인 닉네임입니다.");
    }
  }

  public FindLoginIdResponse findLoginId(FindLoginIdRequest req) {
    if (req == null) {
      throw new IllegalArgumentException("계정 정보를 입력해주세요.");
    }

    String email = normalizeEmail(req.getEmail());
    String nickname = req.getNickname() == null ? "" : req.getNickname().trim();
    if (nickname.isBlank()) {
      throw new IllegalArgumentException("닉네임을 입력해주세요.");
    }
    if (!emailVerificationService.isVerified(email, FIND_LOGIN_ID_PURPOSE)) {
      throw new IllegalArgumentException("이메일 인증을 완료해주세요.");
    }

    Member member = authDao.selectByEmail(email);
    if (member == null || !nickname.equals(member.getNickname())) {
      throw new IllegalArgumentException("일치하는 계정 정보가 없습니다.");
    }

    return new FindLoginIdResponse(member.getLoginId());
  }

  public void resetPassword(PasswordResetRequest req) {
    if (req == null) {
      throw new IllegalArgumentException("비밀번호 재설정 정보를 입력해주세요.");
    }

    String loginId = req.getLoginId() == null ? "" : req.getLoginId().trim();
    String email = normalizeEmail(req.getEmail());
    String password = req.getPassword();

    if (loginId.isBlank()) {
      throw new IllegalArgumentException("아이디를 입력해주세요.");
    }
    if (password == null || !password.matches(PASSWORD_PATTERN)) {
      throw new IllegalArgumentException("비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해 8자 이상 16자 이하로 입력해주세요.");
    }
    if (!emailVerificationService.isVerified(email, RESET_PASSWORD_PURPOSE)) {
      throw new IllegalArgumentException("이메일 인증을 완료해주세요.");
    }

    Member member = authDao.selectByLoginId(loginId);
    if (member == null || !email.equalsIgnoreCase(member.getEmail())) {
      throw new IllegalArgumentException("일치하는 계정 정보가 없습니다.");
    }

    authDao.updatePassword(member.getUserId(), passwordUtil.hash(password));
  }

  public AuthLoginResult login(LoginRequest req) {
    Member member = authDao.selectByLoginId(req.getLoginId());
    if (member == null || !isPasswordMatched(req.getPassword(), member.getPassword())) {
      throw new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    ensureMemberCanAccess(member);

    boolean autoLogin = Boolean.TRUE.equals(req.getAutoLogin());
    boolean forceLogin = Boolean.TRUE.equals(req.getForceLogin());
    long effectiveRefreshSeconds =
        autoLogin ? autoLoginRefreshTokenSeconds : refreshTokenSeconds;

    String savedRefreshToken = stringRedisTemplate.opsForValue().get(refreshKey(member.getUserId()));
    String savedSessionId = stringRedisTemplate.opsForValue().get(sessionKey(member.getUserId()));
    if (hasText(savedRefreshToken) && hasText(savedSessionId) && !forceLogin) {
      throw new DuplicateLoginException("An existing login session was found.");
    }

    LoginResponse user =
        new LoginResponse(
            member.getUserId(), member.getLoginId(), member.getNickname(), member.getRole());

    String sessionId = UUID.randomUUID().toString();
    String accessToken = jwtTokenProvider.createAccessToken(user, sessionId);
    String refreshToken =
        jwtTokenProvider.createRefreshToken(member.getUserId(), sessionId, effectiveRefreshSeconds);

    Duration ttl = Duration.ofSeconds(effectiveRefreshSeconds);
    stringRedisTemplate.opsForValue().set(refreshKey(member.getUserId()), refreshToken, ttl);
    stringRedisTemplate.opsForValue().set(sessionKey(member.getUserId()), sessionId, ttl);

    return new AuthLoginResult(
        user,
        accessToken,
        refreshToken,
        accessTokenSeconds,
        effectiveRefreshSeconds,
        autoLogin);
  }

  public AuthRefreshResult refresh(String refreshToken) {
    if (!hasText(refreshToken) || !jwtTokenProvider.isValid(refreshToken)) {
      throw new IllegalArgumentException("Refresh token is missing or invalid.");
    }

    Long userId = jwtTokenProvider.parseUserId(refreshToken);
    String sessionId = jwtTokenProvider.parseSessionId(refreshToken);
    String savedRefreshToken = stringRedisTemplate.opsForValue().get(refreshKey(userId));
    String savedSessionId = stringRedisTemplate.opsForValue().get(sessionKey(userId));
    if (!refreshToken.equals(savedRefreshToken) || !sessionMatches(sessionId, savedSessionId)) {
      throw new IllegalArgumentException("Refresh token is expired or does not match.");
    }

    Member member = authDao.selectByUserId(userId);
    if (member == null) {
      throw new IllegalArgumentException("User not found.");
    }

    ensureMemberCanAccess(member);

    LoginResponse user =
        new LoginResponse(
            member.getUserId(), member.getLoginId(), member.getNickname(), member.getRole());

    String renewedAccessToken = jwtTokenProvider.createAccessToken(user, sessionId);
    return new AuthRefreshResult(renewedAccessToken);
  }

  public void logout(String refreshToken) {
    if (!hasText(refreshToken) || !jwtTokenProvider.isValid(refreshToken)) {
      return;
    }

    Long userId = jwtTokenProvider.parseUserId(refreshToken);
    String sessionId = jwtTokenProvider.parseSessionId(refreshToken);
    String savedRefreshToken = stringRedisTemplate.opsForValue().get(refreshKey(userId));
    String savedSessionId = stringRedisTemplate.opsForValue().get(sessionKey(userId));

    if (refreshToken.equals(savedRefreshToken) && sessionMatches(sessionId, savedSessionId)) {
      stringRedisTemplate.delete(refreshKey(userId));
      stringRedisTemplate.delete(sessionKey(userId));
    }
  }

  public boolean isCurrentSession(String accessToken) {
    if (!hasText(accessToken) || !jwtTokenProvider.isValid(accessToken)) {
      return false;
    }

    Long userId = jwtTokenProvider.parseUserId(accessToken);
    String sessionId = jwtTokenProvider.parseSessionId(accessToken);
    String savedSessionId = stringRedisTemplate.opsForValue().get(sessionKey(userId));
    return sessionMatches(sessionId, savedSessionId);
  }

  @Override
  public void ensureAccountCanAccess(String accessToken) {
    if (!hasText(accessToken) || !jwtTokenProvider.isValid(accessToken)) {
      return;
    }

    Member member = authDao.selectByUserId(jwtTokenProvider.parseUserId(accessToken));
    ensureMemberCanAccess(member);
  }

  @Override
  public void invalidateUserSession(Long userId) {
    if (userId == null) {
      return;
    }

    stringRedisTemplate.delete(refreshKey(userId));
    stringRedisTemplate.delete(sessionKey(userId));
  }

  private boolean isPasswordMatched(String rawPassword, String savedPassword) {
    if (rawPassword == null || savedPassword == null) {
      return false;
    }
    return passwordUtil.matches(rawPassword, savedPassword) || rawPassword.equals(savedPassword);
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private void ensureMemberCanAccess(Member member) {
    if (member == null) {
      return;
    }

    if ("DELETED".equals(member.getStatus())) {
      throw new IllegalArgumentException("탈퇴한 계정입니다.");
    }

    if (!"SUSPENDED".equals(member.getStatus())) {
      return;
    }

    // 정지 기간이 지났으면 상태를 복구하고 리턴 (기존 로직 유지)
    if (member.getSuspendedUntil() != null && !member.getSuspendedUntil().isAfter(LocalDateTime.now())) {
      authDao.updateMemberStatus(member.getUserId(), "ACTIVE");
      member.setStatus("ACTIVE");
      member.setSuspendedUntil(null);
      member.setSuspendReason(null);
      return;
    }

    // 💡 u.suspendReason -> 관리자가 직접 입력한 진짜 한글 문장
    String adminReason = member.getSuspendReason();

    // 💡 매퍼에서 새로 분리한 reportReason -> 영문 값 (NOSHOW, SPAM 등)
    String rawReport = member.getReportReason();
    String categoryTitle = "운영원칙 위반"; // 기본값

    // 💡 독립된 영문 키워드로 정확하게 한글 타이틀 매핑
    if (rawReport != null) {
      switch (rawReport.toUpperCase()) {
        case "NOSHOW":
          categoryTitle = "노쇼 제한";
          break;
        case "SPAM":
          categoryTitle = "광고 및 스팸 제한";
          break;
        case "FRAUD":
          categoryTitle = "사기 및 부정행위 제한";
          break;
        case "OTHER":
          categoryTitle = "기타 제한";
          break;
        default:
          categoryTitle = "운영원칙 위반 제한";
          break;
      }
    }

    // 💡 관리자가 입력한 소중한 원래 문구 앞에 한글 카테고리 타이틀 결합
    String finalReason = (adminReason != null && !adminReason.isBlank())
            ? "[" + categoryTitle + "] " + adminReason
            : "[" + categoryTitle + "] 제한된 계정입니다.";

    throw new AccountSuspendedException(
            finalReason,
            member.getSuspendedUntil() != null ? member.getSuspendedUntil().toString() : "관리자 문의 요망"
    );
  }

  
  private void validateSignupRequest(SignupRequest req) {
    if (req == null) {
      throw new IllegalArgumentException("회원가입 정보를 입력해주세요.");
    }
    if (req.getPassword() == null || !req.getPassword().matches(PASSWORD_PATTERN)) {
      throw new IllegalArgumentException("비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해 8자 이상 16자 이하로 입력해주세요.");
    }
    if (req.getNickname() == null || !req.getNickname().trim().matches(NICKNAME_PATTERN)) {
      throw new IllegalArgumentException("닉네임은 한글, 영문, 숫자만 입력해주세요.");
    }
    if (req.getGender() == null || (req.getGender() != 1 && req.getGender() != 2)) {
      throw new IllegalArgumentException("성별을 선택해주세요.");
    }
    if (req.getBirthYear() == null
        || req.getBirthYear() < 1900
        || req.getBirthYear() > Year.now().getValue()) {
      throw new IllegalArgumentException("출생년도는 4자리 연도로 입력해주세요.");
    }
    if (req.getRegionId() == null) {
      throw new IllegalArgumentException("지역을 선택해주세요.");
    }

    String phone = normalizePhone(req.getPhone());
    if (phone.length() < 9 || phone.length() > 11) {
      throw new IllegalArgumentException("연락처는 숫자 9자리에서 11자리까지 입력해주세요.");
    }
  }

  private String normalizePhone(String phone) {
    if (phone == null) {
      return "";
    }

    return phone.replaceAll("\\D", "");
  }

  private String normalizeEmail(String email) {
    if (!hasText(email) || !email.contains("@")) {
      throw new IllegalArgumentException("올바른 이메일 형식으로 입력해주세요.");
    }

    return email.trim().toLowerCase();
  }

  private String refreshKey(Long userId) {
    return REFRESH_KEY_PREFIX + userId;
  }

  private String sessionKey(Long userId) {
    return SESSION_KEY_PREFIX + userId;
  }

  private boolean sessionMatches(String sessionId, String savedSessionId) {
    return hasText(sessionId) && sessionId.equals(savedSessionId);
  }
}
