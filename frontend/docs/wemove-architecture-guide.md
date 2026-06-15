# WeMove 구조와 동작 원리 정리

이 문서는 WeMove 프로젝트를 처음 보는 사람도 쉽게 이해할 수 있도록 정리한 설명서다.
노션에 그대로 붙여 넣어서 발표 자료나 개인 정리용으로 사용할 수 있다.

---

## 1. 프로젝트 한 줄 설명

WeMove는 지역 기반 운동 모임 서비스다.

사용자는:

- 회원가입을 하고
- 로그인한 뒤
- 모임을 찾거나
- 새 모임을 만들고
- 참여하거나
- 관리자가 회원/모임/종목 등을 관리할 수 있다.

---

## 2. 전체 구조

프로젝트는 크게 2개로 나뉜다.

1. 프론트엔드
- React
- 사용자가 보는 화면
- 로그인 화면, 모임 목록, 마이페이지, 관리자 페이지 등

2. 백엔드
- Spring Boot
- API 제공
- DB 조회/저장
- Redis 인증 처리
- Cloudinary 이미지 업로드

3. 데이터 저장소
- MySQL: 회원, 모임, 종목, 지역, 댓글, 신고 같은 실제 데이터 저장
- Redis: 로그인 유지용 refresh token, 중복 로그인 세션 정보 저장
- Cloudinary: 모임 썸네일 이미지 저장

---

## 3. 프론트엔드 구조

프론트엔드는 보통 아래처럼 나뉜다.

- `pages`
  - 각 화면 단위
  - 예: 로그인 페이지, 모임 생성 페이지, 관리자 페이지

- `components`
  - 여러 화면에서 재사용하는 UI 조각
  - 예: 헤더, 모달, 페이지네이션

- `api`
  - 백엔드 API 호출 함수 모음
  - 예: 로그인 요청, 모임 조회 요청

- `contexts`
  - 전역 상태 관리
  - 현재는 인증 상태 관리에 사용

- `styles`
  - CSS Module 파일

- `utils`
  - 토큰 파싱, 저장소 처리 같은 작은 유틸 함수

### 대표 파일 예시

- 로그인 페이지: [LoginPage.jsx](/C:/Users/user1/Desktop/WeMove/frontend/src/pages/LoginPage.jsx)
- 인증 상태 관리: [AuthContext.jsx](/C:/Users/user1/Desktop/WeMove/frontend/src/contexts/AuthContext.jsx)
- 공통 axios 설정: [axiosInstance.js](/C:/Users/user1/Desktop/WeMove/frontend/src/api/axiosInstance.js)
- 관리자 페이지: [AdminPage.jsx](/C:/Users/user1/Desktop/WeMove/frontend/src/pages/AdminPage.jsx)

---

## 4. 백엔드 구조

백엔드는 보통 아래 흐름으로 움직인다.

1. `Controller`
- 프론트 요청을 받는다.
- URL과 HTTP method를 연결한다.

2. `Service`
- 실제 비즈니스 로직을 처리한다.
- 검증, Redis 처리, Cloudinary 업로드, 여러 DAO 호출 등을 담당한다.

3. `DAO`
- DB와 직접 연결되는 계층이다.
- 현재 프로젝트는 `DAO interface` 방식이 아니라 `DAO class + SqlSession` 방식이다.

4. `mapper.xml`
- 실제 SQL이 들어 있는 파일이다.

### 중요한 점

이 프로젝트는 학원에서 자주 배우는

- `Controller`
- `Service interface`
- `ServiceImpl`
- `DAO interface`
- `DAOImpl`
- `Mapper XML`

구조와 완전히 같지는 않다.

현재 실제 구조는 아래에 더 가깝다.

- `Controller`
- `Service interface`
- `ServiceImpl`
- `DAO class`
- `MyBatis mapper xml`

즉 `DAO`가 인터페이스가 아니라 클래스이고,
그 안에서 `SqlSession`으로 mapper xml을 직접 호출한다.

---

## 5. MyBatis는 어떻게 연결되나

