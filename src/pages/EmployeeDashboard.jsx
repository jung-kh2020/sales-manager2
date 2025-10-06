import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Copy, 
  ExternalLink,
  Calendar,
  User,
  BarChart3
} from 'lucide-react'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    monthlySales: 0,
    monthlyCommission: 0,
    totalOrders: 0,
    thisMonthOrders: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.employee?.id) {
      fetchEmployeeStats()
    }
  }, [user])

  const fetchEmployeeStats = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      
      // 이번 달 주문 조회
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            name,
            price,
            cost
          )
        `)
        .eq('employee_id', user.employee.id)
        .gte('created_at', `${currentMonth}-01`)
        .lt('created_at', `${currentMonth}-32`)

      if (error) throw error

      // 통계 계산
      const monthlySales = orders.reduce((sum, order) => sum + order.total_amount, 0)
      const monthlyCommission = orders.reduce((sum, order) => {
        const profit = order.total_amount - (order.products.cost * order.quantity)
        return sum + Math.round(profit * 0.1) // 10% 수수료
      }, 0)

      setStats({
        monthlySales,
        monthlyCommission,
        totalOrders: orders.length,
        thisMonthOrders: orders
      })
    } catch (error) {
      console.error('Error fetching employee stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateProductUrl = (productId) => {
    return `${window.location.origin}/product/${productId}?ref=${user.employee.employee_code}`
  }

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
    alert('상품 URL이 클립보드에 복사되었습니다!')
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              안녕하세요, {user.employee.name}님! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              사원번호: {user.employee.employee_code} | 이메일: {user.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">현재 월</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">이번 달 판매액</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthlySales)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">이번 달 수수료</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthlyCommission)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">이번 달 주문수</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalOrders}건
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 상품 링크 관리 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            상품 링크 관리
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            상품 링크를 복사하여 고객에게 전달하세요. 고객이 결제하면 자동으로 실적으로 반영됩니다.
          </p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {/* 상품 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 여기서 상품 목록을 가져와서 표시 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">베이직 플랜</h3>
                <p className="text-sm text-gray-600 mt-1">소상공인을 위한 기본 리뷰 관리 서비스</p>
                <p className="text-lg font-semibold text-blue-600 mt-2">
                  {formatCurrency(210000)}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generateProductUrl(1))}
                    className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    복사
                  </button>
                  <a
                    href={generateProductUrl(1)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              
              {/* 다른 상품들도 동일한 패턴으로 추가 */}
            </div>
          </div>
        </div>
      </div>

      {/* 최근 주문 내역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            이번 달 주문 내역
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.thisMonthOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    이번 달 주문 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                stats.thisMonthOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.products.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.quantity}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status === 'completed' ? '완료' : '대기'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
