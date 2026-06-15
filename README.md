# PPT
https://1drv.ms/p/c/8333468d69d7768e/IQAYbTYhWd8qQYpaXNNGNpiTAVL2DhEf9KVGSsJpm6_6GQU?e=71WYck

# WeMove 🏃‍♂️
WeMove는 지역과 운동 종목을 기준으로 운동 모임을 찾고, 신청하고, 함께 관리하는 지역 기반 운동 모임 매칭 플랫폼입니다.

## ✨ 최근 구현 포인트

- 📍 지역/종목/날짜/상태 기반 모임 탐색
- 📱 모바일 최적화 헤더와 카드 레이아웃
- 🔎 통합 검색, 인기 검색어, 최근 검색어
- 📅 `내 활동` 캘린더와 일정별 모임 확인
- 🧭 `내가 만든 모임` 상태 관리 모달
- 🔔 참여 예정 / 대기 / 완료 모임 상태 분리
- 🤝 모임 공유, 링크 복사, Web Share 지원
- 👑 주최자 포함 인원 집계 기준 적용
- 🧩 로그인 / 회원가입 / 계정찾기 UI 톤 통일

## 🎯 프로젝트 목표

- 지역 기반으로 가까운 운동 모임을 쉽게 찾을 수 있도록 제공
- 러닝, 헬스, 풋살, 농구, 배드민턴, 등산 등 운동 종목별 모임 탐색 지원
- 모임 생성부터 참가 신청, 신청자 승인/거절까지 하나의 흐름으로 관리
- `내 활동`에서 참여 예정, 대기, 완료, 내가 만든 모임을 한 번에 확인
- 관리자 기능을 통해 회원, 모임, 신고, 운동 종목을 관리할 수 있는 구조 설계

## 🧩 주요 기능

### 👤 회원 기능

- 회원가입 / 로그인
- 아이디 중복 확인
- 이메일 인증
- 아이디 찾기 / 비밀번호 재설정

### 🏟️ 모임 기능

- 지역 기반 운동 모임 조회
- 운동 종목별 필터링
- 모집 상태 / 날짜 / 검색어 기반 모임 검색
- 모임 생성 / 수정 / 삭제
- 모임 썸네일 등록
- 모임 방식, 반복 방식, 준비물, 진행 안내 등록
- 참가 신청 / 신청 취소
- 신청자 승인 / 거절
- 댓글 / 문의
- 모임 공유

### 📊 내 활동

- 참여 예정 / 대기 / 완료 모임 구분
- 내가 만든 모임 상태 관리
- 모임 취소 모달
- 내 일정 캘린더
- 구글 캘린더 추가

### 🛠️ 관리자

- 관리자 페이지
- 회원 관리
- 모임 관리
- 신고 관리
- 운동 종목 관리

### 🌱 후순위 기능

- 모임 종료 후 후기 작성
- 별점 작성
- 후기 이미지 첨부

## 🗺️ 페이지 구성

| 구분 | 페이지명 | 경로 예시 | 설명 | 우선순위 |
| --- | --- | --- | --- | --- |
| 메인 | 홈 | `/` | 서비스 소개, 주변 모임 탐색, 추천 모임, 지역 현황 확인 | 1차 |
| 회원 | 로그인 | `/login` | 사용자 로그인 | 1차 |
| 회원 | 회원가입 | `/signup` | 계정 생성, 관심 운동 선택 | 1차 |
| 회원 | 아이디/비밀번호 찾기 | `/find-account` | 이메일 인증 기반 아이디 찾기 / 비밀번호 재설정 | 2차 |
| 모임 | 모임 찾기 | `/meetings` | 운동 종목/지역/상태별 모임 목록 조회 | 1차 |
| 모임 | 모임 상세 | `/meetings/:id` | 모임 상세 정보 확인, 댓글/문의, 참가 신청, 공유 | 1차 |
| 모임 | 모임 만들기 | `/meetings/new` | 새 운동 모임 등록 | 1차 |
| 모임 | 모임 수정 | `/meetings/:id/edit` | 등록한 모임 정보 수정 | 1차 |
| 모임 | 신청자 관리 | `/meetings/:id/manage` | 참가 신청자 승인/거절/관리 | 1차 |
| 마이페이지 | 마이페이지 | `/mypage` | 내 프로필, 내가 만든 모임, 신청/참여 모임 확인 | 1차 |
| 마이페이지 | 내 활동 | `/activity` | 예정/대기/완료 모임과 캘린더, 상태 관리 | 1차 |
| 관리자 | 관리자 페이지 | `/admin` | 회원/모임/신고/운동 종목 관리 | 2차 |
| 후기 | 후기 작성/조회 | `/reviews` | 모임 후기 작성, 별점, 이미지 첨부 | 후순위 |

## 🛠️ 기술 스택

### Frontend

- React
- Vite
- JavaScript
- React Router
- Axios
- CSS Module
- Pretendard Font

### Backend

- Spring Boot
- Java 17
- Maven
- MyBatis
- Lombok

### Database

- MySQL

### IDE / Tool

- IntelliJ IDEA
- VS Code
- GitHub
- Notion

## 📦 프로젝트 구조

```text
WeMove/
  backend/
  frontend/
  docs/
  README.md
  .gitignore
```

```text
backend/
  pom.xml
  src/main/java/kr/co/iei/...
  src/main/resources/
```

```text
frontend/
  package.json
  vite.config.js
  src/
    assets/
    components/
    data/
    pages/
    styles/
```

```text
docs/
  project-overview.md
  erd.md
  api-spec.md
  page-structure.md
  tech-stack.md
  setup-guide.md
```

## 🧱 백엔드 패키지 구조

