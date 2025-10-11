-- ========================================
-- 판매 테이블 가격 스냅샷 마이그레이션
-- ========================================
-- 목적: 제품 가격 변경 시 과거 판매 데이터 무결성 보장
-- 실행일: 2025-10-11
-- ========================================

-- 1. sales 테이블에 sale_price, sale_cost 컬럼 추가
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS sale_price INTEGER,
ADD COLUMN IF NOT EXISTS sale_cost INTEGER;

-- 2. 기존 판매 데이터에 현재 제품 가격 복사 (마이그레이션)
UPDATE sales s
SET
  sale_price = p.price,
  sale_cost = p.cost
FROM products p
WHERE s.product_id = p.id
  AND s.sale_price IS NULL;  -- 아직 마이그레이션 안 된 데이터만

-- 3. NOT NULL 제약조건 추가 (모든 데이터가 마이그레이션된 후)
ALTER TABLE sales
ALTER COLUMN sale_price SET NOT NULL,
ALTER COLUMN sale_cost SET NOT NULL;

-- 4. 검증: 마이그레이션 결과 확인
SELECT
  COUNT(*) as total_sales,
  COUNT(sale_price) as migrated_price,
  COUNT(sale_cost) as migrated_cost
FROM sales;

-- 5. 샘플 데이터 확인
SELECT
  s.id,
  s.sale_date,
  p.name as product_name,
  s.sale_price as snapshot_price,
  p.price as current_price,
  s.sale_cost as snapshot_cost,
  p.cost as current_cost,
  CASE
    WHEN s.sale_price = p.price THEN '동일'
    ELSE '변경됨'
  END as price_status
FROM sales s
JOIN products p ON s.product_id = p.id
ORDER BY s.sale_date DESC
LIMIT 10;
