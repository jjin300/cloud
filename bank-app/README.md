# MuriBank (모의은행 앱)

실제 은행과 연결되지 않은, 가상 금융거래 전용 모의 은행 웹 애플리케이션입니다.

## 기능

- 회원가입 / 로그인 (JWT 인증)
- 가입 시 가상 정기예금 계좌 자동 생성, 추가 계좌 개설 가능
- 입금 / 출금 / 계좌간 이체 (수취 계좌 확인 후 이체)
- 거래 내역 조회 (유형/검색어/기간 필터, 페이지네이션)

## 기술 스택

- Backend: Node.js, Express, JWT, bcrypt, PostgreSQL (pg)
- Frontend: React (Vite), React Router, Axios

## 실행 방법

### 1. 데이터베이스 준비

PostgreSQL 접속 정보(`DATABASE_URL`)가 필요합니다. 로컬 Postgres를 쓰거나, [Neon](https://neon.tech) 같은 무료 클라우드 Postgres를 사용하면 됩니다. 테이블은 서버가 처음 시작할 때 자동으로 생성됩니다(별도 마이그레이션 불필요).

### 2. 백엔드

```bash
cd backend
cp .env.example .env   # DATABASE_URL, JWT_SECRET 값 입력
npm install
npm run dev             # http://localhost:4000
```

### 3. 프론트엔드

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

브라우저에서 http://localhost:5173 접속 후 회원가입하면 바로 사용할 수 있습니다.

## 참고

- 모든 데이터는 가상이며 실제 금융기관과 연동되지 않습니다.
- 계정/계좌/거래 내역은 PostgreSQL 데이터베이스에 영구 저장됩니다. (배포 환경에서 서버가 재시작되어도 데이터가 유지됩니다.)
