package kr.co.iei.search.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.UUID;
import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.search.model.service.SearchService;
import kr.co.iei.search.model.vo.SearchKeywordRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
  private static final String GUEST_COOKIE_NAME = "wemove_guest_id";
  private static final int GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

  private final SearchService searchService;
  private final JwtTokenProvider jwtTokenProvider;

  @PostMapping("/keywords")
  public ResponseEntity<Void> recordKeyword(
      @RequestBody SearchKeywordRequest request,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
      HttpServletRequest httpServletRequest,
      HttpServletResponse httpServletResponse) {
    searchService.recordKeyword(
        request.getKeyword(),
        resolveActorKey(authorizationHeader, httpServletRequest, httpServletResponse));
    return ResponseEntity.ok().build();
  }

  @GetMapping("/popular")
  public ResponseEntity<List<String>> popularKeywords(
      @RequestParam(defaultValue = "8") int limit) {
    return ResponseEntity.ok(searchService.getPopularKeywords(limit));
  }

  private String resolveActorKey(
      String authorizationHeader,
      HttpServletRequest httpServletRequest,
      HttpServletResponse httpServletResponse) {
    String accessToken = extractBearerToken(authorizationHeader);

    if (accessToken != null && jwtTokenProvider.isValid(accessToken)) {
      return "user:" + jwtTokenProvider.parseUserId(accessToken);
    }

    String guestId = findGuestId(httpServletRequest);
    if (guestId != null) {
      return "guest:" + guestId;
    }

    String createdGuestId = UUID.randomUUID().toString();
    Cookie guestCookie = new Cookie(GUEST_COOKIE_NAME, createdGuestId);
    guestCookie.setHttpOnly(true);
    guestCookie.setPath("/");
    guestCookie.setMaxAge(GUEST_COOKIE_MAX_AGE);
    httpServletResponse.addCookie(guestCookie);
    return "guest:" + createdGuestId;
  }

  private String findGuestId(HttpServletRequest httpServletRequest) {
    Cookie[] cookies = httpServletRequest.getCookies();
    if (cookies == null || cookies.length == 0) {
      return null;
    }

    for (Cookie cookie : cookies) {
      if (GUEST_COOKIE_NAME.equals(cookie.getName())
          && cookie.getValue() != null
          && !cookie.getValue().isBlank()) {
        return cookie.getValue().trim();
      }
    }

    return null;
  }

  private String extractBearerToken(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      return null;
    }

    return authorizationHeader.substring(7);
  }
}
