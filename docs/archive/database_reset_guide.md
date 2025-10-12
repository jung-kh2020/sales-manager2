# 🗄️ 데이터베이스 리셋 가이드

## 📋 개요
기존 복잡한 상품 테이블을 삭제하고, 간단한 구조로 새로 생성하는 가이드입니다.

## ⚠️ 주의사항
- **기존 데이터가 모두 삭제됩니다!**
- 백업이 필요한 데이터가 있다면 미리 백업하세요
- Supabase 대시보드에서 직접 실행하거나 SQL 에디터를 사용하세요

## 🔄 단계별 실행 방법

### 1단계: 기존 테이블 삭제 (순서 중요!)
```sql
-- 외래키 참조 때문에 순서대로 삭제해야 함
DROP TABLE IF EXISTS orders CASCADE;        -- 먼저 삭제
DROP TABLE IF EXISTS sales CASCADE;         -- 그 다음 삭제  
DROP TABLE IF EXISTS commissions CASCADE;   -- 그 다음 삭제
DROP TABLE IF EXISTS products CASCADE;       -- 마지막에 삭제
DROP TABLE IF EXISTS employees CASCADE;     -- 마지막에 삭제
```

### 2단계: 새로운 테이블 생성 (순서 중요!)
```sql
-- 1. 사용자 테이블 생성 (인증용)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  employee_id BIGINT UNIQUE, -- 사원 테이블과 연결
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사원 테이블 생성
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

-- 2. 상품 테이블 생성 (간단한 구조)
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 판매 테이블 생성 (products와 employees 참조)
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

-- 4. 수수료 테이블 생성 (employees 참조)
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

-- 5. 주문 테이블 생성 (products와 employees 참조)
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  employee_id BIGINT REFERENCES employees(id) ON DELETE RESTRICT, -- 판매자
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_address TEXT,
  quantity INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_id VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3단계: 인덱스 및 트리거 생성
```sql
-- 인덱스 생성 (성능 향상)
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_sales_employee_id ON sales(employee_id);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_commissions_employee_id ON commissions(employee_id);
CREATE INDEX idx_commissions_year_month ON commissions(year_month);

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

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4단계: 샘플 데이터 삽입 (선택사항)
```sql
-- 1. 관리자 계정 생성
INSERT INTO users (email, password_hash, role, is_active) VALUES
  ('admin@company.com', '', 'admin', TRUE);

-- 2. 샘플 사원 데이터 삽입
INSERT INTO employees (employee_code, name, phone, email, hire_date) VALUES
  ('EMP001', '김영희', '010-1234-5678', 'kim@company.com', '2024-01-01'),
  ('EMP002', '박민수', '010-2345-6789', 'park@company.com', '2024-01-15'),
  ('EMP003', '이지은', '010-3456-7890', 'lee@company.com', '2024-02-01');

-- 3. 사원 계정 생성
INSERT INTO users (email, password_hash, role, employee_id, is_active) VALUES
  ('kim@company.com', '', 'employee', 1, TRUE),
  ('park@company.com', '', 'employee', 2, TRUE),
  ('lee@company.com', '', 'employee', 3, TRUE);

-- 4. 샘플 상품 데이터 삽입
INSERT INTO products (name, description, price, cost) VALUES
  ('베이직 플랜', '소상공인을 위한 기본 리뷰 관리 서비스', 210000, 90000),
  ('스탠다드 플랜', '중소기업을 위한 표준 리뷰 관리 서비스', 480000, 225000),
  ('프리미엄 플랜', '대기업을 위한 고급 리뷰 관리 서비스', 900000, 450000),
  ('익스프레스 플랜', '빠른 리뷰 처리를 위한 단기 서비스', 200000, 75000),
  ('엔터프라이즈 플랜', '대규모 기업을 위한 종합 리뷰 관리 서비스', 1400000, 750000);
```

## 🚀 Supabase에서 실행하는 방법

### 방법 1: SQL 에디터 사용
1. Supabase 대시보드 → SQL Editor
2. 위의 SQL 코드를 복사해서 붙여넣기
3. "Run" 버튼 클릭

### 방법 2: 테이블 에디터 사용
1. Supabase 대시보드 → Table Editor
2. 기존 `products` 테이블 삭제
3. 새 테이블 생성 (스키마 복사)

## 📊 테이블 관계도

```
employees (사원)
    │
    ├── sales (판매) ──── products (상품)
    │
    └── commissions (수수료)

products (상품)
    │
    └── orders (주문)
```

### 🔗 외래키 관계
- `sales.employee_id` → `employees.id`
- `sales.product_id` → `products.id`
- `commissions.employee_id` → `employees.id`
- `orders.product_id` → `products.id`

## 📊 새로운 테이블 구조

### products 테이블
| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | BIGSERIAL PRIMARY KEY | 고유 번호 (자동 증가) | 1, 2, 3... |
| `name` | VARCHAR(100) NOT NULL | 상품명 (필수) | "베이직 플랜" |
| `description` | TEXT | 상품설명 (선택) | "소상공인을 위한..." |
| `price` | INTEGER NOT NULL | 판매가 (필수) | 210000 |
| `cost` | INTEGER NOT NULL | 원가 (필수) | 90000 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 생성일시 (자동) | 2024-01-15 14:30:00 |

### orders 테이블 (필요시)
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | BIGSERIAL PRIMARY KEY | 주문 고유 번호 |
| `product_id` | BIGINT | 상품 ID (외래키) |
| `customer_name` | VARCHAR(255) | 고객명 |
| `customer_email` | VARCHAR(255) | 고객 이메일 |
| `customer_phone` | VARCHAR(50) | 고객 전화번호 |
| `customer_address` | TEXT | 고객 주소 |
| `quantity` | INTEGER | 주문 수량 |
| `total_amount` | INTEGER | 총 결제금액 |
| `status` | VARCHAR(20) | 주문 상태 |
| `payment_id` | VARCHAR(255) | 결제 ID |
| `payment_date` | TIMESTAMP WITH TIME ZONE | 결제일시 |
| `created_at` | TIMESTAMP WITH TIME ZONE | 주문 생성일시 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 주문 수정일시 |

## ✅ 완료 후 확인사항

1. **테이블 생성 확인**
   ```sql
   SELECT * FROM products;
   ```

2. **샘플 데이터 확인**
   ```sql
   SELECT name, price, cost FROM products;
   ```

3. **애플리케이션에서 테스트**
   - 상품 관리 페이지에서 상품 등록/수정 테스트
   - 상품 카탈로그 페이지에서 상품 조회 테스트

## 🔧 문제 해결

### 오류: "relation does not exist"
- 테이블이 아직 생성되지 않았습니다
- CREATE TABLE 문을 먼저 실행하세요

### 오류: "foreign key constraint"
- 참조하는 테이블이 먼저 생성되어야 합니다
- products 테이블을 먼저 생성하고 orders 테이블을 생성하세요

### 오류: "permission denied"
- Supabase 프로젝트의 권한을 확인하세요
- 관리자 권한이 필요할 수 있습니다

## 📝 추가 팁

- **백업**: 중요한 데이터가 있다면 미리 백업하세요
- **테스트**: 개발 환경에서 먼저 테스트해보세요
- **단계별 실행**: 한 번에 모든 SQL을 실행하지 말고 단계별로 실행하세요
- **로그 확인**: Supabase 로그에서 오류 메시지를 확인하세요

---

이제 간단하고 깔끔한 상품 테이블로 시작할 수 있습니다! 🎉
