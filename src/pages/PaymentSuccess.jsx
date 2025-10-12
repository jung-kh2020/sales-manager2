import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { CheckCircle, Package, AlertCircle } from 'lucide-react'

const PaymentSuccess = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orderInfo, setOrderInfo] = useState(null)

  useEffect(() => {
    let isCancelled = false

    const confirmPayment = async () => {
      // URL 파라미터에서 결제 정보 추출
      const paymentKey = searchParams.get('paymentKey')
      const orderId = searchParams.get('orderId')
      const amount = searchParams.get('amount')

      if (!paymentKey || !orderId || !amount) {
        if (!isCancelled) {
          setError('잘못된 결제 정보입니다.')
          setLoading(false)
        }
        return
      }

      // sessionStorage로 중복 처리 방지
      const processedKey = `payment_processed_${orderId}`
      const isProcessing = sessionStorage.getItem(processedKey)

      try {
        // orderId에서 DB id 추출 (ORDER-123-1728754021234 -> 123)
        const orderIdNumber = orderId.replace('ORDER-', '').split('-')[0]

        // 1단계: 먼저 주문 정보 조회 (중복 요청 방지)
        const { data: existingOrder, error: fetchError } = await supabase
          .from('orders')
          .select('*, products(name, price)')
          .eq('id', orderIdNumber)
          .single()

        if (fetchError) {
          throw new Error('주문 정보를 찾을 수 없습니다.')
        }

        // 컴포넌트가 언마운트되었으면 중단
        if (isCancelled) return

        // 이미 결제 완료된 주문인 경우 API 호출 스킵
        // (status가 completed이거나 payment_key가 이미 있는 경우)
        if (existingOrder.status === 'completed' || existingOrder.payment_key) {
          console.log('Already completed order, skipping payment confirmation')
          if (!isCancelled) {
            setOrderInfo(existingOrder)
            setLoading(false)
          }
          return
        }

        // 이미 처리 중인 경우 스킵
        if (isProcessing) {
          console.log('Payment is already being processed, waiting for result...')
          // 잠시 대기 후 다시 DB 조회 (다른 탭에서 처리 중일 수 있음)
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { data: reCheckedOrder } = await supabase
            .from('orders')
            .select('*, products(name, price)')
            .eq('id', orderIdNumber)
            .single()

          if (reCheckedOrder && !isCancelled) {
            setOrderInfo(reCheckedOrder)
            setLoading(false)
          }
          return
        }

        // 처리 시작 표시
        sessionStorage.setItem(processedKey, 'true')

        // 2단계: 결제 승인 API 호출 (미완료 주문만)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const response = await fetch(`${supabaseUrl}/functions/v1/payment-confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
          }),
        })

        // 컴포넌트가 언마운트되었으면 중단
        if (isCancelled) return

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '결제 승인에 실패했습니다.')
        }

        const paymentData = await response.json()

        // 3단계: 주문 상태를 completed로 업데이트
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'completed',
            payment_key: paymentKey,
            payment_method: paymentData.method || 'card',
            payment_date: new Date().toISOString(),
          })
          .eq('id', orderIdNumber)

        if (updateError) throw updateError

        // 업데이트된 주문 정보 다시 조회
        const { data: updatedOrder, error: refetchError } = await supabase
          .from('orders')
          .select('*, products(name, price)')
          .eq('id', orderIdNumber)
          .single()

        if (refetchError) throw refetchError

        // 컴포넌트가 언마운트되지 않았을 때만 상태 업데이트
        if (!isCancelled) {
          setOrderInfo(updatedOrder)
          setLoading(false)
        }

        // 처리 완료 후 sessionStorage 정리 (5초 후)
        setTimeout(() => {
          sessionStorage.removeItem(processedKey)
        }, 5000)
      } catch (err) {
        console.error('Payment confirmation error:', err)
        // 에러 발생 시 sessionStorage 삭제 (재시도 가능하도록)
        sessionStorage.removeItem(processedKey)
        if (!isCancelled) {
          setError(err.message || '결제 처리 중 오류가 발생했습니다.')
          setLoading(false)
        }
      }
    }

    confirmPayment()

    // 클린업 함수: 컴포넌트 언마운트 시 중복 실행 방지
    return () => {
      isCancelled = true
    }
  }, [searchParams])

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
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">결제를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 처리 실패</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            홈으로 이동
          </button>
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
              <h1 className="text-xl font-semibold text-gray-900">결제 완료</h1>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            결제가 성공적으로 완료되었습니다!
          </h2>
          <p className="text-gray-600">
            주문번호: <span className="font-semibold text-blue-600">{orderInfo?.id}</span>
          </p>
        </div>

        {/* 주문 정보 */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            주문 정보
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">상품명</span>
              <span className="font-semibold">{orderInfo?.products?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">수량</span>
              <span className="font-semibold">{orderInfo?.quantity}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">주문자</span>
              <span className="font-semibold">{orderInfo?.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">연락처</span>
              <span className="font-semibold">{orderInfo?.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">이메일</span>
              <span className="font-semibold">{orderInfo?.customer_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">결제일시</span>
              <span className="font-semibold">{formatDate(orderInfo?.payment_date)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 mt-3">
              <span className="text-lg font-semibold text-gray-700">결제금액</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(orderInfo?.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">다음 단계</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• 주문 확인 이메일이 발송되었습니다.</p>
            <p>• 담당 직원이 주문을 확인하고 처리합니다.</p>
            <p>• 진행 상황은 이메일로 안내드립니다.</p>
            <p>• 문의사항이 있으시면 고객센터로 연락해주세요.</p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
          >
            영수증 출력
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess
