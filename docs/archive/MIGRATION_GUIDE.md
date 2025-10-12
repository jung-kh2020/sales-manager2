# 📋 판매 가격 스냅샷 마이그레이션 가이드

## 🎯 목적
제품 가격 변경 시 과거 판매 데이터의 무결성을 보장하기 위해 판매 시점의 가격/원가를 `sales` 테이블에 스냅샷으로 저장합니다.

## ⚠️ 중요 사항
이 마이그레이션은 **Supabase SQL Editor에서 실행**해야 합니다.

## 📝 마이그레이션 단계

### 1단계: 마이그레이션 SQL 실행
Supabase Dashboard → SQL Editor로 이동하여 `migration_add_sale_price.sql` 파일의 내용을 실행하세요.

```sql
-- 1. sales 테이블에 컬럼 추가
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS sale_price INTEGER,
ADD COLUMN IF NOT EXISTS sale_cost INTEGER;

-- 2. 기존 데이터 마이그레이션
UPDATE sales s
SET
  sale_price = p.price,
  sale_cost = p.cost
FROM products p
WHERE s.product_id = p.id
  AND s.sale_price IS NULL;

-- 3. NOT NULL 제약조건 추가
ALTER TABLE sales
ALTER COLUMN sale_price SET NOT NULL,
ALTER COLUMN sale_cost SET NOT NULL;
```

### 2단계: 마이그레이션 검증
다음 쿼리로 마이그레이션이 정상적으로 완료되었는지 확인하세요:

```sql
-- 전체 판매 건수 및 마이그레이션 완료 건수 확인
SELECT
  COUNT(*) as total_sales,
  COUNT(sale_price) as migrated_price,
  COUNT(sale_cost) as migrated_cost
FROM sales;
```

**기대 결과:** `total_sales` = `migrated_price` = `migrated_cost`

### 3단계: 샘플 데이터 확인
```sql
-- 최근 10개 판매 내역의 가격 스냅샷 확인
SELECT
  s.id,
  s.sale_date,
  p.name as product_name,
  s.sale_price as snapshot_price,
  p.price as current_price,
  s.sale_cost as snapshot_cost,
  p.cost as current_cost,
  CASE
    WHEN s.sale_price = p.price THEN '✅ 동일'
    ELSE '⚠️ 변경됨'
  END as price_status
FROM sales s
JOIN products p ON s.product_id = p.id
ORDER BY s.sale_date DESC
LIMIT 10;
```

### 4단계: 애플리케이션 배포
마이그레이션 완료 후 업데이트된 코드를 배포하세요.

```bash
# 로컬 테스트
npm run dev

# 프로덕션 빌드
npm run build

# Vercel 배포 (자동 배포 설정된 경우)
git push origin master
```

## 🔍 변경된 파일 목록

### 데이터베이스 스키마
- ✅ `supabase_schema.sql` - sales 테이블에 `sale_price`, `sale_cost` 컬럼 추가
- ✅ `migration_add_sale_price.sql` - 마이그레이션 SQL 스크립트 (신규)

### 프론트엔드 코드
- ✅ `src/pages/Sales.jsx`
  - 판매 등록 시 제품의 현재 가격/원가를 `sale_price/sale_cost`에 저장
  - 판매 조회 시 `products` 테이블 대신 `sale_price` 사용

- ✅ `src/pages/Dashboard.jsx`
  - 오프라인 판매 집계 시 `sale.sale_price/sale_cost` 사용
  - 최근 판매 내역 테이블에 `sale_price` 표시

- ✅ `src/pages/Statistics.jsx`
  - 통계 계산 시 `sale.sale_price` 사용

- ✅ `src/pages/Commissions.jsx`
  - 수수료 계산 시 `sale.sale_price/sale_cost` 사용

## 💡 작동 원리

### 기존 방식 (문제 발생)
```javascript
// 판매 조회 시 products 테이블의 현재 가격 참조
products (name, price, cost)

// 계산 시 현재 가격 사용 (❌ 과거 판매가 현재 가격으로 표시됨)
const saleAmount = sale.products.price * sale.quantity
```

