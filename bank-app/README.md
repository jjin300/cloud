# 모의은행 (Mock Bank App)

실제 은행과 연결되지 않은, 가상 금융거래 전용 모의 은행 웹 애플리케이션입니다.

## 기능

- 회원가입 / 로그인 (JWT 인증)
- 가입 시 가상 입출금 계좌 자동 생성, 추가 계좌 개설 가능
- 입금 / 출금 / 계좌간 이체 (수취 계좌 확인 후 이체)
- 거래 내역 조회 (유형/검색어/기간 필터, 페이지네이션)

## 기술 스택

- Backend: Node.js, Express, JWT, bcrypt — JSON 파일 기반 저장소 (`backend/data.json`, 자동 생성)
- Frontend: React (Vite), React Router, Axios

## 실행 방법

### 1. 백엔드

```bash
cd backend
cp .env.example .env   # 필요시 값 수정
npm install
npm run dev             # http://localhost:4000
```

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

브라우저에서 http://localhost:5173 접속 후 회원가입하면 바로 사용할 수 있습니다.

## 참고

- 모든 데이터는 가상이며 실제 금융기관과 연동되지 않습니다.
- 데이터는 `backend/data.json` 파일에 저장됩니다(데모/개발용 저장소). 삭제하면 모든 계정/거래 내역이 초기화됩니다.
