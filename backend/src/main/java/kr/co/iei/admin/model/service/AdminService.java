package kr.co.iei.admin.model.service;

import java.util.List;
import kr.co.iei.admin.model.vo.*;

public interface AdminService {
  AdminSummary getSummary();

  List<AdminMemberResponse> getMembers();

  List<AdminRegionResponse> getRegions();

  List<AdminMeetingResponse> getMeetings();

  List<AdminReportResponse> getReports();

  void updateMemberStatus(Long userId, String status);

  void updateMeetingStatus(Long meetingId, String status);

  void processReport(Long reportId, AdminReportActionRequest request);
}
