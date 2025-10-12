# Toss Payments SDK・API 개별 연동 가이드

## 개요
이 프로젝트는 Toss Payments SDK・API를 사용하여 온라인 카드결제를 처리합니다.
결제위젯이 아닌 개별 SDK 연동 방식으로 더 커스터마이즈가 가능하고 운영 서비스에 적합합니다.

## 환경 설정

### 1. 환경 변수 설정

`.env` 파일에 다음 환경 변수를 추가하세요:

```bash
# Toss Payments (SDK・API 개별 연동)
VITE_TOSS_CLIENT_KEY=test_ck_LlDJaYngrozQb25nZxNKVezGdRpX
```

**프로덕션 환경:**
- 클라이언트 키: `test_ck_LlDJaYngrozQb25nZxNKVezGdRpX`
- 시크릿 키: `test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq` (백엔드에서만 사용)
- 보안 키: `d0dfb285680696b55d1a9c82b0e8714a5292b8755f480a03c745d75cd04c0ac1`

**⚠️ 보안 주의사항:**
- 시크릿 키와 보안 키는 절대 클라이언트 코드에 포함하지 마세요
- 백엔드(Supabase Edge Function)에서만 사용해야 합니다

### 2. 결제 흐름

1. **주문 생성** ([ProductCatalog.jsx:162-214](src/pages/ProductCatalog.jsx#L162-L214))
   - 사용자가 상품 정보 입력
   - 이미지 업로드 (Supabase Storage)
   - `handleCardPayment()` 클릭
   - `orders` 테이블에 `pending_payment` 상태로 주문 생성

2. **결제 페이지** ([PaymentPage.jsx](src/pages/PaymentPage.jsx))
   - Toss Payments SDK 로드
   - 결제 수단 선택 (카드, 가상계좌, 계좌이체, 휴대폰)
   - `requestPayment()` 호출로 결제 요청

3. **결제 승인** (백엔드 API 필요)
   - Toss Payments로부터 결제 정보 수신
   - 결제 승인 API 호출 (Supabase Edge Function)
   - 주문 상태 업데이트 (`completed`)

4. **결제 완료/실패**
   - 성공: [PaymentSuccess.jsx](src/pages/PaymentSuccess.jsx)
   - 실패: [PaymentFail.jsx](src/pages/PaymentFail.jsx)

## 결제 승인 API 구현 (필수)

**⚠️ 중요: 결제 승인은 반드시 백엔드에서 처리해야 합니다!**

보안상의 이유로 결제 승인은 클라이언트에서 직접 호출하면 안 됩니다.
Supabase Edge Functions를 사용하여 백엔드 API를 구현해야 합니다.

### Supabase Edge Function 생성 방법

1. **Supabase CLI 설치**
```bash
npm install -g supabase
```

2. **Supabase 프로젝트 초기화**
```bash
supabase init
```

3. **Edge Function 생성**
```bash
supabase functions new payment-confirm
```

4. **Edge Function 코드 작성** (`supabase/functions/payment-confirm/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY')! // test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const { paymentKey, orderId, amount } = await req.json()

    // 1. Toss Payments 결제 승인 API 호출
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '결제 승인 실패')
    }

    const paymentData = await response.json()

    // 2. Supabase에 결제 정보 업데이트
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_key: paymentKey,
        payment_method: paymentData.method,
        payment_date: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    return new Response(JSON.stringify(paymentData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 400,
    })
  }
})
```

5. **Edge Function 배포**
```bash
supabase functions deploy payment-confirm --project-ref <your-project-ref>
```

6. **환경 변수 설정** (Supabase Dashboard)
- Supabase Dashboard > Project Settings > Edge Functions
- `TOSS_SECRET_KEY` 추가: `test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq`

## 데이터베이스 업데이트

### orders 테이블에 컬럼 추가

Supabase SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- payment_key 컬럼 추가 (Toss Payments 결제 키)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_key TEXT;

-- payment_method 컬럼 추가 (결제 수단: 카드, 가상계좌, 계좌이체, 휴대폰 등)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- payment_date 컬럼 추가 (결제 완료 일시)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
```

## 테스트 방법

### 1. 개발 환경 실행
```bash
npm run dev
```

### 2. 테스트 카드 정보

Toss Payments 테스트 환경에서 사용할 수 있는 카드 정보:

| 카드사 | 카드번호 | 유효기간 | CVC | 비밀번호 |
|--------|----------|----------|-----|----------|
| 신한 | 9446-0178-9269-2489 | 아무거나 | 아무거나 | 아무거나 |
| 국민 | 9430-0600-3911-0012 | 아무거나 | 아무거나 | 아무거나 |
| 하나 | 9436-9560-0523-5106 | 아무거나 | 아무거나 | 아무거나 |

**주의사항:**
- 테스트 환경에서는 실제 결제가 발생하지 않습니다
- 테스트 결제 내역은 Toss Payments 개발자센터에서 확인 가능

### 3. 결제 테스트 절차

1. 상품 페이지 접근: `http://localhost:3000/product/1?ref=E001` (ref는 직원 코드)
2. 고객 정보 입력 및 이미지 업로드
3. "카드결제" 버튼 클릭
4. 결제 수단 선택 (카드/가상계좌/계좌이체/휴대폰)
5. 결제하기 버튼 클릭
6. Toss Payments 결제창에서 테스트 카드 정보 입력
7. 결제 완료 확인

## 주요 컴포넌트

### 1. ProductCatalog.jsx - 상품 구매 페이지
- 상품 정보 표시
- 고객 정보 입력 폼
- 이미지 업로드 (Supabase Storage)
- 카드결제/계좌이체 선택
- 주문 생성 및 결제 페이지 이동

### 2. PaymentPage.jsx - 결제 페이지
- Toss Payments SDK 초기화
- 결제 수단 선택 UI (카드, 가상계좌, 계좌이체, 휴대폰)
- `requestPayment()` 호출로 결제창 띄우기

### 3. PaymentSuccess.jsx - 결제 성공 페이지
- URL 파라미터에서 결제 정보 추출
- Supabase Edge Function 호출하여 결제 승인
- 주문 상태 업데이트
- 결제 완료 정보 표시

### 4. PaymentFail.jsx - 결제 실패 페이지
- URL 파라미터에서 에러 정보 추출
- 에러 코드별 메시지 표시
- 재시도 / 홈으로 이동 옵션

## 추가 참고 자료

- [Toss Payments 개발자 문서](https://docs.tosspayments.com/)
- [SDK・API 연동 가이드](https://docs.tosspayments.com/guides/v2/payment-sdk)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
