package kr.co.iei.auth.model.service;

import kr.co.iei.auth.model.dao.AuthDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserSuspensionScheduler {
  private final AuthDao authDao;

  @Scheduled(fixedDelay = 60_000)
  @Transactional
  public void restoreExpiredSuspensions() {
    int updated = authDao.restoreExpiredSuspensions();
    if (updated > 0) {
      log.info("Auto-restored {} suspended user(s).", updated);
    }
  }
}
