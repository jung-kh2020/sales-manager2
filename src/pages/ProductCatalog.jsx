import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { ShoppingCart, CreditCard, Package, Star, CheckCircle } from 'lucide-react'

const ProductCatalog = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [product, setProduct] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    const productId = window.location.pathname.split('/')[2]
    if (productId) {
      fetchProduct(productId)
    }
  }, [])

  const fetchProduct = async (productId) => {
    try {
      // 상품 정보 가져오기
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (productError) throw productError

      setProduct(productData)

      // 판매자 정보 가져오기 (URL 파라미터에서)
      const refCode = searchParams.get('ref')
      if (refCode) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_code', refCode)
          .single()

        if (!employeeError && employeeData) {
          setEmployee(employeeData)
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const handlePayment = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      alert('필수 정보를 모두 입력해주세요.')
      return
    }

    // 실제 결제 시스템 연동 (예: 토스페이먼츠, 아임포트 등)
    // 여기서는 시뮬레이션으로 처리
    try {
      // 1. 주문 생성
      const orderData = {
        product_id: product.id,
        employee_id: employee?.id || null, // 판매자 정보
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        quantity: quantity,
        total_amount: product.price * quantity,
        status: 'pending'
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single()

      if (orderError) {
        throw orderError
      }

      // 2. 결제 처리 (실제로는 결제 API 호출)
      const paymentResult = await processPayment({
        orderId: order.id,
        amount: product.price * quantity,
        customerInfo
      })

      if (paymentResult.success) {
        // 3. 주문 상태 업데이트
        await supabase
          .from('orders')
          .update({ 
            status: 'completed',
            payment_id: paymentResult.paymentId,
            payment_date: new Date().toISOString()
          })
          .eq('id', order.id)

        // 4. 재고 업데이트는 제거됨 (재고 관리 없음)

        alert('결제가 완료되었습니다! 주문번호: ' + order.id)
        
        // 결제 완료 후 리다이렉트 또는 성공 페이지 표시
        window.location.href = `/order-success/${order.id}`
      } else {
        throw new Error('결제 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('결제 처리 중 오류가 발생했습니다: ' + error.message)
    }
  }

  const processPayment = async (paymentData) => {
    // 실제 결제 API 연동 부분
    // 예: 토스페이먼츠, 아임포트, 스트라이프 등
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: 'PAY_' + Date.now()
        })
      }, 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">상품을 찾을 수 없습니다</h1>
          <p className="text-gray-500">요청하신 상품이 존재하지 않거나 판매 중단되었습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">상품 구매</h1>
            </div>
            <div className="text-sm text-gray-500">
              안전한 온라인 결제
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 상품 정보 */}
          <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
            <div className="h-96 bg-gray-100 flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-24 w-24 text-gray-400" />
              )}
            </div>
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-gray-600 mb-4">{product.description}</p>
              )}
              {product.introduction && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">상품 소개</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.introduction}</p>
                  </div>
                </div>
              )}
              {product.features && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">주요 기능</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.features}</p>
                  </div>
                </div>
              )}
              {product.specifications && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">제품 사양</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.specifications}</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">판매가격</span>
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(product.price)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 주문 폼 */}
          <div className="space-y-6">
            {/* 수량 선택 */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">수량을 선택해주세요</p>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">총 결제금액</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(product.price * quantity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 고객 정보 */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">배송 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    type="text"
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                  <input
                    type="email"
                    required
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호 *</label>
                  <input
                    type="tel"
                    required
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배송주소</label>
                  <textarea
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="서울시 강남구 테헤란로 123"
                  />
                </div>
              </div>
            </div>

            {/* 결제 버튼 */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>SSL 보안 결제</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>개인정보 보호</span>
                </div>
                <button
                  onClick={handlePayment}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                >
                  <CreditCard className="h-5 w-5" />
                  {formatCurrency(product.price * quantity)} 결제하기
                </button>
                <p className="text-xs text-gray-500 text-center">
                  결제 시 개인정보 처리방침에 동의하는 것으로 간주됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCatalog
