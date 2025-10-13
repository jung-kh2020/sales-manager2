# Edge Function 재배포 가이드

## 개요
orderId 형식 변경 (`ORDER-{id}-{timestamp}`)에 따른 Edge Function 업데이트가 필요합니다.

## 문제점
기존 Edge Function이 orderId를 파싱하지 않고 그대로 사용하여 다음 에러 발생:
```
invalid input syntax for type bigint: "31-1760323026204"
```

## 해결 방법

### orderId 형식
- **생성 위치**: [ProductCatalog.jsx:205](../src/pages/ProductCatalog.jsx#L205)
- **형식**: `ORDER-{주문번호}-{타임스탬프}`
- **예시**: `ORDER-31-1760323026204`
- **파싱 결과**: `31` (실제 데이터베이스 ID)

### 파싱 로직
```typescript
// orderId에서 DB id 추출
const orderIdParts = orderId.replace('ORDER-', '').split('-')
const orderIdNumber = orderIdParts[0]  // "31"
```

## 배포 단계

### 방법 1: Supabase Dashboard에서 직접 배포

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard
   - 프로젝트 선택: `epefbiexslkrvartpupx`

2. **Edge Function 수정**
   - 왼쪽 메뉴 > **Edge Functions** 클릭
   - `payment-confirm` 함수 선택
   - **Edit** 버튼 클릭

3. **코드 업데이트**
   - 로컬 파일 열기: [supabase/functions/payment-confirm/index.ts](../supabase/functions/payment-confirm/index.ts)
   - 전체 코드 복사
   - Dashboard 에디터에 붙여넣기 (기존 코드 교체)

4. **저장 및 배포**
   - **Save** 버튼 클릭
   - **Deploy** 버튼 클릭
   - 배포 완료 확인

5. **환경 변수 확인** (이미 설정되어 있어야 함)
   - Project Settings > Edge Functions
   - `TOSS_SECRET_KEY`: `test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq`

### 방법 2: Supabase CLI 사용 (권장)

```bash
# 1. Supabase CLI 설치 (이미 설치되어 있다면 스킵)
npm install -g supabase

# 2. Supabase 로그인
supabase login

# 3. Edge Function 배포
supabase functions deploy payment-confirm --project-ref epefbiexslkrvartpupx

# 4. 환경 변수 설정 (처음 배포 시에만)
supabase secrets set TOSS_SECRET_KEY=test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq --project-ref epefbiexslkrvartpupx
```

## 주요 변경사항

### ✅ 수정된 부분

**Before (기존 코드):**
```typescript
const { error: updateError } = await supabase
  .from('orders')
  .update({...})
  .eq('id', orderId)  // ❌ "ORDER-31-1760323026204" 그대로 사용
```

**After (수정된 코드):**
```typescript
// orderId 파싱
const orderIdParts = orderId.replace('ORDER-', '').split('-')
const orderIdNumber = orderIdParts[0]  // "31" 추출

const { error: updateError } = await supabase
  .from('orders')
  .update({...})
  .eq('id', orderIdNumber)  // ✅ 파싱된 숫자 ID 사용
```

### 추가 개선사항

1. **로깅 추가**: 디버깅을 위한 console.log 추가
2. **중복 처리 방지**: 이미 완료된 주문 체크
3. **에러 핸들링 개선**: 더 명확한 에러 메시지

## 테스트 방법

1. **Edge Function 배포 확인**
   ```bash
   # Edge Function 로그 확인
   supabase functions logs payment-confirm --project-ref epefbiexslkrvartpupx
   ```

2. **결제 테스트**
   - 개발 서버 실행: `npm run dev`
   - 상품 페이지 접속: http://localhost:3000/product/1?ref=E001
   - 고객 정보 입력 및 이미지 업로드
   - "카드결제" 버튼 클릭
   - 테스트 카드로 결제 진행
   - **기대 결과**: 결제 성공 페이지 정상 표시

3. **로그 확인**
   - Supabase Dashboard > Edge Functions > payment-confirm > Logs
   - 다음 로그가 표시되어야 함:
     ```
     Payment confirmation request: {
       paymentKey: "...",
       orderId: "ORDER-31-1760323026204",
       parsedOrderId: "31",
       amount: 231000
     }
     ```

## 트러블슈팅

### 여전히 같은 에러가 발생하는 경우

1. **Edge Function이 제대로 배포되었는지 확인**
   - Dashboard에서 최신 배포 시간 확인
   - 코드가 완전히 교체되었는지 확인

2. **브라우저 캐시 삭제**
   - 개발자 도구 > Network 탭 > Disable cache 체크
   - 페이지 강제 새로고침 (Ctrl+Shift+R)

3. **Edge Function 로그 확인**
   - 실제로 파싱된 orderIdNumber가 로그에 출력되는지 확인
   - 에러 메시지가 변경되었는지 확인

4. **환경 변수 확인**
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOSS_SECRET_KEY` 모두 설정되어 있는지 확인

## 참고 자료

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Toss Payments API 문서](https://docs.tosspayments.com/reference#confirm)
- [프로젝트 결제 가이드](./PAYMENT.md)
