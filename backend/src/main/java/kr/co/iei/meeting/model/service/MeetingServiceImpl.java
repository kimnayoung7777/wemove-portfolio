package kr.co.iei.meeting.model.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Comparator;
import kr.co.iei.chat.model.service.ChatService;
import kr.co.iei.common.service.CloudinaryImageService;
import kr.co.iei.meeting.model.dao.MeetingDao;
import kr.co.iei.meeting.model.vo.Meeting;
import kr.co.iei.meeting.model.vo.MeetingCreateRequest;
import kr.co.iei.meeting.model.vo.MeetingDetailResponse;
import kr.co.iei.meeting.model.vo.MeetingListResponse;
import kr.co.iei.meeting.model.vo.MeetingSearchCondition;
import kr.co.iei.meeting.model.vo.MeetingStatusUpdateRequest;
import kr.co.iei.meeting.model.vo.MeetingUpdateRequest;
import kr.co.iei.notification.model.service.NotificationService;
import kr.co.iei.participant.model.dao.ParticipantDao;
import kr.co.iei.participant.model.vo.MeetingParticipant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;

@Service
@RequiredArgsConstructor
public class MeetingServiceImpl implements MeetingService {
  private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final String POPULAR_KEY_PREFIX = "meeting:popular:";
  private static final String DEDUPE_KEY_PREFIX = "meeting:viewed:";
  private static final int MAIN_LIMIT = 5;
  private static final int POPULAR_RANKING_LIMIT = 100;
  private static final int POPULAR_RESULT_LIMIT = 5;
  private static final int POPULAR_PERIOD_TODAY_DAYS = 1;
  private static final int POPULAR_PERIOD_7D_DAYS = 7;
  private static final long POPULAR_KEY_TTL_DAYS = POPULAR_PERIOD_7D_DAYS + 1L;

  private final MeetingDao meetingDao;
  private final ParticipantDao participantDao;
  private final CloudinaryImageService cloudinaryImageService;
  private final StringRedisTemplate stringRedisTemplate;
  private final ChatService chatService;
  private final NotificationService notificationService;

  @Override
  public Map<String, Object> getMeetings(MeetingSearchCondition c) {
    List<MeetingListResponse> list = meetingDao.selectMeetingList(c);
    int totalCount = meetingDao.selectMeetingCount(c);

    Map<String, Object> result = new HashMap<>();
    result.put("list", list);
    result.put("totalCount", totalCount);
    return result;
  }

  @Override
  public List<Map<String, Object>> getTopRegions() {
    return meetingDao.selectTopRegions();
  }

  @Override
  public MeetingDetailResponse getMeeting(Long meetingId) {
    return meetingDao.selectMeetingDetail(meetingId);
  }

  @Override
  @Transactional
  public Long createMeeting(MeetingCreateRequest request, MultipartFile image, Long userId) {
    if (request.getMeetingDate() == null
        || request.getStartTime() == null
        || request.getEndTime() == null
        || request.getEndTime().isBlank()) {
      throw new IllegalArgumentException("모임 날짜와 시작·종료 시간을 모두 입력해주세요.");
    }

    LocalDate meetingDate = LocalDate.parse(request.getMeetingDate());
    LocalTime startTime = LocalTime.parse(request.getStartTime());
    LocalTime endTime = LocalTime.parse(request.getEndTime());

    validateMeetingTime(meetingDate, startTime, endTime);
    meetingDao.lockUserSchedule(userId);
    validateUserSchedule(userId, meetingDate, startTime, endTime, null);

    Meeting meeting = new Meeting();
    meeting.setHostUserId(userId);
    meeting.setSportId(request.getSportId());
    meeting.setRegionId(request.getRegionId());
    meeting.setTitle(request.getTitle());
    meeting.setContent(request.getContent());
    meeting.setThumbnailImage(cloudinaryImageService.uploadMeetingThumbnail(image));
    meeting.setPlaceName(request.getPlaceName());
    meeting.setAddress(request.getAddress());

    meeting.setMeetingDate(meetingDate);
    meeting.setStartTime(startTime);
    meeting.setEndTime(endTime);
    meeting.setMaxMembers(request.getMaxMembers());
    meeting.setMeetingType(request.getMeetingType());
    meeting.setRepeatType(request.getRepeatType());
    meeting.setStatus("RECRUITING");
    meeting.setSupplies(request.getSupplies());
    meeting.setGuideText(request.getGuideText());

    meetingDao.insertMeeting(meeting);

    MeetingParticipant hostParticipant = new MeetingParticipant();
    hostParticipant.setMeetingId(meeting.getMeetingId());
    hostParticipant.setUserId(userId);
    hostParticipant.setStatus("APPROVED");
    participantDao.insertParticipant(hostParticipant);

    return meeting.getMeetingId();
  }

