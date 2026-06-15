package kr.co.iei.auth.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieUtil {
  public static final String REFRESH_TOKEN_COOKIE = "wemove_refresh_token";

  private final boolean secureCookie;

  public AuthCookieUtil(@Value("${wemove.auth.secure-cookie:false}") boolean secureCookie) {
    this.secureCookie = secureCookie;
  }

  public void addRefreshTokenCookie(
      HttpServletResponse response,
      String refreshToken,
      long maxAgeSeconds,
      boolean persistentLogin) {
    ResponseCookie.ResponseCookieBuilder builder =
        baseCookie(REFRESH_TOKEN_COOKIE, refreshToken);

    if (persistentLogin) {
      builder.maxAge(maxAgeSeconds);
    }

    response.addHeader("Set-Cookie", builder.build().toString());
  }

  public void clearRefreshTokenCookie(HttpServletResponse response) {
    response.addHeader(
        "Set-Cookie", baseCookie(REFRESH_TOKEN_COOKIE, "").maxAge(0).build().toString());
  }

  public String getCookieValue(HttpServletRequest request, String cookieName) {
    if (request.getCookies() == null) {
      return null;
    }

    return Arrays.stream(request.getCookies())
        .filter(cookie -> cookieName.equals(cookie.getName()))
        .map(Cookie::getValue)
        .findFirst()
        .orElse(null);
  }

  private ResponseCookie.ResponseCookieBuilder baseCookie(String name, String value) {
    return ResponseCookie.from(name, value)
        .httpOnly(true)
        .secure(secureCookie)
        .sameSite(secureCookie ? "None" : "Lax")
        .path("/");
  }
}
