# Supabase Storage Setup Guide

## Required Storage Buckets

This project requires two Storage Buckets:

1. **product-images** - For product images
2. **order-images** - For customer uploaded images during orders

---

## Step 1: Create Storage Buckets

### 1.1 Create product-images bucket

1. Access Supabase Dashboard
2. Click **Storage** in left menu
3. Click **Create a new bucket**
4. Enter the following:
   - Name: `product-images`
   - Public bucket: YES (check the box)
   - File size limit: 5MB
   - Allowed MIME types: `image/*`
5. Click **Create bucket**

### 1.2 Create order-images bucket

1. Click **Create a new bucket** again
2. Enter the following:
   - Name: `order-images`
   - Public bucket: YES (check the box)
   - File size limit: 5MB
   - Allowed MIME types: `image/*`
3. Click **Create bucket**

---

## Step 2: Set Storage Policies (SQL)

Copy and paste this SQL into Supabase SQL Editor:

```sql
-- ============================================
-- Supabase Storage Policies
-- ============================================

-- product-images bucket policies
CREATE POLICY "Allow public to read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- order-images bucket policies (ALL PUBLIC)
CREATE POLICY "Allow public to read order images"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-images');

CREATE POLICY "Allow public to upload order images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-images');

CREATE POLICY "Allow public to update order images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'order-images');

CREATE POLICY "Allow public to delete order images"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-images');
```

---

## Step 3: Verify Setup

After running the SQL, verify:

- [ ] `product-images` bucket created
- [ ] `order-images` bucket created
- [ ] Both buckets are "Public buckets"
- [ ] 4 policies created for each bucket (8 total)
- [ ] All policies show in Storage > Policies tab

---

## Code Examples

### Upload Product Image

```javascript
import { supabase } from './services/supabase'

async function uploadProductImage(file, productId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `products/${productId}.${fileExt}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { upsert: true })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return publicUrl
}
```

### Upload Order Images (Multiple)

```javascript
async function uploadOrderImages(files, orderId) {
  const uploadPromises = files.map(async (file, index) => {
    const fileExt = file.name.split('.').pop()
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const fileName = `${year}/${month}/order_${orderId}_${index + 1}.${fileExt}`

    const { error } = await supabase.storage
      .from('order-images')
      .upload(fileName, file)

    if (error) return null

    const { data: { publicUrl } } = supabase.storage
      .from('order-images')
      .getPublicUrl(fileName)

    return publicUrl
  })

  const urls = await Promise.all(uploadPromises)
  return urls.filter(url => url !== null)
}
```

### Delete Images

```javascript
async function deleteProductImage(fileName) {
  const { error } = await supabase.storage
    .from('product-images')
    .remove([fileName])

  return !error
}
```

---

## Troubleshooting

### Issue: "new row violates row-level security policy"
- Check that all 8 policies are created
- Verify bucket_id matches exactly
- Try deleting and recreating policies

### Issue: Upload works but image not displayed
- Verify bucket is set as "Public bucket"
- Check SELECT policy exists
- Try accessing image URL directly in browser

### Issue: CORS Error
- Go to Supabase Dashboard > Settings > API
- Add your domain to "Additional CORS origins"
- For local dev: `http://localhost:5173`

---

## References

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage Security](https://supabase.com/docs/guides/storage/security/access-control)
- [JavaScript API](https://supabase.com/docs/reference/javascript/storage-from-upload)

---

Created: 2025-10-11
