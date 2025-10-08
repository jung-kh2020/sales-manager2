import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { format, formatDistanceToNow, differenceInHours } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ShoppingCart, CheckCircle, XCircle, Clock, AlertTriangle, Filter } from 'lucide-react'

const OnlineOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'pending_payment', 'completed', 'cancelled'

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

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
    pending: orders.filter(o => o.status === 'pending_payment').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
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
              <p className="text-sm text-gray-500 mb-1">입금 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}건</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">입금 완료</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}건</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
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
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">주문 상태 필터</h3>
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
            입금 완료 ({stats.completed})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'cancelled'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            주문 취소 ({stats.cancelled})
          </button>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문번호</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문일시</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사원명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">고객명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                  주문 내역이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const timeInfo = getTimeInfo(order.created_at)

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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.status === 'pending_payment' && (
                        <div className="flex gap-2">
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
                        </div>
                      )}
                      {order.status === 'completed' && order.payment_date && (
                        <div className="text-xs text-gray-500">
                          입금일: {format(new Date(order.payment_date), 'yyyy-MM-dd')}
                        </div>
                      )}
                      {order.status === 'cancelled' && (
                        <span className="text-xs text-gray-500">취소됨</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 안내 사항 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">온라인 주문 처리 안내</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 고객이 계좌이체를 선택하면 '입금 대기' 상태로 주문이 생성됩니다</li>
          <li>• 실제 입금 확인 후 '입금 확인' 버튼을 클릭하여 주문을 완료 처리하세요</li>
          <li>• 24시간 이내 미입금 시 '주문 취소' 버튼으로 주문을 취소할 수 있습니다</li>
          <li>• '입금 완료' 상태의 주문만 매출 통계에 반영됩니다</li>
        </ul>
      </div>
    </div>
  )
}

export default OnlineOrders
