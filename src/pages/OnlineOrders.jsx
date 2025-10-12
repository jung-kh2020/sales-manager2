import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { format, formatDistanceToNow, differenceInHours } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ShoppingCart, CheckCircle, XCircle, Clock, AlertTriangle, Filter, Eye, Download, Image as ImageIcon } from 'lucide-react'

const OnlineOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'pending_payment', 'completed', 'cancelled'
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all') // 'all', 'card', 'bank_transfer'
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [statusFilter, paymentTypeFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          products (name, price),
          employees (name, employee_code)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (paymentTypeFilter !== 'all') {
        query = query.eq('payment_type', paymentTypeFilter)
      }

      const { data, error } = await query

      if (error) throw error

      console.log('📦 Orders data:', JSON.stringify(data?.map(o => ({ id: o.id, status: o.status, customer: o.customer_name })), null, 2))
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      alert('주문 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const confirmPayment = async (orderId) => {
    if (!confirm('입금을 확인하셨습니까?\n\n확인 후 주문이 완료 처리됩니다.')) {
      return
    }

    try {
      // Generate payment_id: PAY_ + timestamp
      const paymentId = `PAY_${Date.now()}`

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          payment_id: paymentId,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      alert('입금이 확인되었습니다.')
      fetchOrders()
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('입금 확인 중 오류가 발생했습니다.')
    }
  }

  const cancelOrder = async (orderId) => {
    if (!confirm('주문을 취소하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      alert('주문이 취소되었습니다.')
      fetchOrders()
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('주문 취소 중 오류가 발생했습니다.')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Image download error:', error)
      alert('이미지 다운로드 중 오류가 발생했습니다.')
    }
  }

  const downloadAllImages = async (order) => {
    if (!order.image_urls || order.image_urls.length === 0) {
      alert('다운로드할 이미지가 없습니다.')
      return
    }

    for (let i = 0; i < order.image_urls.length; i++) {
      const url = order.image_urls[i]
      const filename = `order_${order.id}_image_${i + 1}.jpg`
      await downloadImage(url, filename)
      // 다운로드 사이 약간의 딜레이 추가
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    alert(`${order.image_urls.length}개의 이미지 다운로드가 완료되었습니다.`)
  }

  const viewOrderDetail = (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  const getStatusBadge = (status) => {
    console.log('🔍 getStatusBadge called with status:', status, 'type:', typeof status)
    const badges = {
      pending_payment: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        text: '입금 대기'
      },
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: '입금 완료'
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
        text: '주문 취소'
      }
    }

    const badge = badges[status] || badges.pending_payment
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.text}
      </span>
    )
  }

  const getTimeInfo = (createdAt) => {
    const hoursElapsed = differenceInHours(new Date(), new Date(createdAt))
    const isExpired = hoursElapsed >= 24

    return {
      hoursElapsed,
      isExpired,
      timeAgo: formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ko })
    }
  }

  const stats = {
    total: orders.length,
    card: orders.filter(o => o.payment_type === 'card' && o.status === 'completed').length,
    bankTransfer: orders.filter(o => o.payment_type === 'bank_transfer').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    // 추가 통계 (필터링용)
    pending: orders.filter(o => o.status === 'pending_payment').length,
    completed: orders.filter(o => o.status === 'completed').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">전체 주문</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}건</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">💳 카드결제</p>
              <p className="text-2xl font-bold text-blue-600">{stats.card}건</p>
              <p className="text-xs text-gray-500 mt-1">완료된 주문</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">🏦 계좌이체</p>
              <p className="text-2xl font-bold text-green-600">{stats.bankTransfer}건</p>
              <p className="text-xs text-gray-500 mt-1">대기 + 완료</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">주문 취소</p>
              <p className="text-2xl font-bold text-gray-600">{stats.cancelled}건</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        {/* 결제 방식 필터 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">결제 방식</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentTypeFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                paymentTypeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setPaymentTypeFilter('card')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                paymentTypeFilter === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💳 카드결제
            </button>
            <button
              onClick={() => setPaymentTypeFilter('bank_transfer')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                paymentTypeFilter === 'bank_transfer'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏦 계좌이체
            </button>
          </div>
        </div>

        {/* 주문 상태 필터 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">주문 상태</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체 ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('pending_payment')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'pending_payment'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              입금 대기 ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              완료 ({stats.completed})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'cancelled'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              취소 ({stats.cancelled})
            </button>
          </div>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문일시</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사원명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">결제방식</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상호명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">고객명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사진</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                    주문 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const timeInfo = getTimeInfo(order.created_at)
                  const imageCount = order.image_urls?.length || 0

                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}
                        </div>
                        <div className={`text-xs ${timeInfo.isExpired && order.status === 'pending_payment' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {timeInfo.timeAgo}
                          {timeInfo.isExpired && order.status === 'pending_payment' && (
                            <span className="ml-1">⚠️ 24시간 경과</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.employees?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.payment_type === 'card' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            💳 카드결제
                          </span>
                        ) : order.payment_type === 'bank_transfer' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                            🏦 계좌이체
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.business_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer_name}</div>
                        <div className="text-xs text-gray-500">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.products?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.quantity}개
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {imageCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-900 font-medium">{imageCount}개</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-2">
                          {/* 정보 보기 버튼 */}
                          <button
                            onClick={() => viewOrderDetail(order)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium flex items-center gap-1 justify-center"
                          >
                            <Eye className="h-3 w-3" />
                            정보보기
                          </button>

                          {/* 사진 다운로드 버튼 */}
                          {imageCount > 0 && (
                            <button
                              onClick={() => downloadAllImages(order)}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-medium flex items-center gap-1 justify-center"
                            >
                              <Download className="h-3 w-3" />
                              사진({imageCount})
                            </button>
                          )}

                          {/* 입금 확인 / 취소 버튼 (계좌이체만) */}
                          {order.status === 'pending_payment' && order.payment_type === 'bank_transfer' && (
                            <>
                              <button
                                onClick={() => confirmPayment(order.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium"
                              >
                                입금 확인
                              </button>
                              <button
                                onClick={() => cancelOrder(order.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                              >
                                주문 취소
                              </button>
                            </>
                          )}

                          {/* 취소 버튼만 (카드결제 미완료) */}
                          {order.status === 'pending_payment' && order.payment_type === 'card' && (
                            <>
                              <div className="text-xs text-red-600 font-medium mb-1">결제 미완료</div>
                              <button
                                onClick={() => cancelOrder(order.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                              >
                                주문 취소
                              </button>
                            </>
                          )}

                          {order.status === 'completed' && order.payment_date && (
                            <div className="text-xs text-gray-500">
                              {order.payment_type === 'card' ? '결제일' : '입금일'}: {format(new Date(order.payment_date), 'yyyy-MM-dd')}
                            </div>
                          )}
                          {order.status === 'cancelled' && (
                            <span className="text-xs text-gray-500">취소됨</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 안내 사항 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">온라인 주문 처리 안내</h4>

        <div className="mb-3">
          <h5 className="text-sm font-semibold text-blue-900 mb-1">💳 카드결제</h5>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• 토스페이먼츠를 통해 자동으로 결제 승인됩니다</li>
            <li>• 결제 완료 시 자동으로 '완료' 상태로 처리됩니다</li>
            <li>• '입금 대기' 상태로 남아있는 경우는 결제 실패/취소된 주문입니다</li>
            <li>• 결제 미완료 주문은 '주문 취소' 버튼으로 정리할 수 있습니다</li>
          </ul>
        </div>

        <div className="mb-3">
          <h5 className="text-sm font-semibold text-blue-900 mb-1">🏦 계좌이체</h5>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• 고객 주문 시 '입금 대기' 상태로 생성됩니다</li>
            <li>• 실제 입금 확인 후 '입금 확인' 버튼을 클릭하여 완료 처리하세요</li>
            <li>• 24시간 이내 미입금 시 '주문 취소' 버튼으로 취소할 수 있습니다</li>
            <li>• 24시간 경과 주문은 ⚠️ 아이콘으로 표시됩니다</li>
          </ul>
        </div>

        <div>
          <h5 className="text-sm font-semibold text-blue-900 mb-1">기타</h5>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• '완료' 상태의 주문만 매출 통계에 반영됩니다</li>
            <li>• '정보보기' 버튼으로 상세 정보를 확인할 수 있습니다</li>
            <li>• '사진' 버튼으로 고객이 업로드한 이미지를 다운로드할 수 있습니다</li>
          </ul>
        </div>
      </div>

      {/* 주문 상세 정보 모달 */}
      {showDetailModal && selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">주문 상세 정보</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 주문 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">주문 정보</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">주문번호</span>
                    <span className="text-sm font-medium text-gray-900">#{selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">주문일시</span>
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedOrder.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">담당 사원</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedOrder.employees?.name || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상품명</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedOrder.products?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">수량</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.quantity}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">결제금액</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">주문상태</span>
                    <span>{getStatusBadge(selectedOrder.status)}</span>
                  </div>
                </div>
              </div>

              {/* 고객 정보 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">고객 정보</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상호명</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedOrder.business_name || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">이름</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">전화번호</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">이메일</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.customer_email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">네이버 플레이스 주소</span>
                    {selectedOrder.naver_place_address ? (
                      <a
                        href={selectedOrder.naver_place_address}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline break-all"
                      >
                        {selectedOrder.naver_place_address}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 업로드된 이미지 */}
              {selectedOrder.image_urls && selectedOrder.image_urls.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      업로드된 사진 ({selectedOrder.image_urls.length}개)
                    </h3>
                    <button
                      onClick={() => downloadAllImages(selectedOrder)}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      전체 다운로드
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedOrder.image_urls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`주문 이미지 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => downloadImage(url, `order_${selectedOrder.id}_image_${index + 1}.jpg`)}
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-lg transition-all"
                        >
                          <Download className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OnlineOrders
