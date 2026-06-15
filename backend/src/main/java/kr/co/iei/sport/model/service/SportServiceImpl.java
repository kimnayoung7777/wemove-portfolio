package kr.co.iei.sport.model.service;

import java.util.List;
import kr.co.iei.sport.model.dao.SportDao;
import kr.co.iei.sport.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SportServiceImpl implements SportService {
  private final SportDao sportDao;

  public List<Sport> getSports() {
    return sportDao.selectSports();
  }

  public void createSport(SportRequest req) {
    validateDuplicateName(null, req.getName());
    sportDao.insertSport(req);
  }

  public void updateSport(Long sportId, SportRequest req) {
    validateDuplicateName(sportId, req.getName());
    sportDao.updateSport(sportId, req);
  }

  public void deleteSport(Long sportId) {
    sportDao.deleteSport(sportId);
  }

  private void validateDuplicateName(Long sportId, String name) {
    String normalizedName = name == null ? "" : name.trim();
    if (normalizedName.isEmpty()) {
      throw new IllegalArgumentException("종목명을 입력해주세요.");
    }

    int duplicateCount =
        sportId == null
            ? sportDao.countByName(normalizedName)
            : sportDao.countByNameExcludingId(sportId, normalizedName);

    if (duplicateCount > 0) {
      throw new IllegalArgumentException("이미 존재하는 종목명입니다.");
    }
  }
}
