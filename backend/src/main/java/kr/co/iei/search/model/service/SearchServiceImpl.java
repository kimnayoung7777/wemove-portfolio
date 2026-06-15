package kr.co.iei.search.model.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {
  private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final String POPULAR_KEY_PREFIX = "search:popular:";
  private static final String DEDUPE_KEY_PREFIX = "search:dedupe:";
  private static final int MAX_LIMIT = 20;

  private final StringRedisTemplate stringRedisTemplate;

  @Override
  public void recordKeyword(String keyword, String actorKey) {
    String normalizedKeyword = normalizeKeyword(keyword);
    if (normalizedKeyword == null) {
      return;
    }

    String dedupeKey = buildDedupeKey(actorKey, normalizedKeyword);
    Boolean alreadyCounted = stringRedisTemplate.hasKey(dedupeKey);
    if (Boolean.TRUE.equals(alreadyCounted)) {
      return;
    }

    String popularKey = todayPopularKey();
    Duration dedupeTtl = durationUntilTomorrow();
    stringRedisTemplate.opsForZSet().incrementScore(popularKey, normalizedKeyword, 1D);
    stringRedisTemplate.expire(popularKey, dedupeTtl);
    stringRedisTemplate.opsForValue().set(dedupeKey, "1", dedupeTtl);
  }

  @Override
  public List<String> getPopularKeywords(int limit) {
    int safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    Set<String> rankedKeywords =
        stringRedisTemplate
            .opsForZSet()
            .reverseRange(todayPopularKey(), 0, safeLimit - 1);

    if (rankedKeywords == null || rankedKeywords.isEmpty()) {
      return List.of();
    }

    return new ArrayList<>(rankedKeywords);
  }

  private String normalizeKeyword(String keyword) {
    if (keyword == null) {
      return null;
    }

    String normalized = keyword.trim().replaceAll("\\s+", " ");
    if (normalized.length() < 2) {
      return null;
    }

    return normalized.length() > 30 ? normalized.substring(0, 30) : normalized;
  }

  private String buildDedupeKey(String actorKey, String keyword) {
    String safeActorKey =
        actorKey == null || actorKey.isBlank() ? "anonymous" : actorKey.trim();
    return DEDUPE_KEY_PREFIX
        + LocalDate.now(KOREA_ZONE_ID)
        + ":"
        + Integer.toHexString((safeActorKey + "|" + keyword.toLowerCase()).hashCode());
  }

  private String todayPopularKey() {
    return POPULAR_KEY_PREFIX + LocalDate.now(KOREA_ZONE_ID);
  }

  private Duration durationUntilTomorrow() {
    ZonedDateTime now = ZonedDateTime.now(KOREA_ZONE_ID);
    ZonedDateTime tomorrowStart = now.toLocalDate().plusDays(1).atStartOfDay(KOREA_ZONE_ID);
    return Duration.between(now, tomorrowStart);
  }
}
