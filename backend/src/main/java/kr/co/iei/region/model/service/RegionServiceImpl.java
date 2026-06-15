package kr.co.iei.region.model.service;

import java.util.List;
import kr.co.iei.region.model.dao.RegionDao;
import kr.co.iei.region.model.vo.Region;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RegionServiceImpl implements RegionService {
  private final RegionDao regionDao;

  public List<Region> getRegions() {
    return regionDao.selectRegions();
  }
}
