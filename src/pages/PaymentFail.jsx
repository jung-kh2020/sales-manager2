import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { XCircle, AlertTriangle } from 'lucide-react'

const PaymentFail = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [errorInfo, setErrorInfo] = useState({
    code: '',
    message: '',
  })

  useEffect(() => {
    // URL 파라미터에서 에러 정보 추출
    const code = searchParams.get('code')
    const message = searchParams.get('message')

    setErrorInfo({
      code: code || 'UNKNOWN_ERROR',
      message: message || '알 수 없는 오류가 발생했습니다.',
    })
  }, [searchParams])

  const getErrorDescription = (code) => {
    const errorDescriptions = {
      'PAY_PROCESS_CANCELED': '사용자가 결제를 취소했습니다.',
      'PAY_PROCESS_ABORTED': '결제 진행 중 오류가 발생했습니다.',
      'REJECT_CARD_COMPANY': '카드사에서 승인을 거부했습니다.',
      'INVALID_CARD_NUMBER': '유효하지 않은 카드번호입니다.',
      'NOT_ENOUGH_BALANCE': '잔액이 부족합니다.',
      'EXCEED_MAX_AMOUNT': '결제 한도를 초과했습니다.',
      'UNKNOWN_ERROR': '알 수 없는 오류가 발생했습니다.',
    }

    return errorDescriptions[code] || errorDescriptions['UNKNOWN_ERROR']
  }

  const handleRetry = () => {
    navigate(-1) // 이전 페이지(결제 페이지)로 돌아가기
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">결제 실패</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 실패 메시지 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h2>
          <p className="text-gray-600">{getErrorDescription(errorInfo.code)}</p>
        </div>

        {/* 에러 상세 정보 */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            오류 정보
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">오류 코드</span>
              <span className="font-mono text-sm font-semibold text-red-600">
                {errorInfo.code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">오류 메시지</span>
              <span className="font-semibold text-gray-900">{errorInfo.message}</span>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">다음 사항을 확인해주세요</h3>
          <div className="space-y-2 text-sm text-yellow-800">
            <p>• 카드 정보가 정확한지 확인해주세요</p>
            <p>• 카드 한도가 충분한지 확인해주세요</p>
            <p>• 인터넷 연결 상태를 확인해주세요</p>
            <p>• 다른 결제 수단을 시도해보세요</p>
            <p>• 문제가 지속되면 카드사나 고객센터로 문의해주세요</p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleGoHome}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
          >
            홈으로 이동
          </button>
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            다시 시도
          </button>
        </div>

        {/* 고객센터 정보 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            결제 문제가 계속되시나요?
          </p>
          <p className="text-sm text-gray-700 font-semibold mt-1">
            고객센터: 1234-5678 (평일 09:00-18:00)
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentFail
