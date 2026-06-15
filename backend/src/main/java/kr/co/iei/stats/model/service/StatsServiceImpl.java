package kr.co.iei.stats.model.service;

import kr.co.iei.stats.model.dao.StatsDao;
import kr.co.iei.stats.model.vo.LoginPageStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatsServiceImpl implements StatsService {
  private final StatsDao statsDao;

  @Override
  public LoginPageStatsResponse getLoginPageStats() {
    return statsDao.selectLoginPageStats();
  }
}