  @Override
  @Transactional
  public void updateMeeting(Long meetingId, MeetingUpdateRequest request, MultipartFile image) {
    MeetingDetailResponse currentMeeting = meetingDao.selectMeetingDetail(meetingId);
    if (currentMeeting == null) {
      throw new IllegalArgumentException("존재하지 않는 모임입니다.");
    }

    LocalDate meetingDate = request.getMeetingDate();
    LocalTime startTime = request.getStartTime();
    LocalTime endTime = request.getEndTime();

    validateMeetingTime(meetingDate, startTime, endTime);
    meetingDao.lockUserSchedule(currentMeeting.getHostUserId());
    validateUserSchedule(
        currentMeeting.getHostUserId(),
        meetingDate,
        startTime,
        endTime,
        meetingId);

    Integer approveCount = participantDao.countApprovedByMeetingId(meetingId);

    if (approveCount != null && request.getMaxMembers() < approveCount) {
      throw new IllegalArgumentException("모집 인원은 현재 승인된 인원 (" + approveCount + "명) 이상이어야 합니다.");
    }
    request.setMeetingId(meetingId);

    if (Boolean.TRUE.equals(request.getIsImageRemoved())) {
      request.setThumbnailImage(null);
    } else if (image != null && !image.isEmpty()) {
      request.setThumbnailImage(cloudinaryImageService.uploadMeetingThumbnail(image));
    }

    meetingDao.updateMeeting(request);

    createChatSystemMessage(
        meetingId,
        currentMeeting.getHostUserId(),
        "모임장이 모임 상세내용을 수정하였습니다. 참가자들은 내용을 확인해주세요.");
    notifyApprovedParticipants(
        currentMeeting,
        "meetingUpdated",
        "모임 정보가 변경되었습니다",
        "'" + currentMeeting.getTitle() + "' 모임 상세내용이 변경되었습니다. 내용을 확인해주세요.");

  }

  @Override
  @Transactional
  public void deleteMeeting(Long meetingId) {
    MeetingDetailResponse meeting = meetingDao.selectMeetingDetail(meetingId);
    meetingDao.softDeleteMeeting(meetingId);
    if (meeting != null) {
      createChatSystemMessage(
          meetingId, meeting.getHostUserId(), "모임이 취소되어 모임톡이 비활성화되었습니다.");
      notifyApprovedParticipants(
          meeting,
          "meetingCancelled",
          "모임이 취소되었습니다",
          "'" + meeting.getTitle() + "' 모임이 취소되었습니다.");
    }
  }

