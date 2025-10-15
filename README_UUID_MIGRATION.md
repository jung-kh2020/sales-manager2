# UUID 기반 보안 강화 마이그레이션 안내

## 개요

버전 2.0부터 상품 ID와 직원 코드가 **UUID 기반으로 변경**되어 보안이 강화되었습니다.

### 변경 사항

#### Before (취약):
```
URL: https://sale.999plus.kr/product/1?ref=0002
- 상품 ID: 1, 2, 3... (추측 가능)
- 직원 코드: 0001, 0002... (추측 가능)
```

#### After (보안):
```
URL: https://sale.999plus.kr/product/p_a8f3K2m9X1v5?ref=REF_k2m9X1v5a8
- 상품 slug: p_xxxxxxxxxxxx (난수 12자리)
- Referral code: REF_xxxxxxxxxx (난수 10자리)
```

---

## 마이그레이션 절차

### 1단계: 데이터베이스 마이그레이션

**Supabase SQL Editor**에서 `supabase_migration_uuid.sql` 파일 실행:

```sql
-- supabase_migration_uuid.sql 내용 복사 후 실행
```

**수행 작업:**
- ✅ `products` 테이블에 `slug` 컬럼 추가
- ✅ `employees` 테이블에 `referral_code` 컬럼 추가
- ✅ 기존 데이터에 자동으로 UUID 할당
- ✅ 인덱스 및 트리거 설정

**실행 후 확인:**
```sql
-- 상품 slug 확인
SELECT id, name, slug FROM products LIMIT 5;

-- 직원 referral_code 확인
SELECT id, name, employee_code, referral_code FROM employees LIMIT 5;
```

---

### 2단계: 프론트엔드 배포

**Vercel 자동 배포:**

GitHub에 푸시하면 Vercel이 자동으로 배포합니다:

```bash
git push origin master
```

**수동 배포 (필요 시):**

```bash
npm run build
vercel --prod
```

---

### 3단계: 기존 URL 리다이렉트 (선택사항)

기존 URL이 북마크되어 있는 경우를 대비한 리다이렉트 설정:

**vercel.json** 파일에 추가:

```json
{
  "redirects": [
    {
      "source": "/product/:id(\\d+)",
      "has": [
        {
          "type": "query",
          "key": "ref",
          "value": "(?<ref>\\d+)"
        }
      ],
      "destination": "/product-not-found?legacy=true",
      "permanent": false
    }
  ]
}
```

---

## 보안 개선 효과

### 공격 시나리오 차단

**시나리오 1: 상품 ID 브루트포스**
- Before: `/product/1`, `/product/2`, ... → 모든 상품 탐색 가능
- After: `/product/p_a8f3K2m9X1v5` → 36^12 = 4.7경 가지 조합 (추측 불가)

**시나리오 2: 직원 코드 변조**
- Before: `?ref=0001` → `?ref=0002`로 변경하여 실적 탈취 가능
- After: `?ref=REF_k2m9X1v5a8` → 난수 기반으로 추측 불가

**시나리오 3: 순차적 접근**
- Before: 1부터 100까지 순차 접근으로 전체 데이터 파악 가능
- After: 랜덤 slug로 enumeration 공격 차단

---

## 데이터베이스 스키마 변경

### products 테이블

```sql
ALTER TABLE products
ADD COLUMN slug VARCHAR(50) UNIQUE NOT NULL;

CREATE INDEX idx_products_slug ON products(slug);
```

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | BIGSERIAL | 내부 ID (기존) | 1, 2, 3 |
| `slug` | VARCHAR(50) | 공개 URL용 UUID | p_a8f3K2m9X1v5 |

### employees 테이블

```sql
ALTER TABLE employees
ADD COLUMN referral_code VARCHAR(20) UNIQUE NOT NULL;

CREATE INDEX idx_employees_referral_code ON employees(referral_code);
```

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | BIGSERIAL | 내부 ID (기존) | 1, 2, 3 |
| `employee_code` | VARCHAR(20) | 관리용 사원번호 (기존) | 0001, 0002 |
| `referral_code` | VARCHAR(20) | 공개 URL용 UUID | REF_k2m9X1v5a8 |

---

## 코드 변경 사항

### 1. 라우트 변경

**Before:**
```javascript
<Route path="/product/:id" element={<ProductCatalog />} />
```

**After:**
```javascript
<Route path="/product/:slug" element={<ProductCatalog />} />
```

### 2. URL 생성 로직

**Before:**
```javascript
const url = `/product/${product.id}?ref=${employee.employee_code}`
// 예: /product/1?ref=0001
```

**After:**
```javascript
const url = `/product/${product.slug}?ref=${employee.referral_code}`
// 예: /product/p_a8f3K2m9X1v5?ref=REF_k2m9X1v5a8
```

### 3. 데이터베이스 조회

**Before:**
```javascript
.from('products')
.eq('id', productId)
```

**After:**
```javascript
.from('products')
.eq('slug', productSlug)
```

---

## 롤백 방법

문제 발생 시 이전 상태로 복원:

### 데이터베이스 롤백

```sql
-- 컬럼 삭제
ALTER TABLE products DROP COLUMN IF EXISTS slug;
ALTER TABLE employees DROP COLUMN IF EXISTS referral_code;

-- 트리거 삭제
DROP TRIGGER IF EXISTS trigger_auto_generate_product_slug ON products;
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON employees;

-- 함수 삭제
DROP FUNCTION IF EXISTS auto_generate_product_slug();
DROP FUNCTION IF EXISTS auto_generate_referral_code();
DROP FUNCTION IF EXISTS generate_product_slug();
DROP FUNCTION IF EXISTS generate_referral_code();
DROP FUNCTION IF EXISTS generate_random_string(INTEGER);
```

### 코드 롤백

```bash
git revert <commit-hash>
git push origin master
```

---

## FAQ

**Q1: 기존 URL은 어떻게 되나요?**
- 기존 `/product/1` 형식 URL은 작동하지 않습니다.
- 리다이렉트 설정을 추가하면 안내 페이지로 이동 가능합니다.

**Q2: 직원들이 알던 사원번호는 어떻게 되나요?**
- `employee_code` (예: 0001)는 **관리 목적으로 유지**됩니다.
- `referral_code` (예: REF_k2m9X1v5a8)는 **URL 전용**입니다.

**Q3: UUID 충돌 가능성은?**
- 상품 slug: 36^12 = 약 4.7경 가지 조합
- Referral code: 36^10 = 약 3.6조 가지 조합
- 충돌 방지 로직이 포함되어 안전합니다.

**Q4: 성능 저하는 없나요?**
- `slug`, `referral_code`에 인덱스가 생성되어 조회 성능은 동일합니다.
- UUID 길이가 길지만 VARCHAR(50) 이하로 최적화되어 있습니다.

**Q5: 신규 상품/직원 추가 시 자동으로 UUID가 생성되나요?**
- 네, 트리거가 설정되어 INSERT 시 자동으로 생성됩니다.

---

## 지원

문제가 발생하면 다음 정보를 포함하여 문의해주세요:

1. 에러 메시지 (브라우저 콘솔)
2. 데이터베이스 로그 (Supabase Dashboard → Logs)
3. 재현 방법

---

**마이그레이션 날짜**: 2025-10-15
**버전**: 2.0.0
**작성자**: Claude Code
