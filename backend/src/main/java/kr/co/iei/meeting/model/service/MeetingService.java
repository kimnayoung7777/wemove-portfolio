package kr.co.iei.meeting.model.service;

import java.util.*;
import kr.co.iei.meeting.model.vo.*;
import org.springframework.web.multipart.MultipartFile;

public interface MeetingService {
  Map<String, Object> getMeetings(MeetingSearchCondition c);

  List<Map<String, Object>> getTopRegions();

  MeetingDetailResponse getMeeting(Long meetingId);

  Long createMeeting(MeetingCreateRequest request, MultipartFile image, Long userId);

  void updateMeeting(Long meetingId, MeetingUpdateRequest request, MultipartFile image);

  void deleteMeeting(Long meetingId);

  void updateMeetingStatus(Long meetingId, MeetingStatusUpdateRequest request);

  void recordMeetingView(Long meetingId, String actorKey);



  List<MeetingListResponse> getPopularMeetingList(String period);

  List<MeetingListResponse> getMainMeetingList();

  List<MeetingListResponse> getMainMeetingList(String category);

    
}
