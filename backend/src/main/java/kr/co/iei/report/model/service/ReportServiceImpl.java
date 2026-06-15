package kr.co.iei.report.model.service;

import kr.co.iei.report.model.dao.ReportDao;
import kr.co.iei.report.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {
  private final ReportDao reportDao;

  public void createReport(ReportRequest req) {
    Report r = new Report();
    r.setReporterId(req.getReporterId());
    r.setMeetingId(req.getMeetingId());
    r.setTargetUserId(req.getTargetUserId());
    r.setReason(req.getReason());
    r.setContent(req.getContent());
    if (reportDao.countPendingDuplicateReport(r) > 0) {
      throw new IllegalArgumentException("이미 접수되어 검토 중인 신고입니다.");
    }
    reportDao.insertReport(r);
  }
}