현재 프로젝트는 MyBatis를 아래 방식으로 사용한다.

### 예시

DAO:

```java
return sqlSession.selectList("sport.selectSports");
```

mapper xml:

```xml
<mapper namespace="sport">
  <select id="selectSports">
    SELECT * FROM sports
  </select>
</mapper>
```

이 둘이 연결되는 방식은:

- namespace = `sport`
- id = `selectSports`
- 합치면 `sport.selectSports`

즉 DAO에서 문자열로 XML 쿼리를 호출하는 구조다.

### 장점

- 단순하다
- 빠르게 개발하기 쉽다

### 단점

- 문자열 오타를 컴파일 시점에 못 잡는다
- 구조가 학원 정석 패턴과 다르게 보여서 헷갈릴 수 있다
- 프로젝트가 커질수록 유지보수가 불편해질 수 있다

---

## 6. 로그인 기능 동작 순서

이 프로젝트의 로그인은 JWT + Redis 기반이다.

### 로그인할 때

1. 사용자가 로그인 화면에서 아이디/비밀번호 입력
2. 프론트가 `/api/auth/login` 호출
3. 백엔드가 DB에서 회원 조회
4. 비밀번호가 맞으면
   - `accessToken` 생성
   - `refreshToken` 생성
5. Redis에 저장
   - `auth:refresh:{userId}` = refreshToken
   - `auth:session:{userId}` = sessionId
6. 응답 처리
   - `refreshToken`은 HttpOnly Cookie로 저장
   - `accessToken`은 응답 body로 반환
7. 프론트는 `accessToken`만 메모리에 저장
8. 프론트는 토큰 안에서 `userId`, `nickname`, `role` 등을 읽어 로그인 상태를 만듦

### 왜 localStorage를 안 쓰나

이전보다 보안적으로 더 안전하게 하려고:

- `accessToken`은 메모리에만 둔다
- `refreshToken`은 HttpOnly Cookie에 둔다
- 그래서 브라우저 저장소에서 토큰이 바로 보이지 않는다

---

## 7. 새로고침하면 왜 로그인 유지가 되나

### 핵심

새로고침하면 메모리의 `accessToken`은 사라진다.
그런데 쿠키에 `refreshToken`이 남아 있으므로 새 `accessToken`을 다시 발급받을 수 있다.

### 순서

1. 페이지 새로고침
2. 메모리에 있던 `accessToken`은 사라짐
3. 앱 시작 시 `AuthContext`가 `/api/auth/refresh` 호출
4. 브라우저는 쿠키의 `refreshToken`을 자동 전송
5. 백엔드가 Redis의 refresh token과 비교
6. 맞으면 새 `accessToken` 발급
7. 프론트가 새 토큰을 메모리에 저장
8. 사용자 정보가 다시 복원됨

### 왜 잠깐 로그아웃처럼 보였나

새로고침 직후에는 `refresh`가 아직 끝나지 않았는데
화면이 먼저 렌더링되면 비로그인 UI가 잠깐 보일 수 있다.

그래서 지금은 `loading` 동안 인증 버튼을 안 보여주게 수정해둔 상태다.

---

## 8. 중복 로그인은 어떻게 동작하나

중복 로그인은 Redis의 두 키를 사용한다.

### Redis 키

- `auth:refresh:{userId}`
  - 로그인 유지용 refresh token

- `auth:session:{userId}`
  - 현재 로그인 세션 번호

### 동작 순서

1. A 브라우저에서 로그인
2. Redis에 `auth:session:3 = 세션A` 저장
3. B 브라우저에서 같은 계정으로 로그인 시도
4. 기존 세션이 있으면 `이미 로그인 중인 사용자가 있습니다. 로그인하시겠습니까?` 응답
5. 사용자가 `네`를 누르면
   - 새 세션 번호 생성
   - Redis의 `auth:session:3` 값을 `세션B`로 교체
6. A 브라우저는 주기적으로 현재 세션 상태를 확인
7. 자기 토큰의 세션 번호가 Redis와 다르면
   - `다른 곳에서 로그인 요청이 있어 로그아웃되었습니다.`
   - 모달을 띄우고 로그아웃 처리

