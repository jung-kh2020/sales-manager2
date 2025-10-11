import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { ShoppingCart, CreditCard, Package, Star, CheckCircle, Building2, X, Copy, AlertTriangle, User } from 'lucide-react'

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
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [currentOrder, setCurrentOrder] = useState(null)

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

  const calculateVAT = (amount) => {
    return Math.round(amount * 0.1)
  }

  const calculateTotal = (amount) => {
    return amount + calculateVAT(amount)
  }

  const handleCardPayment = () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      alert('필수 정보를 모두 입력해주세요.')
      return
    }
    alert('카드결제 서비스 준비중입니다.\n\n빠른 시일 내에 오픈 예정입니다. 😊')
  }

  const handleBankTransfer = async () => {
    // 1. 필수 정보 확인
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      alert('필수 정보를 모두 입력해주세요.')
      return
    }

    try {
      // 2. 주문 생성 (입금 대기 상태)
      const orderData = {
        product_id: product.id,
        employee_id: employee?.id || null,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || '',
        quantity: quantity,
        total_amount: product.price * quantity,
        status: 'pending_payment', // 입금 대기
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single()

      if (orderError) throw orderError

      // 3. 주문 정보 저장 및 모달 표시
      setCurrentOrder(order)
      setShowAccountModal(true)
    } catch (error) {
      console.error('Order creation error:', error)
      alert('주문 생성 중 오류가 발생했습니다: ' + error.message)
    }
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
            {/* 판매사원 확인 - 사원 없으면 구매 차단 */}
            {!employee && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-red-900 mb-3">판매사원을 통해 구매해주세요</h3>
                  <p className="text-red-800 mb-6 leading-relaxed">
                    이 상품은 담당 판매사원을 통해서만 구매가 가능합니다.<br />
                    판매사원이 제공한 전용 링크를 통해 접속해주세요.
                  </p>
                  
                </div>
              </div>
            )}

            {/* 사원이 있을 때만 주문 폼 표시 */}
            {employee && (
              <>
                {/* 담당 사원 정보 */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 font-medium">담당 판매사원</p>
                      <p className="text-sm font-bold text-blue-900">{employee.name}</p>
                    </div>
                  </div>
                </div>

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
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">상품금액</span>
                    <span className="text-gray-900">{formatCurrency(product.price * quantity)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">VAT (10%)</span>
                    <span className="text-gray-900">{formatCurrency(calculateVAT(product.price * quantity))}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">총 결제금액</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(calculateTotal(product.price * quantity))}
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

                {/* 결제 방법 선택 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">결제 방법 선택</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleCardPayment}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-sm">카드결제</span>
                    </button>
                    <button
                      onClick={handleBankTransfer}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                      <Building2 className="h-6 w-6" />
                      <span className="text-sm">계좌이체</span>
                    </button>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(calculateTotal(product.price * quantity))}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">(VAT 포함)</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  결제 시 개인정보 처리방침에 동의하는 것으로 간주됩니다.
                </p>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 계좌번호 모달 */}
      {showAccountModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">계좌이체 안내</h2>
              <p className="text-sm text-gray-600 mt-1">아래 계좌로 입금해 주세요</p>
              {currentOrder && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-800">
                    주문번호: <span className="font-bold">#{currentOrder.id}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4 bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">은행</span>
                <span className="font-semibold text-gray-900">농협은행</span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">계좌번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">351-1315-4698-33</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('351-1315-4698-33')
                      alert('계좌번호가 복사되었습니다!')
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">예금주</span>
                <span className="font-semibold text-gray-900">(주)팜링스</span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">입금액</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(calculateTotal(product.price * quantity))}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 leading-relaxed">
                <strong>⚠️ 입금 안내</strong><br />
                1. 위 계좌로 입금해 주세요<br />
                2. 입금자명은 주문 시 입력한 이름 <strong>({customerInfo.name})</strong>과 동일해야 합니다<br />
                3. 입금 확인 후 담당자가 주문을 처리합니다
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 leading-relaxed">
                <strong>🕐 중요</strong><br />
                • 주문 생성 후 <strong>24시간 이내</strong>에 입금해 주세요<br />
                • 24시간 이내 미입금 시 주문이 자동 취소됩니다<br />
                • 입금 후 관리자 확인이 완료되면 주문이 처리됩니다
              </p>
            </div>

            <button
              onClick={() => setShowAccountModal(false)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              확인
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ProductCatalog
