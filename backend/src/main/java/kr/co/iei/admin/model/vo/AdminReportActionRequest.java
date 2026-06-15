package kr.co.iei.admin.model.vo;

import lombok.Data;

@Data
public class AdminReportActionRequest {
    private String actionType;       // WARNING, SUSPEND, REJECT
    private int suspendDuration;     // 정지 시간 (12, 24, 72 등)
    private String message;          // 제재 사유 / 알림 내용
    private Integer targetUserId;    // 제재 대상 회원 ID
}