---

## 9. 관리자 페이지 동작 원리

관리자 페이지는 주로 아래 기능을 한다.

- 회원 목록 조회
- 모임 목록 조회
- 운동 종목 조회/추가/수정/삭제
- 신고 내역 조회
- 요약 통계 조회

### 지역 필터

지역은 `시도 > 시군구 > 읍면동` 구조를 사용한다.

현재 관리자 페이지는:

- `지역 조회` 버튼 클릭
- 3열 모달에서
  - 시도 선택
  - 시군구 선택
  - 읍면동 선택
- 적용하면 회원/모임 목록 필터링

### 운동 종목 관리

운동 종목 관리 모달에서는:

- 종목명 입력
- 카테고리는 기존 카테고리 중에서 선택
- 이름이 중복되면 저장되지 않음

중복 체크는

- 프론트에서 1차 검사
- 백엔드에서 최종 검사

둘 다 한다.

---

## 10. 로그인 페이지 통계는 어떻게 가져오나

로그인 페이지 상단 카드:

- 회원 수
- 생성 모임
- 누적 참여

이 값들은 이제 하드코딩이 아니라 DB에서 받아온다.

### API

- `/api/stats/login-page`

### 내려주는 값

- `totalMembers`
- `totalMeetings`
- `completedMeetings`

### SQL 기준

- 회원 수 = `users` 전체 수
- 생성 모임 = 삭제되지 않은 `meetings` 전체 수
- 누적 참여 = 상태가 `COMPLETED`인 모임 수

---

## 11. 모임 썸네일 업로드는 어떻게 동작하나

현재는 모임당 썸네일 1장만 사용한다.

### 흐름

1. 프론트에서 파일 1장 선택
2. `FormData`로 전송
   - `request` = JSON
   - `image` = 파일 1개
3. 백엔드가 `multipart/form-data`로 받음
4. Cloudinary에 업로드
5. 업로드된 `secure_url`을 `meetings.thumbnailImage`에 저장
6. 목록/상세 화면에서 그 URL을 이미지로 사용

### 저장 위치

- Cloudinary 폴더: `image/meetings`

---

## 12. 대표적인 요청 흐름 예시

### 예시 1. 로그인

프론트 `LoginPage`
-> `authApi.login()`
-> `AuthController.login()`
-> `AuthServiceImpl.login()`
-> `AuthDao`
-> DB 조회
-> JWT 생성
-> Redis 저장
-> 응답
-> 프론트 메모리 저장

### 예시 2. 모임 생성

프론트 `MeetingCreatePage`
-> `meetingApi.createMeeting()`
-> `MeetingController.create()`
-> `MeetingServiceImpl.createMeeting()`
-> Cloudinary 업로드
-> `MeetingDao.insertMeeting()`
-> `meeting-mapper.xml`
-> DB 저장

### 예시 3. 관리자 회원 목록

프론트 `AdminPage`
-> `adminApi.getAdminMembers()`
-> `AdminController.members()`
-> `AdminServiceImpl.getMembers()`
-> `AdminDao.selectMembers()`
-> `admin-mapper.xml`
-> DB 조회

---

## 13. 지금 구조의 장점과 아쉬운 점

### 장점

- 빠르게 개발하기 좋다
- 계층이 완전히 없는 것은 아니다
- SQL이 xml에 따로 있어 쿼리 보기 편하다

### 아쉬운 점

- DAO가 인터페이스가 아니라서 학원에서 배운 전형 구조와 다르다
- 문자열 기반 MyBatis 호출이라 refactoring이 약하다
- 서비스는 interface + impl인데 DAO는 class라 패턴이 섞여 있다
- 파일 인코딩이 깨진 부분이 있어 유지보수에 불편하다

---

## 14. 발표할 때 설명하면 좋은 문장

### 짧은 버전

