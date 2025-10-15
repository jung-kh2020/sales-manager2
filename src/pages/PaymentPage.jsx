import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Package, CreditCard, Building2, Smartphone } from 'lucide-react'

const PaymentPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [tossPayments, setTossPayments] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState('카드')

  // 주문 정보 가져오기 (ProductCatalog에서 전달받음)
  const orderData = location.state?.orderData
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY

  useEffect(() => {
    // 주문 데이터가 없으면 돌려보내기
    if (!orderData) {
      alert('잘못된 접근입니다.')
      navigate(-1)
      return
    }

    // Toss Payments CDN 스크립트 로드 (공식 권장 방식)
    const loadTossPaymentsScript = () => {
      return new Promise((resolve, reject) => {
        // 이미 로드되어 있는지 확인
        if (window.TossPayments) {
          resolve(window.TossPayments)
          return
        }

        // 스크립트 태그 생성
        const script = document.createElement('script')
        script.src = 'https://js.tosspayments.com/v1/payment'
        script.async = true
        script.onload = () => {
          if (window.TossPayments) {
            resolve(window.TossPayments)
          } else {
            reject(new Error('TossPayments 객체를 찾을 수 없습니다.'))
          }
        }
        script.onerror = () => reject(new Error('TossPayments 스크립트 로드 실패'))
        document.head.appendChild(script)
      })
    }

    const initializeTossPayments = async () => {
      try {
        const TossPayments = await loadTossPaymentsScript()
        const tossPaymentsInstance = TossPayments(clientKey)
        setTossPayments(tossPaymentsInstance)
        setLoading(false)
      } catch (err) {
        console.error('TossPayments initialization error:', err)
        alert('결제 모듈을 불러오는 중 오류가 발생했습니다.')
        navigate(-1)
      }
    }

    initializeTossPayments()
  }, [clientKey, orderData, navigate])

  const handlePayment = async () => {
    if (!tossPayments) {
      alert('결제 모듈이 초기화되지 않았습니다.')
      return
    }

    try {
      // 결제 요청
      await tossPayments.requestPayment(selectedMethod, {
        amount: orderData.amount,
        orderId: orderData.orderId,
        orderName: orderData.orderName,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerMobilePhone: orderData.customerPhone,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      })
    } catch (err) {
      console.error('Payment request error:', err)
      if (err.code === 'USER_CANCEL') {
        alert('결제가 취소되었습니다.')
      } else {
        alert('결제 요청 중 오류가 발생했습니다.')
      }
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  if (loading || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">결제 준비 중...</p>
        </div>
      </div>
    )
  }

  const paymentMethods = [
    { id: '카드', name: '신용/체크카드', icon: CreditCard, color: 'blue' },
    { id: '가상계좌', name: '가상계좌', icon: Building2, color: 'green' },
    { id: '계좌이체', name: '실시간 계좌이체', icon: Building2, color: 'purple' },
    { id: '휴대폰', name: '휴대폰 결제', icon: Smartphone, color: 'orange' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">결제하기</h1>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              취소
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 주문 정보 요약 */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">상품명</span>
              <span className="font-semibold">{orderData.orderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">주문자</span>
              <span className="font-semibold">{orderData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">연락처</span>
              <span className="font-semibold">{orderData.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">이메일</span>
              <span className="font-semibold">{orderData.customerEmail}</span>
            </div>
            <div className="flex justify-between border-t pt-3 mt-3">
              <span className="text-lg font-semibold text-gray-700">총 결제금액</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(orderData.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* 결제 수단 선택 */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">결제 수단 선택</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = selectedMethod === method.id
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border-2 transition-all
                    ${isSelected
                      ? `border-${method.color}-600 bg-${method.color}-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isSelected ? `bg-${method.color}-100` : 'bg-gray-100'}
                  `}>
                    <Icon className={`h-5 w-5 ${isSelected ? `text-${method.color}-600` : 'text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${isSelected ? `text-${method.color}-900` : 'text-gray-900'}`}>
                      {method.name}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 결제 정보 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">결제 정보</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <p>• 안전한 결제를 위해 토스페이먼츠 결제 시스템을 사용합니다.</p>
            <p>• 결제 정보는 암호화되어 전송됩니다.</p>
            <p>• 결제 후 취소/환불은 고객센터로 문의해주세요.</p>
          </div>
        </div>

        {/* 결제 버튼 */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {formatCurrency(orderData.amount)} 결제하기
        </button>

        {/* 하단 안내 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            결제 시 개인정보 처리방침 및 이용약관에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage
