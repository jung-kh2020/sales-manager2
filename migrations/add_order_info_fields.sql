-- 주문 테이블에 정보입력 필드 추가
-- 배송정보를 정보입력으로 변경: 상호명, 이름, 전화번호, 네이버 플레이스 주소, 사진

-- 1. 기존 customer_address 컬럼 제거 (배송 개념 없음)
ALTER TABLE orders DROP COLUMN IF EXISTS customer_address;

-- 2. 새로운 필드 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_name VARCHAR(255); -- 상호명
ALTER TABLE orders ADD COLUMN IF NOT EXISTS naver_place_address TEXT; -- 네이버 플레이스 주소
ALTER TABLE orders ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb; -- 업로드된 이미지 URL 배열

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_business_name ON orders(business_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 주의사항:
-- 1. Supabase Storage에 'order-images' 버킷을 생성해야 합니다
-- 2. 버킷은 public 또는 authenticated 정책으로 설정
-- 3. image_urls는 ['https://...', 'https://...'] 형태의 JSON 배열
