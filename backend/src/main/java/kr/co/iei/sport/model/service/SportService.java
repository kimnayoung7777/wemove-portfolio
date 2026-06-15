package kr.co.iei.sport.model.service;

import java.util.List;
import kr.co.iei.sport.model.vo.*;

public interface SportService {
  List<Sport> getSports();

  void createSport(SportRequest req);

  void updateSport(Long sportId, SportRequest req);

  void deleteSport(Long sportId);
}
