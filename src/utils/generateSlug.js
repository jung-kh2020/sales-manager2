/**
 * UUID/Slug 생성 유틸리티
 * 보안 강화를 위한 난수 기반 고유 식별자 생성
 */

/**
 * 랜덤 문자열 생성 (알파벳 대소문자 + 숫자)
 * @param {number} length - 생성할 문자열 길이
 * @returns {string} 랜덤 문자열
 */
export const generateRandomString = (length) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

/**
 * 상품 slug 생성
 * 형식: p_xxxxxxxxxxxx (p_ + 12자리 랜덤)
 * 예: p_a8f3K2m9X1v5
 *
 * @returns {string} 상품 slug
 */
export const generateProductSlug = () => {
  return 'p_' + generateRandomString(12)
}

/**
 * 직원 referral code 생성
 * 형식: REF_xxxxxxxxxx (REF_ + 10자리 랜덤)
 * 예: REF_k2m9X1v5a8
 *
 * @returns {string} referral code
 */
export const generateReferralCode = () => {
  return 'REF_' + generateRandomString(10)
}

/**
 * Slug 유효성 검증
 * @param {string} slug - 검증할 slug
 * @returns {boolean} 유효성 여부
 */
export const isValidProductSlug = (slug) => {
  // p_ + 12자리 알파벳/숫자
  return /^p_[a-zA-Z0-9]{12}$/.test(slug)
}

/**
 * Referral code 유효성 검증
 * @param {string} code - 검증할 referral code
 * @returns {boolean} 유효성 여부
 */
export const isValidReferralCode = (code) => {
  // REF_ + 10자리 알파벳/숫자
  return /^REF_[a-zA-Z0-9]{10}$/.test(code)
}

/**
 * 충돌 방지를 위한 고유 slug 생성 (Supabase 연동)
 * @param {object} supabase - Supabase 클라이언트
 * @param {string} table - 테이블명 ('products' 또는 'employees')
 * @param {string} column - 컬럼명 ('slug' 또는 'referral_code')
 * @param {function} generator - slug 생성 함수
 * @param {number} maxAttempts - 최대 시도 횟수 (기본 10회)
 * @returns {Promise<string>} 고유한 slug
 */
export const generateUniqueSlug = async (
  supabase,
  table,
  column,
  generator,
  maxAttempts = 10
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = generator()

    // 중복 체크
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq(column, slug)
      .maybeSingle()

    if (error) {
      console.error(`Error checking ${column} uniqueness:`, error)
      throw error
    }

    // 중복이 없으면 반환
    if (!data) {
      return slug
    }

    console.warn(`${column} collision detected (${slug}), retrying... (${attempt + 1}/${maxAttempts})`)
  }

  throw new Error(`Failed to generate unique ${column} after ${maxAttempts} attempts`)
}

/**
 * 상품 slug 생성 (중복 체크 포함)
 * @param {object} supabase - Supabase 클라이언트
 * @returns {Promise<string>} 고유한 상품 slug
 */
export const createProductSlug = async (supabase) => {
  return generateUniqueSlug(
    supabase,
    'products',
    'slug',
    generateProductSlug
  )
}

/**
 * 직원 referral code 생성 (중복 체크 포함)
 * @param {object} supabase - Supabase 클라이언트
 * @returns {Promise<string>} 고유한 referral code
 */
export const createReferralCode = async (supabase) => {
  return generateUniqueSlug(
    supabase,
    'employees',
    'referral_code',
    generateReferralCode
  )
}