WeMove는 React 프론트엔드와 Spring Boot 백엔드로 구성된 지역 기반 운동 모임 서비스입니다.
백엔드는 MyBatis XML Mapper를 사용해 DB와 통신하고, Redis로 로그인 유지와 중복 로그인 처리를 수행합니다.
이미지 업로드는 Cloudinary를 사용해 모임 썸네일을 관리합니다.

### 구조 설명 버전

프론트는 페이지, 컴포넌트, API 모듈, 인증 Context로 구성되어 있고,
백엔드는 Controller, Service, DAO, MyBatis Mapper XML 계층으로 구성됩니다.
현재 DAO는 인터페이스 방식이 아니라 SqlSession으로 XML을 직접 호출하는 클래스 방식으로 구현되어 있습니다.

---

## 15. 한눈에 보는 핵심 요약

- 프론트: React
- 백엔드: Spring Boot
- DB: MySQL
- 인증 저장: Redis + Cookie + 메모리 토큰
- 이미지 저장: Cloudinary
- SQL 실행: MyBatis XML Mapper
- 관리자 기능: 회원/모임/종목/신고 관리
- 로그인 유지: refresh token 기반
- 중복 로그인: Redis session key 비교

---

## 16. 내가 이 프로젝트를 이해할 때 핵심 포인트

이 프로젝트를 이해할 때 가장 중요한 것은 아래 4가지다.

1. 프론트는 API를 호출해서 화면을 그린다
2. 백엔드는 Controller -> Service -> DAO -> Mapper XML 순서로 동작한다
3. 로그인은 access token + refresh token + Redis로 유지된다
4. 지금 구조는 학원 정석 구조와 100% 같지 않지만, 동작 원리는 충분히 설명 가능하다

---

## 17. 학원에서 배운 구조와 현재 백엔드 구조 비교

이 섹션은 학원에서 배운 구조와 현재 프로젝트 구조가 왜 다르게 보이는지 설명하기 위한 정리다.

학원에서 배운 구조는 보통 아래와 같다.

- `Controller`
- `Service`
- `Dao interface`
- `MyBatis Mapper XML`

이 구조는 MyBatis가 `Dao interface`의 구현체를 자동으로 만들어주는 방식이다.

현재 프로젝트는 아래와 같다.

- `Controller`
- `Service interface`
- `ServiceImpl`
- `Dao class`
- `SqlSession`
- `Mapper XML`

즉 가장 큰 차이는:

- 학원 구조는 `Dao = interface`
- 현재 구조는 `Dao = class`

이다.

---

## 18. 학원에서 배운 구조는 어떻게 동작하나

### 예시

Dao interface:

```java
@Mapper
public interface SportDao {
    List<Sport> selectSports();
}
```

Mapper XML:

```xml
<mapper namespace="kr.co.iei.sport.model.dao.SportDao">
    <select id="selectSports" resultType="Sport">
        SELECT * FROM sports
    </select>
</mapper>
```

Service:

```java
@Service
public class SportService {
    private final SportDao sportDao;

    public List<Sport> getSports() {
        return sportDao.selectSports();
    }
}
```

### 동작 원리

1. Spring이 `SportDao` 인터페이스를 스캔한다
2. MyBatis가 이 인터페이스용 프록시 객체를 자동 생성한다
3. 서비스가 `sportDao.selectSports()`를 호출한다
4. MyBatis는
   - `namespace = SportDao의 전체 경로`
   - `id = selectSports`
   를 기준으로 XML 쿼리를 찾는다
5. SQL 실행 후 결과를 객체로 변환해서 리턴한다

### 특징

- 개발자가 `DaoImpl`을 직접 만들지 않아도 된다
- 메서드 이름과 XML id가 자연스럽게 연결된다
- 구조가 깔끔해서 학원 프로젝트 발표용으로 설명하기 쉽다

---

## 19. 현재 프로젝트 구조는 어떻게 동작하나

현재 프로젝트는 `Dao interface` 대신 `Dao class`를 직접 만든다.

### 예시

DAO class:

```java
@Repository
@RequiredArgsConstructor
public class SportDao {
  private final SqlSession sqlSession;

  public List<Sport> selectSports() {
    return sqlSession.selectList("sport.selectSports");
  }
}
```

