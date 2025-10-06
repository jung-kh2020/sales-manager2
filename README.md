# 영업사원 관리 시스템

리뷰 작성 서비스 영업사원들의 판매 실적과 수수료를 체계적으로 관리하는 웹 기반 프로그램입니다.

## 주요 기능

- **영업사원 관리**: 사원 등록, 수정, 삭제 및 상태 관리
- **판매 실적 관리**: 판매 내역 입력, 조회 및 필터링
- **수수료 계산**: 자동 수수료 계산 및 지급 관리
- **통계 및 리포트**: 월별/연도별 통계, 차트 및 그래프

## 기술 스택

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Supabase
- **Charts**: Chart.js, React-Chartjs-2
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 Supabase 정보를 입력합니다.

```bash
cp .env.example .env
```

`.env` 파일 내용:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase_schema.sql` 파일의 내용을 실행
3. 프로젝트 URL과 Anon Key를 `.env` 파일에 입력

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 5. 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 수수료 계산 규칙

- **기본 수수료**: 월 총 판매금액의 25%
- **추가 인센티브**: 월 판매금액 5,000,000원 초과 시 총 판매금액의 5% 추가 지급
- **실효 수수료율**: 목표 달성 시 30% (25% + 5%)

## 상품 정보

| 상품명 | 기간 | 리뷰 수 | 판매가 | 원가 |
|--------|------|---------|---------|------|
| 베이직 플랜 | 1개월 | 60개 | 210,000원 | 90,000원 |
| 스탠다드 플랜 | 2개월 | 150개 | 480,000원 | 225,000원 |
| 프리미엄 플랜 | 3개월 | 300개 | 900,000원 | 450,000원 |
| 익스프레스 플랜 | 2주 | 50개 | 200,000원 | 75,000원 |
| 엔터프라이즈 플랜 | 6개월 | 500개 | 1,400,000원 | 750,000원 |

## 프로젝트 구조

```
sales-manager/
├── src/
│   ├── components/        # 재사용 가능한 컴포넌트
│   │   └── Layout.jsx    # 메인 레이아웃 (헤더, 사이드바)
│   ├── pages/            # 페이지 컴포넌트
│   │   ├── Dashboard.jsx # 대시보드
│   │   ├── Employees.jsx # 사원 관리
│   │   ├── Sales.jsx     # 판매 관리
│   │   ├── Commissions.jsx # 수수료 관리
│   │   └── Statistics.jsx # 통계
│   ├── services/         # API 및 서비스
│   │   └── supabase.js   # Supabase 클라이언트
│   ├── App.jsx          # 메인 앱 컴포넌트
│   ├── main.jsx         # 엔트리 포인트
│   └── index.css        # 글로벌 스타일
├── supabase_schema.sql  # 데이터베이스 스키마
├── .env.example         # 환경 변수 예시
└── README.md           # 프로젝트 문서
```

## 사용 방법

### 1. 사원 등록
1. "사원 관리" 메뉴 클릭
2. "신규 사원 등록" 버튼 클릭
3. 사원 정보 입력 후 저장

### 2. 판매 입력
1. "판매 관리" 메뉴 클릭
2. "신규 판매 등록" 버튼 클릭
3. 사원, 상품, 날짜, 수량 입력 후 저장

### 3. 수수료 확인
1. "수수료" 메뉴 클릭
2. 조회할 월 선택
3. 사원별 수수료 자동 계산 확인
4. 지급 완료 체크박스로 지급 관리

### 4. 통계 확인
1. "통계" 메뉴 클릭
2. 조회 기간 선택 (6개월/12개월)
3. 월별 매출 추이, 상품별/사원별 통계 확인

## 라이선스

ISC
