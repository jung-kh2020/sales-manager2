-- UUID 기반 보안 강화 마이그레이션
-- 실행 날짜: 2025-10-15
-- 목적: 순차적 ID/코드를 난수 기반 slug/referral_code로 변경하여 보안 강화

-- ============================================
-- 1단계: 컬럼 추가
-- ============================================

-- 상품 테이블에 slug 컬럼 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS slug VARCHAR(50) UNIQUE;

-- 직원 테이블에 referral_code 컬럼 추가
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- ============================================
-- 2단계: UUID 생성 함수 (PostgreSQL용)
-- ============================================

-- 랜덤 문자열 생성 함수 (알파벳 대소문자 + 숫자)
CREATE OR REPLACE FUNCTION generate_random_string(length INTEGER)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 상품 slug 생성 함수 (접두사 p_ + 12자리 랜덤)
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    new_slug := 'p_' || generate_random_string(12);

    -- 중복 체크
    SELECT EXISTS(SELECT 1 FROM products WHERE slug = new_slug) INTO slug_exists;

    -- 중복이 없으면 반환
    IF NOT slug_exists THEN
      RETURN new_slug;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 직원 referral_code 생성 함수 (접두사 REF_ + 10자리 랜덤)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'REF_' || generate_random_string(10);

    -- 중복 체크
    SELECT EXISTS(SELECT 1 FROM employees WHERE referral_code = new_code) INTO code_exists;

    -- 중복이 없으면 반환
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3단계: 기존 데이터에 UUID 할당
-- ============================================

-- 기존 상품에 slug 생성 (NULL인 경우만)
UPDATE products
SET slug = generate_product_slug()
WHERE slug IS NULL;

-- 기존 직원에 referral_code 생성 (NULL인 경우만)
UPDATE employees
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================
-- 4단계: 제약조건 추가
-- ============================================

-- slug, referral_code를 NOT NULL로 변경 (향후 필수값)
ALTER TABLE products
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE employees
ALTER COLUMN referral_code SET NOT NULL;

-- ============================================
-- 5단계: 인덱스 생성 (성능 최적화)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_employees_referral_code ON employees(referral_code);

-- ============================================
-- 6단계: 트리거 생성 (신규 데이터 자동 할당)
-- ============================================

-- 상품 삽입 시 자동으로 slug 생성
CREATE OR REPLACE FUNCTION auto_generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_product_slug();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_product_slug
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION auto_generate_product_slug();

-- 직원 삽입 시 자동으로 referral_code 생성
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_referral_code
BEFORE INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION auto_generate_referral_code();

-- ============================================
-- 완료 메시지
-- ============================================

-- 마이그레이션 완료 확인
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UUID 마이그레이션 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ products.slug 컬럼 추가 완료';
  RAISE NOTICE '✅ employees.referral_code 컬럼 추가 완료';
  RAISE NOTICE '✅ 기존 데이터에 UUID 할당 완료';
  RAISE NOTICE '✅ 인덱스 생성 완료';
  RAISE NOTICE '✅ 자동 생성 트리거 설정 완료';
  RAISE NOTICE '========================================';
  RAISE NOTICE '다음 단계: 프론트엔드 코드 수정 필요';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 롤백 스크립트 (필요 시 사용)
-- ============================================

-- 롤백이 필요한 경우 아래 주석을 해제하고 실행:
-- DROP TRIGGER IF EXISTS trigger_auto_generate_product_slug ON products;
-- DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON employees;
-- DROP FUNCTION IF EXISTS auto_generate_product_slug();
-- DROP FUNCTION IF EXISTS auto_generate_referral_code();
-- DROP FUNCTION IF EXISTS generate_product_slug();
-- DROP FUNCTION IF EXISTS generate_referral_code();
-- DROP FUNCTION IF EXISTS generate_random_string(INTEGER);
-- ALTER TABLE products DROP COLUMN IF EXISTS slug;
-- ALTER TABLE employees DROP COLUMN IF EXISTS referral_code;