Mapper XML:

```xml
<mapper namespace="sport">
    <select id="selectSports" resultType="kr.co.iei.sport.model.vo.Sport">
        SELECT *
        FROM sports
    </select>
</mapper>
```

Service:

```java
@Service
@RequiredArgsConstructor
public class SportServiceImpl implements SportService {
  private final SportDao sportDao;

  public List<Sport> getSports() {
    return sportDao.selectSports();
  }
}
```

### 동작 원리

1. 서비스가 `sportDao.selectSports()`를 호출한다
2. `SportDao` 클래스 안에서 `sqlSession.selectList("sport.selectSports")`를 실행한다
3. MyBatis는 문자열 `"sport.selectSports"`를 보고
   - `namespace = sport`
   - `id = selectSports`
   인 XML 쿼리를 찾는다
4. SQL을 실행한다
5. 결과를 `Sport` 객체 리스트로 만들어 DAO에 반환한다
6. DAO가 다시 서비스를 거쳐 컨트롤러에 넘긴다

즉 이 구조에서는

- MyBatis가 `Dao` 구현체를 자동으로 만드는 것이 아니라
- `Dao class`가 직접 `SqlSession`을 사용해 mapper xml을 호출한다

---

## 20. sqlSession은 무엇인가

`SqlSession`은 MyBatis가 DB 작업을 수행할 때 사용하는 핵심 객체다.

쉽게 말하면:

- SQL 실행 창구
- Mapper XML 호출 창구
- DB와 MyBatis 사이의 작업 통로

라고 생각하면 된다.

### 자주 쓰는 메서드

- `selectOne()`
- `selectList()`
- `insert()`
- `update()`
- `delete()`

예시:

```java
sqlSession.selectOne("member.selectByUserId", userId);
sqlSession.insert("meeting.insertMeeting", meeting);
sqlSession.update("admin.updateMemberStatus", params);
```

이 코드는 뜻이 각각:

- `member.selectByUserId` 쿼리 1건 조회
- `meeting.insertMeeting` 쿼리 insert 실행
- `admin.updateMemberStatus` 쿼리 update 실행

이다.

---

## 21. sqlSession은 왜 쓰는가

현재 프로젝트에서 `sqlSession`을 쓰는 이유는,
MyBatis의 Mapper interface 자동 연결 방식을 사용하지 않고
직접 XML 쿼리를 호출하는 구조를 선택했기 때문이다.

즉 현재 구조에서는 SQL을 실행하려면 누군가가 직접 이렇게 불러야 한다.

```java
sqlSession.selectList("sport.selectSports");
```

그래서 `Dao class`가 `sqlSession`을 들고 있는 것이다.

### 현재 구조에서 sqlSession의 역할

- XML 쿼리를 찾아 실행
- 파라미터 전달
- 결과를 객체로 매핑
- DB 작업을 실제 수행

### 왜 interface 방식에서는 sqlSession이 잘 안 보이나

interface 방식도 내부적으로는 MyBatis가 비슷한 작업을 한다.
다만 개발자가 직접 `sqlSession`을 호출하지 않고,
MyBatis가 대신 처리해주는 것이다.

즉:

- 학원 구조: `sqlSession`이 내부에 숨어 있음
- 현재 구조: `sqlSession`을 개발자가 직접 호출함

---

## 22. sqlSession 방식의 장점

### 1. 구조가 단순해 보일 수 있다

작은 프로젝트에서는

- Mapper interface
- Dao interface
- Dao 구현체

를 나누지 않고,
그냥 `Dao class` 하나로 처리할 수 있어서 파일 수가 적어진다.

### 2. 쿼리 호출 흐름을 직접 통제할 수 있다

DAO 안에서

- `Map` 파라미터 조립
- 쿼리 분기
- 여러 조건 구성

을 직접 처리하기 쉽다.

### 3. 오래된 MyBatis 예제와 비슷하다

