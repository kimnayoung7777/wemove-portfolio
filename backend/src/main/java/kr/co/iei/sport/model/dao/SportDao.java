package kr.co.iei.sport.model.dao;

import java.util.*;
import kr.co.iei.sport.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SportDao {
  private final SqlSession sqlSession;

  public List<Sport> selectSports() {
    return sqlSession.selectList("sport.selectSports");
  }

  public int insertSport(SportRequest req) {
    return sqlSession.insert("sport.insertSport", req);
  }

  public int countByName(String name) {
    Integer count = sqlSession.selectOne("sport.countByName", name);
    return count == null ? 0 : count;
  }

  public int countByNameExcludingId(Long sportId, String name) {
    Integer count =
        sqlSession.selectOne(
            "sport.countByNameExcludingId",
            Map.of("sportId", sportId, "name", name));
    return count == null ? 0 : count;
  }

  public int updateSport(Long sportId, SportRequest req) {
    Map<String, Object> p = new HashMap<>();
    p.put("sportId", sportId);
    p.put("request", req);
    return sqlSession.update("sport.updateSport", p);
  }

  public int deleteSport(Long sportId) {
    return sqlSession.delete("sport.deleteSport", sportId);
  }
}
