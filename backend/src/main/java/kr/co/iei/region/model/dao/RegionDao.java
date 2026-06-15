package kr.co.iei.region.model.dao;

import java.util.List;
import kr.co.iei.region.model.vo.Region;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RegionDao {
  private final SqlSession sqlSession;

  public List<Region> selectRegions() {
    return sqlSession.selectList("region.selectRegions");
  }
}
