package kr.co.iei.stats.model.dao;

import kr.co.iei.stats.model.vo.LoginPageStatsResponse;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class StatsDao {
  private final SqlSession sqlSession;

  public LoginPageStatsResponse selectLoginPageStats() {
    return sqlSession.selectOne("stats.selectLoginPageStats");
  }
}