예전 MyBatis 예제나 학원 외부 자료 중에는
`SqlSession` 직접 호출 방식이 많아서 그런 스타일을 따라간 경우가 있다.

---

## 23. sqlSession 방식의 단점

### 1. 문자열 오타를 컴파일 시점에 못 잡는다

예:

```java
sqlSession.selectList("sport.selectSports");
```

여기서 `"sport.selectSports"`를 잘못 써도
컴파일 에러가 안 난다.
대신 실행했을 때 터진다.

### 2. 리팩토링이 불편하다

XML id를 바꾸거나 namespace를 바꾸면
문자열도 직접 찾아서 바꿔야 한다.

IDE가 메서드 이름처럼 안전하게 추적해주지 못한다.

### 3. DAO가 애매한 중계 클래스가 되기 쉽다

DAO가 하는 일이

- `sqlSession.selectOne(...)`
- `sqlSession.insert(...)`
- `Map` 포장

정도만 반복되면, 계층은 하나 더 늘었는데 의미는 약해질 수 있다.

### 4. 학원 정석 구조와 달라서 설명이 헷갈린다

특히 발표나 코드 리뷰에서

- “DAO 인터페이스는 어디 있지?”
- “왜 Mapper interface가 없지?”
- “왜 sqlSession을 직접 쓰지?”

라는 질문이 나오기 쉽다.

---

## 24. 학원 구조와 현재 구조의 핵심 차이 한눈에 보기

### 학원에서 배운 구조

```text
Controller
  -> Service
    -> Dao interface
      -> MyBatis가 구현체 자동 생성
        -> Mapper XML 실행
```

### 현재 프로젝트 구조

```text
Controller
  -> Service
    -> Dao class
      -> sqlSession 직접 호출
        -> Mapper XML 실행
```

### 핵심 차이

- 학원 구조는 `MyBatis가 Dao를 대신 구현`
- 현재 구조는 `개발자가 Dao를 직접 만들고 sqlSession으로 XML 호출`

---

## 25. 그럼 현재 프로젝트는 틀린 구조인가

틀린 구조는 아니다.
실제로 동작도 잘 하고, MyBatis도 맞게 사용하고 있다.

다만 아래 특징이 있다.

- 학원에서 배우는 전형적인 구조와 다르다
- 유지보수 관점에서는 조금 불편할 수 있다
- 빠르게 붙인 프로젝트에서 자주 보이는 형태다

즉:

- “잘못된 구조”라기보다
- “정석 교육용 구조와 다른 실전형/간소화 구조”

라고 보는 것이 더 정확하다.

---

## 26. 왜 지금 프로젝트는 이런 방식일 가능성이 큰가

정확한 최초 작성자 의도는 알 수 없지만, 코드 형태를 보면 보통 아래 이유 중 하나일 가능성이 높다.

### 1. 빠르게 기능을 붙이기 위해

DAO 인터페이스와 Mapper interface를 다 만들지 않고
DAO 클래스 하나에서 바로 `sqlSession`을 호출하면 개발 속도는 빨라질 수 있다.

### 2. 기존 예제 스타일을 따라갔기 때문

오래된 MyBatis 예제나 수업 외 참고 코드 중에는
이런 `SqlSession 직접 호출` 구조가 많다.

### 3. 프로젝트 크기가 처음엔 작다고 생각했기 때문

초기에는 단순해 보여도,
도메인이 늘어나면 구조 통일이 중요해지는데
그 전 단계에서 시작된 코드일 수 있다.

---

## 27. 발표할 때 이렇게 설명하면 된다

### 짧은 설명

학원에서 배운 구조는 DAO 인터페이스를 MyBatis가 자동 구현하는 방식이었지만,
현재 프로젝트는 DAO 클래스를 직접 만들고 그 안에서 SqlSession으로 mapper XML을 호출하는 방식입니다.

### 조금 더 자세한 설명

이 프로젝트는 MyBatis를 사용하지만, DAO 인터페이스 기반 자동 매핑 방식이 아니라
DAO 클래스 내부에서 `sqlSession.selectOne`, `selectList`, `insert`, `update` 등을 직접 호출해
mapper XML의 namespace와 id를 이용해 SQL을 실행하는 구조입니다.

