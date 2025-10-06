-- 영업사원 관리 프로그램 데이터베이스 스키마

-- 1. 사원 테이블
CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  employee_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 상품 테이블
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  cost INTEGER NOT NULL,
  introduction TEXT,  -- 상품 소개 (ProductCatalog에 표시)
  features TEXT,      -- 주요 기능 (ProductCatalog에 표시)
  specifications TEXT, -- 제품 사양 (ProductCatalog에 표시)
  image_url TEXT,     -- 상품 이미지 URL (외부 이미지 링크)
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- 주의: 상품 페이지 URL은 자동 생성됨 (/product/{id})
);

-- 3. 판매 테이블
CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE RESTRICT,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  sale_date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  customer_name VARCHAR(100),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 수수료 테이블
CREATE TABLE commissions (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE RESTRICT,
  year_month VARCHAR(7) NOT NULL,
  total_sales BIGINT,
  total_cost BIGINT,
  base_commission BIGINT,
  bonus_commission BIGINT,
  total_commission BIGINT,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, year_month)
);

-- 5. 사용자 테이블 (인증)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_sales_employee_id ON sales(employee_id);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_commissions_employee_id ON commissions(employee_id);
CREATE INDEX idx_commissions_year_month ON commissions(year_month);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기본 상품 데이터 삽입
INSERT INTO products (name, description, price, cost) VALUES
  ('베이직 플랜', '소상공인을 위한 기본 리뷰 관리 서비스', 210000, 90000),
  ('스탠다드 플랜', '중소기업을 위한 표준 리뷰 관리 서비스', 480000, 225000),
  ('프리미엄 플랜', '대기업을 위한 고급 리뷰 관리 서비스', 900000, 450000),
  ('익스프레스 플랜', '빠른 리뷰 처리를 위한 단기 서비스', 200000, 75000),
  ('엔터프라이즈 플랜', '대규모 기업을 위한 종합 리뷰 관리 서비스', 1400000, 750000);

-- 관리자 계정 생성 (비밀번호: !QAZ2wsx!@#$)
-- 주의: 실제로는 Supabase Auth를 통해 관리자를 생성한 후, users 테이블에 레코드를 추가해야 합니다.
-- 아래는 참고용이며, Supabase Dashboard에서 먼저 Auth 사용자를 생성하세요.
-- INSERT INTO users (email, role, is_active) VALUES
--   ('admin@sales.com', 'admin', true);
