
# PPT
https://1drv.ms/p/c/8333468d69d7768e/IQAYbTYhWd8qQYpaXNNGNpiTAVL2DhEf9KVGSsJpm6_6GQU?e=hrhfVk


# WeMove Frontend

WeMove는 운동을 함께할 사람과 모임을 찾고, 만들고, 참여하고, 관리할 수 있는 운동 모임 플랫폼입니다.  
이 저장소는 WeMove 프론트엔드 애플리케이션이며 Vite와 React 기반으로 구성되어 있습니다.

## 주요 기능

- 메인 페이지: 신규 모임, 인기 모임, 운동 카테고리, 주간 일정 확인
- 모임 찾기: 지역, 날짜, 운동 종목, 키워드 기반 모임 검색
- 모임 상세: 모임 정보 확인, 참여 신청, 댓글/대댓글, 공유, 조회 기록
- 모임 관리: 모임 생성, 수정, 삭제 및 모집/진행 상태 관리
- 사용자 활동: 참여 예정, 대기, 완료, 내가 만든 모임 확인
- 마이페이지: 회원 정보, 관심 운동, 지역, 계정 관리
- 인증: 로그인, 회원가입, 세션 관리, 이메일 인증, 아이디/비밀번호 찾기
- 신고 기능: 모임/댓글/사용자 신고 및 관리자 처리
- 관리자 페이지: 회원 관리, 모임 관리, 신고 내역, 운동 종목 관리
- 모임 채팅: 로그인 사용자의 모임 기반 채팅 UI
- 1:1 채팅: 사용자 간 직접 채팅방 및 메시지 관리

## 담당 업무 예시

- 로그인 및 세션 관리
- 신고 기능 구현
- 관리자 신고 관리

## 기술 스택

- React 18
- Vite
- React Router DOM
- Axios
- React Hook Form
- React Calendar
- CSS Modules

## 실행 방법

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

배포 환경용 빌드가 필요한 경우 아래 명령어를 사용할 수 있습니다.

```bash
npm run build:aws
```

## 환경 변수

`.env.production.example`을 참고해 배포 환경 변수를 설정합니다.

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
VITE_WS_BASE_URL=wss://your-render-service.onrender.com/ws
```

배포 주소 예시:

```text
Frontend: https://wemove-web.vercel.app
Backend: https://wemove.onrender.com
```

## 주요 폴더

- `src/pages`: 라우트 단위 페이지 컴포넌트
- `src/components`: 공통 UI, 모달, 레이아웃 컴포넌트
- `src/api`: 백엔드 API 호출 함수
- `src/contexts`: 인증 및 전역 상태 컨텍스트
- `src/data`: 네비게이션, 카테고리 등 정적 데이터
- `src/hooks`: 공통 커스텀 훅
- `src/styles`: 페이지별 CSS Module과 공통 스타일
- `src/utils`: 날짜, 아이콘, 이미지, 인증 보조 유틸
- `public`: 정적 파일
- `docs`: 배포, 아키텍처, 발표 자료 문서

## 주요 라우트

- `/`: 홈
- `/meetings`: 모임 찾기
- `/search`: 통합 검색
- `/meetings/:meetingId`: 모임 상세
- `/meetings/new`: 모임 생성
- `/meetings/:meetingId/edit`: 모임 수정
- `/meetings/:meetingId/manage`: 모임 관리
- `/activity`: 내 활동
- `/mypage`: 마이페이지
- `/admin`: 관리자 페이지
- `/login`: 로그인
- `/signup`: 회원가입
- `/find-account`: 계정 찾기

## 데이터베이스 구조

백업 SQL 기준으로 주요 테이블은 다음과 같습니다.

- `users`: 회원 정보, 권한, 계정 상태, 정지 정보
- `regions`: 시도/시군구/읍면동 지역 정보
- `sports`: 운동 종목 및 카테고리
- `userSports`: 사용자 관심 운동
- `meetings`: 운동 모임 정보
- `meetingParticipants`: 모임 참여 신청 및 승인 상태
- `meetingChatMessages`: 모임 채팅 메시지
- `comments`: 모임 댓글 및 대댓글
- `reports`: 신고 내역 및 처리 상태
- `reviews`: 모임 후기
- `notifications`: 사용자 알림
- `directChatRooms`: 1:1 채팅방
- `directChatParticipants`: 1:1 채팅 참여자
- `directChatMessages`: 1:1 채팅 메시지

## DB 관계 설정

대부분의 핵심 테이블은 Foreign Key로 관계가 설정되어 있습니다.

- `users.regionId` -> `regions.regionId`
- `meetings.hostUserId` -> `users.userId`
- `meetings.sportId` -> `sports.sportId`
- `meetings.regionId` -> `regions.regionId`
- `meetingParticipants.meetingId` -> `meetings.meetingId`
- `meetingParticipants.userId` -> `users.userId`
- `comments.meetingId` -> `meetings.meetingId`
- `comments.writerId` -> `users.userId`
- `comments.parentCommentId` -> `comments.commentId`
- `reports.reporterId` -> `users.userId`
- `reports.targetUserId` -> `users.userId`
- `reports.meetingId` -> `meetings.meetingId`
- `reports.commentId` -> `comments.commentId`
- `reviews.meetingId` -> `meetings.meetingId`
- `reviews.writerId` -> `users.userId`
- `userSports.userId` -> `users.userId`
- `userSports.sportId` -> `sports.sportId`
- `notifications.userId` -> `users.userId`
- `directChatParticipants.roomId` -> `directChatRooms.roomId`
- `directChatParticipants.userId` -> `users.userId`
- `directChatMessages.roomId` -> `directChatRooms.roomId`
- `directChatMessages.userId` -> `users.userId`

주의사항:

- `meetingChatMessages`는 `meetingId`, `userId` 인덱스는 있지만 백업 SQL 기준 Foreign Key 제약조건은 설정되어 있지 않습니다.
- `notifications.targetType`, `notifications.targetId`는 여러 대상 테이블을 참조할 수 있는 다형 참조 구조라 별도 Foreign Key를 두지 않았습니다.

필요하면 아래 SQL로 `meetingChatMessages` 관계를 추가할 수 있습니다.

```sql
ALTER TABLE meetingChatMessages
ADD CONSTRAINT fk_meeting_chat_messages_meeting
FOREIGN KEY (meetingId) REFERENCES meetings(meetingId) ON DELETE CASCADE;

ALTER TABLE meetingChatMessages
ADD CONSTRAINT fk_meeting_chat_messages_user
FOREIGN KEY (userId) REFERENCES users(userId);
```

## 배포 및 이메일 인증

- 프론트엔드는 Vercel 배포를 기준으로 구성했습니다.
- 백엔드는 Render 배포를 기준으로 구성했습니다.
- Render Free 환경에서는 Gmail SMTP 포트 연결이 제한될 수 있어 이메일 인증은 SMTP 대신 HTTP 기반 이메일 전송 방식으로 전환했습니다.
- 이메일 인증 링크는 백엔드에서 생성하고, 프론트엔드에서는 인증 결과 화면과 사용자 흐름을 처리합니다.

## 참고 문서

- `docs/vercel-render-deploy.md`: Vercel + Render 배포 참고
- `docs/wemove-architecture-guide.md`: 프로젝트 아키텍처 가이드
- `docs/wemove-presentation-deck.md`: 발표 자료
- `docs/wemove-manus-ppt-prompt.md`: 발표 자료 생성용 프롬프트
