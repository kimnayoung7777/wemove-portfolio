# WeMove Vercel + Render 배포

## 1. 프론트 Vercel

- Import Project로 `frontend` 연결
- Root Directory: `frontend`
- Build Command: `npm run build:aws`
- Output Directory: `dist`
- Environment Variables
- `VITE_API_BASE_URL=https://your-render-service.onrender.com/api`
- `VITE_WS_BASE_URL=wss://your-render-service.onrender.com/ws`

`vercel.json`이 SPA 라우팅을 처리하므로 새로고침 404는 따로 잡지 않아도 됩니다.

## 2. 백엔드 Render

- New Web Service
- Root Directory: `backend`
- Environment: `Java`
- Build Command: `mvn -DskipTests package`
- Start Command: `java -Dserver.port=$PORT -jar target/wemove-backend-0.0.1-SNAPSHOT.jar`

필수 환경변수

- `SPRING_DATASOURCE_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT=6379`
- `REDIS_USERNAME=default`
- `REDIS_PASSWORD`
- `WEMOVE_JWT_SECRET`
- `WEMOVE_SECURE_COOKIE=true`
- `WEMOVE_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://your-custom-domain.com`
- `WEMOVE_EMAIL_VERIFICATION_BASE_URL=https://your-render-service.onrender.com/api/auth/email/verify`
- `WEMOVE_EMAIL_FROM`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT=587`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 3. 배포 순서

1. Render 백엔드 먼저 배포
2. Render 기본 도메인 확인
3. Vercel 환경변수에 Render API/WS 주소 입력
4. Vercel 프론트 배포
5. 프론트 도메인이 정해지면 Render의 `WEMOVE_ALLOWED_ORIGINS`를 최종 수정

## 4. 확인할 주소

- 백엔드 헬스체크: `https://your-render-service.onrender.com/api/health`
- 프론트: `https://your-project.vercel.app`