  @Override
  @Transactional
  public void updateMeetingStatus(Long meetingId, MeetingStatusUpdateRequest request) {
    MeetingDetailResponse currentMeeting = meetingDao.selectMeetingDetail(meetingId);
    if (currentMeeting == null) {
      throw new IllegalArgumentException("존재하지 않는 모임입니다.");
    }

    String nextStatus = request.getStatus();

    // 1. 상태가 CLOSED(모집완료)로 변경될 때 정원 체크
    // -> 제거

    // 2. 상태를 RECRUITING으로 변경(재모집 등)할 때 시간 체크
    if ("RECRUITING".equals(nextStatus)) {
      LocalDateTime meetingDateTime = LocalDateTime.of(currentMeeting.getMeetingDate(), currentMeeting.getStartTime());
      if (meetingDateTime.isBefore(LocalDateTime.now())) {
        throw new IllegalArgumentException("이미 지난 시간의 모임은 다시 모집할 수 없습니다.");
      }
    }

    if ("CANCELLED".equals(nextStatus) && !"RECRUITING".equals(currentMeeting.getStatus())) {
      throw new IllegalArgumentException("모집중인 모임만 취소할 수 있습니다.");
    }

    if ("COMPLETED".equals(nextStatus) && !"ONGOING".equals(currentMeeting.getStatus())) {
      throw new IllegalArgumentException("진행중인 모임만 완료로 변경할 수 있습니다.");
    }

    meetingDao.updateMeetingStatus(meetingId, nextStatus);

    if ("CANCELLED".equals(nextStatus)) {
      createChatSystemMessage(
          meetingId, currentMeeting.getHostUserId(), "모임이 취소되어 모임톡이 비활성화되었습니다.");
      notifyApprovedParticipants(
          currentMeeting,
          "meetingCancelled",
          "모임이 취소되었습니다",
          "'" + currentMeeting.getTitle() + "' 모임이 취소되었습니다.");
    }
  }

  @Override
  public void recordMeetingView(Long meetingId, String actorKey) {
    MeetingDetailResponse meeting = meetingDao.selectMeetingDetail(meetingId);
    if (meeting == null || !"RECRUITING".equals(meeting.getStatus())) {
      return;
    }

    String normalizedActorKey = normalizeActorKey(actorKey);
    if (normalizedActorKey == null) {
      normalizedActorKey = "anonymous";
    }

    String dedupeKey = buildDedupeKey(meetingId, normalizedActorKey);
    Duration dedupeTtl = durationUntilTomorrow();
    Boolean firstView =
        stringRedisTemplate.opsForValue().setIfAbsent(dedupeKey, "1", dedupeTtl);
    if (!Boolean.TRUE.equals(firstView)) {
      return;
    }

    String popularKey = todayPopularKey();
    stringRedisTemplate.opsForZSet().incrementScore(popularKey, String.valueOf(meetingId), 1D);
    stringRedisTemplate.expire(popularKey, Duration.ofDays(POPULAR_KEY_TTL_DAYS));
  }

  @Override
  public List<MeetingListResponse> getMainMeetingList() {
    return getLatestRecruitingMeetings(MAIN_LIMIT, "전체");
  }

  @Override
  public List<MeetingListResponse> getPopularMeetingList(String period) {
    try {
      return getRankedRecruitingMeetings(
          parsePopularPeriodDays(period),
          POPULAR_RANKING_LIMIT,
          POPULAR_RESULT_LIMIT);
    } catch (Exception e) {
      System.err.println("[meeting] popular meeting load failed: " + e.getMessage());
      return List.of();
    }
  }

  @Override
  public List<MeetingListResponse> getMainMeetingList(String category) {
    return getLatestRecruitingMeetings(MAIN_LIMIT, category);
  }

  // 매퍼 구조(Map 파라미터 규격)와 카테고리 필터링을 통합한 도우미 메서드
  private List<MeetingListResponse> getLatestRecruitingMeetings(int limit, String category) {
    Map<String, Object> params = new HashMap<>();
    params.put("limit", limit);
    params.put("offset", 0);
    params.put("category", category);

    return meetingDao.selectMainMeetingList(params);
  }