### 한 줄 요약

학원 구조는 “MyBatis가 DAO를 대신 구현하는 방식”이고,
현재 구조는 “DAO가 sqlSession으로 MyBatis XML을 직접 호출하는 방식”이다.

---

## 28. 서비스는 왜 interface와 impl로 나뉘나

현재 프로젝트 백엔드를 보면 서비스 계층은 보통 아래처럼 되어 있다.

- `Service interface`
- `ServiceImpl`

예를 들면:

- [SportService.java](/C:/Users/user1/Desktop/WeMove/backend/src/main/java/kr/co/iei/sport/model/service/SportService.java)
- [SportServiceImpl.java](/C:/Users/user1/Desktop/WeMove/backend/src/main/java/kr/co/iei/sport/model/service/SportServiceImpl.java)

이 구조는 `무슨 기능을 해야 하는지`와 `그 기능을 실제로 어떻게 수행하는지`를 나누기 위한 구조다.

### 1. Service interface는 무엇인가

Service interface는 기능 명세서에 가깝다.

예:

```java
public interface SportService {
  List<Sport> getSports();
  void createSport(SportRequest req);
  void updateSport(Long sportId, SportRequest req);
  void deleteSport(Long sportId);
}
```

이 코드가 의미하는 것은:

- 종목 목록을 조회할 수 있어야 한다
- 종목을 추가할 수 있어야 한다
- 종목을 수정할 수 있어야 한다
- 종목을 삭제할 수 있어야 한다

즉 “무슨 기능이 존재하는가”만 약속하는 부분이다.

여기에는 보통 상세 구현이 없다.

### 2. ServiceImpl은 무엇인가

ServiceImpl은 위 interface가 약속한 기능을 실제로 구현하는 클래스다.

예:

```java
@Service
@RequiredArgsConstructor
public class SportServiceImpl implements SportService {
  private final SportDao sportDao;

  public List<Sport> getSports() {
    return sportDao.selectSports();
  }
}
```

이 코드는 뜻이:

- `SportService`가 약속한 `getSports()` 기능을
- `SportServiceImpl`이 실제로 수행한다

이다.

즉:

- interface = 설계도
- impl = 설계도대로 만든 실제 구현체

라고 이해하면 된다.

---

## 29. 서비스 계층의 실제 동작 순서

예를 들어 `운동 종목 목록 조회`를 기준으로 보면 아래 순서로 움직인다.

1. 프론트가 `/api/sports` 요청
2. [SportController.java](/C:/Users/user1/Desktop/WeMove/backend/src/main/java/kr/co/iei/sport/controller/SportController.java)가 요청을 받음
3. Controller가 `sportService.getSports()` 호출
4. 실제로 주입된 객체는 `SportServiceImpl`
5. `SportServiceImpl.getSports()` 안에서 `sportDao.selectSports()` 호출
6. DAO가 `sqlSession.selectList("sport.selectSports")` 실행
7. mapper xml에서 SQL 실행
8. 결과가 다시
   - DAO
   - ServiceImpl
   - Controller
   - 프론트
   순서로 되돌아감

즉 서비스 계층은 DB를 직접 만지지 않고,
중간에서 “무슨 작업을 어떤 순서로 할지”를 결정하는 계층이다.

---

## 30. 서비스 계층은 왜 interface와 impl로 나누는가

### 이유 1. 역할을 분리하기 위해

interface는 “해야 할 일”을 적고,
impl은 “어떻게 할지”를 적는다.

이렇게 나누면 코드를 읽을 때:

- 서비스가 제공하는 기능 목록
- 기능의 실제 처리 방식

을 따로 보기 쉽다.

### 이유 2. 구현 교체 가능성을 열어두기 위해

지금은 구현체가 하나뿐이지만,
나중에 다른 구현이 필요할 수도 있다.

예:

- 일반 모드 구현
- 테스트용 구현
- 외부 API 연동형 구현

