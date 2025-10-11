# Supabase Storage 설정 가이드

주문 이미지 업로드 기능을 사용하기 위해 Supabase Storage 버킷을 설정해야 합니다.

## 1단계: Supabase Dashboard 접속

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. 왼쪽 사이드바에서 **Storage** 클릭

## 2단계: 버킷 생성

1. **New bucket** 버튼 클릭
2. 다음 정보 입력:
   - **Name**: `order-images`
   - **Public bucket**: ✅ 체크 (공개 버킷으로 설정)
3. **Create bucket** 버튼 클릭

## 3단계: 정책 설정 (선택사항)

기본적으로 public 버킷은 누구나 읽을 수 있지만, 업로드는 제한됩니다.
인증된 사용자만 업로드하도록 설정하려면:

1. 생성된 `order-images` 버킷 클릭
2. **Policies** 탭 클릭
3. **New Policy** 버튼 클릭

### 업로드 정책 (모든 사용자 허용)

**UI 설정:**
- Policy name: `Allow public uploads`
- **Allowed operation**: `INSERT` ✅ (체크박스 선택)
- Target roles: `public`
- WITH CHECK expression: `bucket_id = 'order-images'`

**SQL:**
```sql
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'order-images');
```

### 업로드 정책 (인증된 사용자만 허용) - 권장

**UI 설정:**
- Policy name: `Allow authenticated uploads`
- **Allowed operation**: `INSERT` ✅ (체크박스 선택)
- Target roles: `authenticated`
- WITH CHECK expression: `bucket_id = 'order-images'`

**SQL:**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-images');
```

### 읽기 정책 (이미 public 버킷이면 자동 적용됨)

**UI 설정:**
- Policy name: `Allow public read`
- **Allowed operation**: `SELECT` ✅ (체크박스 선택)
- Target roles: `public`
- USING expression: `bucket_id = 'order-images'`

**SQL:**
```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-images');
```

> **참고**: Supabase UI에서 정책을 생성할 때, Allowed operation에는 여러 옵션이 있습니다:
> - `SELECT` - 읽기 (다운로드)
> - `INSERT` - 생성 (업로드)
> - `UPDATE` - 수정
> - `DELETE` - 삭제
>
> 각 작업에 맞는 operation을 선택하세요.

## 4단계: 데이터베이스 마이그레이션 실행

Supabase SQL Editor에서 다음 마이그레이션 파일을 실행하세요:

```sql
-- migrations/add_order_info_fields.sql 파일 내용 실행
```

또는 Supabase Dashboard → **SQL Editor** → **New query**에서:

```sql
-- 1. 기존 customer_address 컬럼 제거 (배송 개념 없음)
ALTER TABLE orders DROP COLUMN IF EXISTS customer_address;

-- 2. 새로운 필드 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_name VARCHAR(255); -- 상호명
ALTER TABLE orders ADD COLUMN IF NOT EXISTS naver_place_address TEXT; -- 네이버 플레이스 주소
ALTER TABLE orders ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb; -- 업로드된 이미지 URL 배열

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_business_name ON orders(business_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
```

## 5단계: 확인

1. Storage → `order-images` 버킷이 생성되었는지 확인
2. 버킷이 **Public**으로 설정되어 있는지 확인
3. 정책이 올바르게 설정되었는지 확인

## 버킷 구조

```
order-images/
├── 1234567890_abc123.jpg
├── 1234567891_def456.png
├── 1234567892_ghi789.jpg
└── ...
```

- 파일명 형식: `{timestamp}_{random}.{extension}`
- 파일 타입: 이미지 파일 (jpg, png, gif, webp 등)
- 최대 업로드: 주문당 5개

## 문제 해결

### 업로드 오류 발생 시

1. **버킷 이름 확인**: `order-images`가 정확한지 확인
2. **Public 설정 확인**: 버킷이 public으로 설정되어 있는지 확인
3. **정책 확인**: 업로드 정책이 올바르게 설정되어 있는지 확인
4. **브라우저 콘솔 확인**: 개발자 도구에서 오류 메시지 확인

### CORS 오류 발생 시

Supabase는 기본적으로 CORS를 허용하지만, 문제가 발생하면:

1. Supabase Dashboard → **Settings** → **API**
2. **CORS Origins** 섹션 확인
3. 필요시 도메인 추가 (예: `http://localhost:3000`)

## 완료!

이제 ProductCatalog 페이지에서 이미지 업로드가 가능하고,
OnlineOrders 페이지에서 업로드된 이미지를 확인 및 다운로드할 수 있습니다.
