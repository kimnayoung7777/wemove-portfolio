package kr.co.iei.report.model.dao;

import java.util.List;
import java.util.Map;
import kr.co.iei.report.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReportDao {
  private final SqlSession sqlSession;

  public int insertReport(Report r) {
    return sqlSession.insert("report.insertReport", r);
  }

  public int countPendingDuplicateReport(Report r) {
    Integer count = sqlSession.selectOne("report.countPendingDuplicateReport", r);
    return count == null ? 0 : count;
  }

  public List<ReportResponse> selectReports() {
    return sqlSession.selectList("report.selectReports");
  }

  public int updateReportStatus(Long reportId, String status) {
    return sqlSession.update(
        "report.updateReportStatus", Map.of("reportId", reportId, "status", status));
  }
}