  private void validateMeetingTime(LocalDate date, LocalTime startTime, LocalTime endTime) {
    if (date == null || startTime == null || endTime == null) {
      throw new IllegalArgumentException("모임 날짜와 시작·종료 시간을 모두 입력해주세요.");
    }
    if (endTime.equals(startTime)) {
      throw new IllegalArgumentException("시작 시간과 종료 시간은 같을 수 없습니다.");
    }
    LocalDateTime meetingDateTime = LocalDateTime.of(date, startTime);
    if (meetingDateTime.isBefore(LocalDateTime.now())) {
      throw new IllegalArgumentException("과거 시간으로는 모임을 생성하거나 수정할 수 없습니다.");
    }
  }

  private void validateUserSchedule(
      Long userId,
      LocalDate meetingDate,
      LocalTime startTime,
      LocalTime endTime,
      Long excludedMeetingId) {
    LocalDateTime startDateTime = LocalDateTime.of(meetingDate, startTime);
    LocalDateTime endDateTime = resolveEndDateTime(meetingDate, startTime, endTime);
    List<MeetingDetailResponse> conflicts =
        meetingDao.selectUserScheduleConflicts(
            userId, startDateTime, endDateTime, excludedMeetingId);
    if (conflicts.isEmpty()) {
      return;
    }

    MeetingDetailResponse conflict = conflicts.get(0);
    String conflictTime =
        conflict.getStartTime() + " ~ "
            + (isNextDay(conflict.getStartTime(), conflict.getEndTime()) ? "다음 날 " : "")
            + (conflict.getEndTime() == null
                ? conflict.getStartTime().plusHours(2)
                : conflict.getEndTime());
    throw new IllegalArgumentException(
        "해당 시간대에 이미 '"
            + conflict.getTitle()
            + "' 모임이 있습니다. ("
            + conflictTime
            + ")");
  }

  private LocalDateTime resolveEndDateTime(
      LocalDate meetingDate, LocalTime startTime, LocalTime endTime) {
    LocalDate endDate = endTime.isAfter(startTime) ? meetingDate : meetingDate.plusDays(1);
    return LocalDateTime.of(endDate, endTime);
  }

  private boolean isNextDay(LocalTime startTime, LocalTime endTime) {
    return endTime != null && !endTime.isAfter(startTime);
  }

