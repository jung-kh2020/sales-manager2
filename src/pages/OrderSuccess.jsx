import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { CheckCircle, Package, Calendar, CreditCard, User, Phone, Mail, MapPin } from 'lucide-react'

const OrderSuccess = () => {
  const [order, setOrder] = useState(null)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orderId = window.location.pathname.split('/')[2]
    if (orderId) {
      fetchOrderDetails(orderId)
    }
  }, [])

  const fetchOrderDetails = async (orderId) => {
    try {
      // 주문 정보 조회
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          products (name, price, image_url)
        `)
        .eq('id', orderId)
        .single()

      if (orderError) {
        throw orderError
      }

      setOrder(orderData)
      setProduct(orderData.products)
    } catch (error) {
      console.error('Error fetching order:', error)
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">주문을 찾을 수 없습니다</h1>
          <p className="text-gray-500">요청하신 주문이 존재하지 않습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">주문 완료</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 성공 메시지 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">주문이 성공적으로 완료되었습니다!</h2>
          <p className="text-gray-600">주문번호: <span className="font-semibold text-blue-600">{order.id}</span></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 주문 정보 */}
          <div className="space-y-6">
            {/* 상품 정보 */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                주문 상품
              </h3>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  {product?.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{product?.name}</h4>
                  <p className="text-sm text-gray-600">수량: {order.quantity}개</p>
                  <p className="text-sm text-gray-600">단가: {formatCurrency(product?.price || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* 결제 정보 */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                결제 정보
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">결제일시</span>
                  <span className="font-semibold">{formatDate(order.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제수단</span>
                  <span className="font-semibold">카드결제</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제금액</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">주문상태</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {order.status === 'completed' ? '완료' : order.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="space-y-6">
            {/* 배송 정보 */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                배송 정보
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <User className="h-4 w-4 text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">받는 사람</p>
                    <p className="font-semibold">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-4 w-4 text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">이메일</p>
                    <p className="font-semibold">{order.customer_email}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-4 w-4 text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">전화번호</p>
                    <p className="font-semibold">{order.customer_phone}</p>
                  </div>
                </div>
                {order.customer_address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">배송주소</p>
                      <p className="font-semibold">{order.customer_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 다음 단계 */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">다음 단계</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• 주문 확인 이메일이 발송되었습니다.</p>
                <p>• 상품 준비 및 배송을 시작합니다.</p>
                <p>• 배송 추적 정보는 이메일로 안내드립니다.</p>
                <p>• 문의사항이 있으시면 고객센터로 연락해주세요.</p>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                주문서 출력
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccess
