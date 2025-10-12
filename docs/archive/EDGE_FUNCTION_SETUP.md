# Supabase Edge Function 배포 가이드 (Dashboard 사용)

## 개요
Toss Payments 결제 승인을 처리하기 위한 Edge Function을 Supabase Dashboard에서 직접 배포하는 방법입니다.

## 📋 준비물
- Supabase 프로젝트 (https://epefbiexslkrvartpupx.supabase.co)
- Toss Payments 시크릿 키: `test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq`

## 🚀 배포 단계

### 1. Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `epefbiexslkrvartpupx`

### 2. Edge Function 생성
1. 왼쪽 메뉴에서 **Edge Functions** 클릭
2. **Create a new function** 버튼 클릭
3. Function 이름: `payment-confirm` 입력
4. **Create function** 클릭

### 3. 코드 붙여넣기
1. 생성된 함수의 `index.ts` 파일 열기
2. [edge-function-index.ts](edge-function-index.ts) 파일 내용 전체 복사
3. Supabase 에디터의 `index.ts`에 붙여넣기 (기존 내용 모두 교체)
4. **Save** → **Deploy** 버튼 클릭

### 4. 환경 변수 설정 (중요!)
1. 왼쪽 메뉴에서 **Project Settings** 클릭
2. **Edge Functions** 탭 선택
3. **Add new secret** 클릭
4. 다음 환경 변수 추가:
   - Name: `TOSS_SECRET_KEY`
   - Value: `test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq`
5. **Save** 클릭

### 5. 배포 확인
1. Edge Functions 페이지로 돌아가기
2. `payment-confirm` 함수 상태가 **Active** 인지 확인
3. 함수 URL 복사: `https://epefbiexslkrvartpupx.supabase.co/functions/v1/payment-confirm`

### 6. 테스트
브라우저에서 결제 테스트:
1. `http://localhost:3000/product/1?ref=E001` 접속
2. 고객 정보 입력 및 이미지 업로드
3. 카드결제 선택
4. 테스트 카드로 결제 진행
5. 결제 성공 페이지 확인

## ⚠️ 문제 해결

### Edge Function 로그 확인
1. Edge Functions > `payment-confirm` 클릭
2. **Logs** 탭에서 실행 로그 확인
3. 에러 메시지 확인 및 디버깅

### 일반적인 오류

**1. CORS 오류**
- Edge Function 코드에 CORS 헤더가 포함되어 있는지 확인
- `Access-Control-Allow-Origin: *` 설정 확인

**2. 환경 변수 오류**
- `TOSS_SECRET_KEY` 설정 확인
- Edge Function 재배포

**3. 결제 승인 실패**
- Toss Payments 시크릿 키 확인
- 주문 금액과 결제 금액 일치 여부 확인
- 네트워크 연결 확인

## 📝 참고 사항

### Edge Function URL
```
https://epefbiexslkrvartpupx.supabase.co/functions/v1/payment-confirm
```

### 호출 방법 (클라이언트에서)
```javascript
const response = await fetch(
  `https://epefbiexslkrvartpupx.supabase.co/functions/v1/payment-confirm`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      paymentKey: '...',
      orderId: '...',
      amount: 10000,
    }),
  }
)
```

### 보안
- 시크릿 키는 절대 클라이언트에 노출하지 마세요
- Edge Function에서만 시크릿 키 사용
- 주문 금액 검증은 필수

## 🔗 추가 자료
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Toss Payments API 문서](https://docs.tosspayments.com/reference#confirm)