  private List<MeetingListResponse> getRankedRecruitingMeetings(
      int periodDays,
      int rankingLimit,
      int resultLimit) {
    Map<Long, Integer> rankedMeetingViews = getRankedMeetingViews(periodDays, rankingLimit);
    List<Long> rankedMeetingIds = new ArrayList<>(rankedMeetingViews.keySet());
    if (rankedMeetingIds.isEmpty()) {
      return List.of();
    }

    List<MeetingListResponse> rankedMeetings = meetingDao.selectMainMeetingListByIds(rankedMeetingIds);
    Map<Long, MeetingListResponse> meetingMap = new LinkedHashMap<>();
    for (MeetingListResponse meeting : rankedMeetings) {
      meetingMap.put(meeting.getMeetingId(), meeting);
    }

    List<MeetingListResponse> result = new ArrayList<>();
    for (Long meetingId : rankedMeetingIds) {
      MeetingListResponse meeting = meetingMap.get(meetingId);
      if (meeting != null && "RECRUITING".equals(meeting.getStatus())) {
        meeting.setViewCount(rankedMeetingViews.getOrDefault(meetingId, 0));
        result.add(meeting);
      }
    }

    result.sort(
        Comparator.comparing(
                (MeetingListResponse meeting) -> meeting.getViewCount() == null ? 0 : meeting.getViewCount())
            .reversed()
            .thenComparing(MeetingListResponse::getMeetingDate, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(MeetingListResponse::getStartTime, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(MeetingListResponse::getMeetingId, Comparator.nullsLast(Comparator.reverseOrder())));

    return result.size() > resultLimit ? result.subList(0, resultLimit) : result;
  }

  private Map<Long, Integer> getRankedMeetingViews(int periodDays, int limit) {
    Map<Long, Integer> aggregatedViews = new HashMap<>();
    LocalDate today = LocalDate.now(KOREA_ZONE_ID);

    for (int i = 0; i < periodDays; i++) {
      String popularKey = popularKey(today.minusDays(i));
      Set<TypedTuple<String>> rankedEntries =
          stringRedisTemplate.opsForZSet().reverseRangeWithScores(popularKey, 0, limit - 1);

      if (rankedEntries == null || rankedEntries.isEmpty()) {
        continue;
      }

      for (TypedTuple<String> rankedEntry : rankedEntries) {
        if (rankedEntry == null || rankedEntry.getValue() == null || rankedEntry.getScore() == null) {
          continue;
        }

        if (rankedEntry.getScore() <= 0D) {
          continue;
        }

        try {
          Long meetingId = Long.valueOf(rankedEntry.getValue());
          aggregatedViews.merge(meetingId, rankedEntry.getScore().intValue(), Integer::sum);
        } catch (NumberFormatException ignored) {}
      }
    }

    if (aggregatedViews.isEmpty()) {
      return Map.of();
    }

    return aggregatedViews.entrySet().stream()
        .sorted((left, right) -> Integer.compare(right.getValue(), left.getValue()))
        .limit(limit)
        .collect(Collectors.toMap(
            Map.Entry::getKey,
            Map.Entry::getValue,
            (left, right) -> left,
            LinkedHashMap::new));
  }

  private String normalizeActorKey(String actorKey) {
    if (actorKey == null) {
      return null;
    }
    String normalized = actorKey.trim();
    return normalized.isBlank() ? null : normalized;
  }

  private String buildDedupeKey(Long meetingId, String actorKey) {
    return DEDUPE_KEY_PREFIX + LocalDate.now(KOREA_ZONE_ID) + ":" + meetingId + ":" + Integer.toHexString(actorKey.toLowerCase().hashCode());
  }

  private String todayPopularKey() {
    return popularKey(LocalDate.now(KOREA_ZONE_ID));
  }

  private String popularKey(LocalDate date) {
    return POPULAR_KEY_PREFIX + date;
  }

  private int parsePopularPeriodDays(String period) {
    if (period == null) {
      return POPULAR_PERIOD_7D_DAYS;
    }

    String normalized = period.trim().toLowerCase();
    if ("today".equals(normalized) || "1d".equals(normalized)) {
      return POPULAR_PERIOD_TODAY_DAYS;
    }

    return POPULAR_PERIOD_7D_DAYS;
  }

  private Duration durationUntilTomorrow() {
    ZonedDateTime now = ZonedDateTime.now(KOREA_ZONE_ID);
    ZonedDateTime tomorrowStart = now.toLocalDate().plusDays(1).atStartOfDay(KOREA_ZONE_ID);
    return Duration.between(now, tomorrowStart);
  }

  private boolean isScheduleOrPlaceChanged(MeetingDetailResponse current, MeetingUpdateRequest request) {
    return !Objects.equals(current.getMeetingDate(), request.getMeetingDate())
        || !Objects.equals(current.getStartTime(), request.getStartTime())
        || !Objects.equals(current.getEndTime(), request.getEndTime())
        || !Objects.equals(normalizeText(current.getPlaceName()), normalizeText(request.getPlaceName()))
        || !Objects.equals(normalizeText(current.getAddress()), normalizeText(request.getAddress()));
  }

  private String normalizeText(String value) {
    return value == null ? "" : value.trim();
  }

  private void notifyApprovedParticipants(
      MeetingDetailResponse meeting, String type, String title, String message) {
    if (meeting == null || meeting.getMeetingId() == null) {
      return;
    }

    List<Long> userIds = participantDao.selectApprovedUserIds(meeting.getMeetingId(), meeting.getHostUserId());
    for (Long userId : userIds) {
      notificationService.sendToUser(userId, type, title, message, "meeting:" + meeting.getMeetingId());
    }
  }

  private void createChatSystemMessage(Long meetingId, Long userId, String content) {
    if (meetingId == null || userId == null) {
      return;
    }
    chatService.createSystemMessage(meetingId, userId, content);
  }
}