### 새로운 방식 (문제 해결)
```javascript
// 판매 등록 시 가격 스냅샷 저장
const submitData = {
  ...formData,
  sale_price: selectedProduct.price,  // 판매 시점 가격
  sale_cost: selectedProduct.cost,    // 판매 시점 원가
}

// 조회/계산 시 저장된 가격 사용 (✅ 과거 판매는 판매 당시 가격 유지)
const saleAmount = sale.sale_price * sale.quantity
```

## 🧪 테스트 시나리오

### 테스트 1: 신규 판매 등록
1. `/sales` 페이지에서 신규 판매 등록
2. Supabase에서 `sales` 테이블 확인
3. `sale_price`, `sale_cost`에 현재 제품 가격이 저장되었는지 확인

### 테스트 2: 제품 가격 변경 후 과거 데이터 확인
1. `/products` 페이지에서 제품 가격 변경 (예: ₩210,000 → ₩250,000)
2. `/sales` 페이지에서 과거 판매 내역 확인
3. **기대 결과:** 과거 판매는 여전히 ₩210,000으로 표시됨 ✅

### 테스트 3: 통계 정확성 검증
1. 제품 가격 변경 후 `/statistics` 페이지 확인
2. 통계 수치가 실제 판매 금액과 일치하는지 확인
3. `/commissions` 페이지에서 수수료 계산이 정확한지 확인

## ⚡ 롤백 방법

만약 문제가 발생하면 다음 SQL로 롤백할 수 있습니다:

```sql
-- sale_price, sale_cost 컬럼 제거
ALTER TABLE sales
DROP COLUMN IF EXISTS sale_price,
DROP COLUMN IF EXISTS sale_cost;
```

**주의:** 롤백 시 이전 코드로 되돌려야 합니다.

## 📊 데이터 검증 쿼리

### 가격 변동 내역 확인
```sql
SELECT
  p.name,
  COUNT(DISTINCT s.sale_price) as price_variations,
  MIN(s.sale_price) as min_price,
  MAX(s.sale_price) as max_price,
  p.price as current_price
FROM sales s
JOIN products p ON s.product_id = p.id
GROUP BY p.id, p.name, p.price
HAVING COUNT(DISTINCT s.sale_price) > 1
ORDER BY price_variations DESC;
```

### 월별 매출 정확성 확인
```sql
SELECT
  DATE_TRUNC('month', sale_date) as month,
  COUNT(*) as sales_count,
  SUM(sale_price * quantity) as total_sales,
  SUM(sale_cost * quantity) as total_cost,
  SUM((sale_price - sale_cost) * quantity) as total_margin
FROM sales
GROUP BY DATE_TRUNC('month', sale_date)
ORDER BY month DESC;
```

## ✅ 완료 체크리스트

- [ ] Supabase SQL Editor에서 마이그레이션 SQL 실행
- [ ] 데이터 검증 쿼리 실행 및 결과 확인
- [ ] 로컬 환경에서 테스트 (npm run dev)
- [ ] 신규 판매 등록 → 가격 스냅샷 저장 확인
- [ ] 제품 가격 변경 → 과거 판매 금액 유지 확인
- [ ] 통계/수수료 계산 정확성 검증
- [ ] 프로덕션 배포
- [ ] 프로덕션 환경에서 최종 검증

## 🆘 문제 해결

### 문제 1: "column sale_price does not exist" 에러
**원인:** 마이그레이션 SQL이 실행되지 않음
**해결:** Supabase SQL Editor에서 `migration_add_sale_price.sql` 실행

### 문제 2: 과거 판매 금액이 NULL로 표시됨
**원인:** 기존 데이터 마이그레이션 실패
**해결:** 다음 SQL 실행
```sql
UPDATE sales s
SET sale_price = p.price, sale_cost = p.cost
FROM products p
WHERE s.product_id = p.id AND s.sale_price IS NULL;
```

### 문제 3: 통계 수치가 이상함
**원인:** 캐시된 데이터 또는 브라우저 캐시
**해결:**
1. 브라우저 새로고침 (Ctrl+Shift+R / Cmd+Shift+R)
2. 브라우저 캐시 삭제
3. Supabase에서 직접 쿼리하여 데이터 확인

## 📞 지원

문제가 지속되면:
1. Supabase 로그 확인
2. 브라우저 개발자 도구 Console 확인
3. GitHub Issues에 문의