이런 경우 interface를 두면 같은 기능 약속을 유지한 채 구현만 교체할 수 있다.

### 이유 3. 학원/스프링 프로젝트에서 자주 쓰는 패턴이기 때문에

Spring에서는 서비스 계층을

- `Service interface`
- `ServiceImpl`

로 나누는 패턴이 흔하다.

그래서 팀 프로젝트나 교육 과정에서는
구조를 정돈해 보이게 하기 위해 이런 형태를 자주 사용한다.

### 이유 4. 테스트나 mock에 유리하기 때문에

테스트 코드에서는 실제 구현 대신 가짜 구현을 넣고 싶을 때가 있다.

이때 interface가 있으면 교체 포인트가 더 명확해질 수 있다.

---

## 31. impl이 꼭 필요한가

꼭 필요한 것은 아니다.

즉 아래처럼 그냥 서비스 클래스를 하나만 두어도 충분히 동작한다.

```java
@Service
public class SportService {
  public List<Sport> getSports() {
    ...
  }
}
```

즉 `interface`도 필수는 아니고,
`impl`도 필수는 아니다.

현재 프로젝트에서 서비스가 `interface + impl`로 나뉜 것은
필수 문법이라서가 아니라,
구조를 분리하는 스타일을 선택했기 때문이다.

---

## 32. 그런데 왜 서비스는 나눴는데 DAO는 안 나눴나

이 부분이 현재 프로젝트가 가장 애매하게 보이는 지점이다.

현재 구조는:

- Service = `interface + impl`
- DAO = `class`

이다.

즉 서비스 계층은 “정석처럼 나눴고”,
DAO 계층은 “간단하게 클래스만 둔 상태”다.

그래서 구조가 반쯤 섞여 있는 느낌이 난다.

### 왜 어색해 보이나

보통은 아래 둘 중 하나로 많이 맞춘다.

1. 단순 구조
- Service class
- DAO class

2. 분리 구조
- Service interface + impl
- DAO interface + impl 또는 Mapper interface

그런데 현재 프로젝트는

- 서비스는 2번 스타일
- DAO는 1번 스타일

이 섞여 있기 때문에 일관성이 약해 보인다.

---

## 33. 현재 프로젝트 서비스 계층이 하는 실제 일

서비스 계층은 단순 중계가 아니라,
도메인 규칙을 실제로 처리하는 계층이다.

예를 들어:

### AuthServiceImpl

- 로그인 검증
- JWT 생성
- Redis 저장
- refresh token 검증
- 중복 로그인 세션 처리

### MeetingServiceImpl

- 모임 생성 데이터 조립
- 날짜/시간 파싱
- Cloudinary 썸네일 업로드
- DB insert 호출

### SportServiceImpl

- 종목명 중복 검증
- 수정/삭제 전 처리

즉 서비스는 단순히 DAO를 한번 거쳐가는 곳이 아니라,
실제 비즈니스 규칙이 모이는 계층이다.

---

## 34. 발표할 때 서비스 계층을 이렇게 설명하면 된다

### 짧은 설명

서비스 계층은 기능 목록을 정의한 interface와 실제 구현을 담당하는 impl로 나뉘어 있습니다.
interface는 “무슨 기능을 제공하는지”를 나타내고,
impl은 DAO, Redis, Cloudinary 등을 이용해 그 기능을 실제로 수행합니다.

### 조금 더 자세한 설명

현재 프로젝트는 서비스 계층에서 역할 분리를 위해 interface와 implementation 클래스를 나누었습니다.
Controller는 서비스 interface를 호출하고, 실제 동작은 ServiceImpl에서 수행됩니다.
ServiceImpl 내부에서는 DAO 호출, 인증 처리, 중복 검증, Redis 저장, 이미지 업로드 같은 실제 비즈니스 로직을 처리합니다.

### 핵심 요약

- Service interface = 기능 약속
- ServiceImpl = 실제 비즈니스 로직 구현
- 현재 프로젝트는 서비스는 분리 구조, DAO는 단순 클래스 구조라 계층 스타일이 섞여 있다
