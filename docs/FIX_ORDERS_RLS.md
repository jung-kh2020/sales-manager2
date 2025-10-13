# Orders 테이블 RLS 정책 수정 가이드

## 문제 상황

### 에러 메시지
```
주문 생성 중 오류가 발생했습니다: new row violates row-level security policy for table "orders"
```

### 발생 원인
1. 판매자가 결제 링크를 공유 (예: `/product/1?ref=E001`)
2. 고객이 링크를 열고 주문 정보를 입력
3. "카드결제" 버튼 클릭 시 주문 생성 시도
4. 고객은 **로그인하지 않은 익명 사용자**
5. Supabase RLS 정책이 익명 사용자의 INSERT를 차단
6. 주문 생성 실패

### 왜 이런 문제가 발생하나요?

Supabase는 기본적으로 Row Level Security (RLS)를 사용합니다.
- RLS는 테이블에 대한 접근을 세밀하게 제어하는 보안 기능
- 기본적으로 **인증된 사용자만** 데이터 조작 가능
- 공개 사용자(anon)는 명시적으로 정책을 추가해야 함

### 우리 시스템의 요구사항
- 고객은 **회원가입 없이** 결제 링크를 통해 주문 가능해야 함
- 따라서 익명 사용자도 `orders` 테이블에 **INSERT** 할 수 있어야 함
- 하지만 보안을 위해 SELECT, UPDATE, DELETE는 관리자만 가능

## 해결 방법

### 1. Supabase SQL Editor 접속
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택: `epefbiexslkrvartpupx`
3. 왼쪽 메뉴 > **SQL Editor** 클릭

### 2. RLS 정책 추가

다음 SQL을 실행하세요:

```sql
-- 익명 사용자를 위한 INSERT 정책 추가
CREATE POLICY "Allow public to insert orders"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

또는 프로젝트 파일 사용:
- 파일 위치: [database/migrations/fix_orders_rls_for_public_insert.sql](../database/migrations/fix_orders_rls_for_public_insert.sql)
- 파일 내용 전체를 SQL Editor에 복사하여 실행

### 3. 정책 확인

다음 SQL로 정책이 제대로 추가되었는지 확인:

```sql
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders';
```

**기대 결과**: 다음과 같은 정책이 표시되어야 함
- `Allow public to insert orders` - INSERT 정책 (anon, authenticated)
- 기타 관리자용 SELECT/UPDATE/DELETE 정책

### 4. 테스트

1. **로그아웃 상태에서 테스트**
   - 브라우저 시크릿 모드 열기
   - 결제 링크 접속: `http://localhost:3000/product/1?ref=E001`
   - 고객 정보 입력 및 이미지 업로드
   - "카드결제" 버튼 클릭

2. **기대 결과**
   - ✅ 주문이 성공적으로 생성됨
   - ✅ 결제 페이지로 이동
   - ✅ 에러 없이 결제 진행

## 보안 고려사항

### ✅ 안전한 설계
```sql
-- INSERT: 누구나 가능 (주문 생성)
TO anon, authenticated

-- SELECT/UPDATE/DELETE: 관리자만 가능 (기존 정책 유지)
-- 일반 고객은 자신의 주문을 조회/수정/삭제 불가
```

### 추가 보안 강화 (선택사항)

더 세밀한 제어가 필요하다면:

```sql
-- 옵션 1: 특정 필드만 INSERT 허용
CREATE POLICY "Allow public to insert orders with restrictions"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  product_id IS NOT NULL AND
  customer_name IS NOT NULL AND
  customer_email IS NOT NULL AND
  customer_phone IS NOT NULL AND
  status = 'pending_payment'
);

-- 옵션 2: 고객은 자신의 이메일로 생성한 주문만 조회 가능
CREATE POLICY "Allow users to view their own orders by email"
ON orders
FOR SELECT
TO anon, authenticated
USING (
  customer_email = current_setting('request.jwt.claims', true)::json->>'email'
  OR
  auth.uid() IN (SELECT id FROM auth.users WHERE role = 'admin')
);
```

## 트러블슈팅

### 여전히 같은 에러가 발생하는 경우

1. **정책이 제대로 추가되었는지 확인**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow public to insert orders';
   ```

2. **RLS가 활성화되어 있는지 확인**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'orders';
   ```
   - `rowsecurity`가 `true`여야 함

3. **충돌하는 정책이 있는지 확인**
   ```sql
   SELECT policyname, cmd, permissive
   FROM pg_policies
   WHERE tablename = 'orders' AND cmd = 'INSERT';
   ```
   - RESTRICTIVE 정책이 있으면 PERMISSIVE 정책과 함께 평가됨

4. **브라우저 캐시 삭제**
   - 개발자 도구 > Application > Clear storage
   - 페이지 새로고침

### 다른 사용자가 여전히 실패하는 경우

- Supabase 프로젝트의 **API Settings** 확인
- **Anonymous key (anon)** 가 활성화되어 있는지 확인
- `.env` 파일의 `VITE_SUPABASE_ANON_KEY`가 정확한지 확인

## 참고 자료

- [Supabase RLS 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS 정책](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [프로젝트 데이터베이스 스키마](../database/schema/)