```text
kr.co.iei.auth.controller
kr.co.iei.auth.model.dao
kr.co.iei.auth.model.service
kr.co.iei.auth.model.vo

kr.co.iei.member.controller
kr.co.iei.member.model.dao
kr.co.iei.member.model.service
kr.co.iei.member.model.vo

kr.co.iei.meeting.controller
kr.co.iei.meeting.model.dao
kr.co.iei.meeting.model.service
kr.co.iei.meeting.model.vo

kr.co.iei.participant.controller
kr.co.iei.participant.model.dao
kr.co.iei.participant.model.service
kr.co.iei.participant.model.vo

kr.co.iei.comment.controller
kr.co.iei.comment.model.dao
kr.co.iei.comment.model.service
kr.co.iei.comment.model.vo

kr.co.iei.admin.controller
kr.co.iei.admin.model.dao
kr.co.iei.admin.model.service
kr.co.iei.admin.model.vo
```

## 🗃️ DB 주요 테이블

| 테이블명 | 설명 | 우선순위 |
| --- | --- | --- |
| `USERS` | 회원 정보 | 1차 |
| `SPORTS` | 운동 종목 | 1차 |
| `USER_SPORTS` | 회원 관심 운동 | 1차 |
| `REGIONS` | 지역 정보 | 1차 |
| `MEETINGS` | 운동 모임 | 1차 |
| `MEETING_PARTICIPANTS` | 모임 참가 신청/참가자 | 1차 |
| `COMMENTS` | 모임 댓글/문의 | 1차 또는 2차 |
| `REPORTS` | 신고 | 2차 |
| `REVIEWS` | 모임 후기 | 후순위 |

## 🔌 주요 API 초안

| 기능 | Method | URL 예시 | 설명 | 우선순위 |
| --- | --- | --- | --- | --- |
| 회원가입 | `POST` | `/api/users/signup` | 회원 등록 | 1차 |
| 로그인 | `POST` | `/api/users/login` | 로그인 | 1차 |
| 아이디 중복 확인 | `GET` | `/api/users/check-id?loginId=` | 아이디 사용 가능 여부 | 1차 |
| 이메일 인증 요청 | `POST` | `/api/users/email/send` | 인증 메일 발송 | 1차 |
| 이메일 인증 확인 | `POST` | `/api/users/email/verify` | 인증 코드 확인 | 1차 |
| 모임 목록 조회 | `GET` | `/api/meetings` | 지역/종목/상태 필터 조회 | 1차 |
| 모임 상세 조회 | `GET` | `/api/meetings/{meetingId}` | 모임 상세 정보 | 1차 |
| 모임 생성 | `POST` | `/api/meetings` | 새 모임 등록 | 1차 |
| 모임 수정 | `PUT` | `/api/meetings/{meetingId}` | 모임 정보 수정 | 1차 |
| 모임 삭제 | `DELETE` | `/api/meetings/{meetingId}` | 모임 삭제/소프트 삭제 | 1차 |
| 참가 신청 | `POST` | `/api/meetings/{meetingId}/participants` | 참가 신청 | 1차 |
| 신청 취소 | `PATCH` | `/api/participants/{participantId}/cancel` | 신청 취소 | 1차 |
| 신청자 목록 | `GET` | `/api/meetings/{meetingId}/participants` | 신청자 조회 | 1차 |
| 참가 승인 | `PATCH` | `/api/participants/{participantId}/approve` | 참가 승인 | 1차 |
| 참가 거절 | `PATCH` | `/api/participants/{participantId}/reject` | 참가 거절 | 1차 |
| 댓글 목록 조회 | `GET` | `/api/meetings/{meetingId}/comments` | 모임 상세 댓글/문의 조회 | 1차 또는 2차 |
| 댓글 작성 | `POST` | `/api/meetings/{meetingId}/comments` | 모임 댓글/문의 작성 | 1차 또는 2차 |
| 신고 등록 | `POST` | `/api/reports` | 모임/댓글/사용자 신고 접수 | 2차 |
| 신고 처리 | `PATCH` | `/api/admin/reports/{reportId}` | 신고 상태 변경 | 2차 |
| 관리자 회원 조회 | `GET` | `/api/admin/users` | 회원 관리 | 2차 |
| 관리자 모임 조회 | `GET` | `/api/admin/meetings` | 모임 관리 | 2차 |
| 후기 작성 | `POST` | `/api/reviews` | 별점/내용/이미지 후기 작성 | 후순위 |
| 후기 목록 | `GET` | `/api/reviews` | 후기 조회 | 후순위 |

## 🎨 디자인 시스템

| 요소 | 스타일 |
| --- | --- |
| 브랜드 컬러 | Blue `#2563eb` |
| 배경 | Neutral off-white / warm gray `#f7f7f8` |
| 카드 | White surface `rgba(255,255,255,.96)` |
| 버튼 | 주요 액션 버튼만 파란색 사용 |
| 아이콘 | 장식 아이콘은 연한 회색/오프화이트 사용 |
| 폰트 | Pretendard |
| 반응형 | 모바일 햄버거 메뉴, 카드형 레이아웃, 하단 CTA, 가로 스크롤 최소화 |

## ▶️ 실행 방법

### 1. MySQL DB 생성

```sql
CREATE DATABASE wemove DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### 2. 백엔드 실행

```bash
cd backend
mvn spring-boot:run
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본 개발 서버 주소:

```text
http://localhost:5173
```

### 4. 프론트엔드 빌드

```bash
cd frontend
npm run build
```

## 📚 참고 문서

- `docs/setup-guide.md`
- `docs/api-spec.md`
- `docs/erd.md`
- `docs/page-structure.md`
- `docs/tech-stack.md`
