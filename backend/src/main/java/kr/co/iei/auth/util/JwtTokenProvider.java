package kr.co.iei.auth.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import kr.co.iei.auth.model.vo.LoginResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
  private final SecretKey secretKey;
  private final long accessTokenSeconds;

  public JwtTokenProvider(
      @Value("${wemove.auth.jwt-secret}") String secret,
      @Value("${wemove.auth.access-token-seconds}") long accessTokenSeconds) {
    this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.accessTokenSeconds = accessTokenSeconds;
  }

  public String createAccessToken(LoginResponse user) {
    return createAccessToken(user, null);
  }

  public String createAccessToken(LoginResponse user, String sessionId) {
    Instant now = Instant.now();
    var builder =
        Jwts.builder()
        .subject(String.valueOf(user.getMemberId()))
        .claim("loginId", user.getLoginId())
        .claim("nickname", user.getNickname())
        .claim("role", user.getRole())
        .claim("typ", "access")
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(accessTokenSeconds)));

    if (sessionId != null && !sessionId.isBlank()) {
      builder.claim("sid", sessionId);
    }

    return builder.signWith(secretKey).compact();
  }

  public String createRefreshToken(Long userId, String sessionId, long refreshTokenSeconds) {
    Instant now = Instant.now();
    var builder =
        Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("typ", "refresh")
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(refreshTokenSeconds)));

    if (sessionId != null && !sessionId.isBlank()) {
      builder.claim("sid", sessionId);
    }

    return builder.signWith(secretKey).compact();
  }

  public boolean isValid(String token) {
    try {
      parseClaims(token);
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }

  public LoginResponse parseUser(String accessToken) {
    Claims claims = parseClaims(accessToken);
    return new LoginResponse(
        Long.valueOf(claims.getSubject()),
        claims.get("loginId", String.class),
        claims.get("nickname", String.class),
        claims.get("role", String.class));
  }

  public Long parseUserId(String token) {
    return Long.valueOf(parseClaims(token).getSubject());
  }

  public String parseSessionId(String token) {
    return parseClaims(token).get("sid", String.class);
  }

  private Claims parseClaims(String token) {
    return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
  }
}
