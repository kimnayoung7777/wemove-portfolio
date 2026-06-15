-- 계정 일시 정지(관리자 신고 처리)용 컬럼
-- RDS / MySQL에서 한 번 실행하세요.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspendedUntil DATETIME NULL
    COMMENT '정지 해제 예정 시각 (NULL이면 기간 미지정)';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspendReason VARCHAR(500) NULL
    COMMENT '정지 사유 (로그인 차단 안내용)';
