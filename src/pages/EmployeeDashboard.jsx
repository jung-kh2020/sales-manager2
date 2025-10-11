import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import {
  TrendingUp,
  DollarSign,
  Package,
  Copy,
  ExternalLink
} from 'lucide-react'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    monthlySales: 0,
    monthlyCommission: 0,
    totalOrders: 0,
    onlineSales: 0,
    offlineSales: 0,
    onlineCount: 0,
    offlineCount: 0,
    thisMonthOrders: []
  })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.employee?.id) {
      fetchEmployeeStats()
      fetchProducts()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('id')

      if (error) throw error

      console.log('📦 Products loaded:', data?.length || 0)
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchEmployeeStats = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const currentYear = new Date().getFullYear()
      const currentMonthNum = new Date().getMonth() + 1
      const nextMonth = currentMonthNum === 12 ? 1 : currentMonthNum + 1
      const nextYear = currentMonthNum === 12 ? currentYear + 1 : currentYear
      const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      console.log('🔍 EmployeeDashboard Debug:')
      console.log('  - employee_id:', user.employee.id)
      console.log('  - employee_code:', user.employee.employee_code)
      console.log('  - currentMonth:', currentMonth)
      console.log('  - Date range:', `${currentMonth}-01 ~ ${nextMonthStr}`)

      // 이번 달 온라인 주문 조회
      const { data: orders, error: ordersError } = await supabase
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
        .lt('created_at', nextMonthStr)

      if (ordersError) {
        console.error('❌ Orders query error:', ordersError)
        throw ordersError
      }

      console.log('📦 Orders found:', orders?.length || 0, orders)

      // 이번 달 오프라인 판매 조회
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          products (
            name,
            price,
            cost
          )
        `)
        .eq('employee_id', user.employee.id)
        .gte('sale_date', `${currentMonth}-01`)
        .lt('sale_date', nextMonthStr)

      if (salesError) {
        console.error('❌ Sales query error:', salesError)
        throw salesError
      }

      console.log('🏪 Sales found:', sales?.length || 0, sales)

      // Null 체크: 데이터가 없으면 빈 배열로 처리
      const ordersData = orders || []
      const salesData = sales || []

      // 완료된 온라인 주문만 필터링 (cancelled 제외)
      const completedOrders = ordersData.filter(order => order.status === 'completed')

      // 온라인 주문 통계 (완료된 주문만)
      const onlineSales = completedOrders.reduce((sum, order) => sum + order.total_amount, 0)

      // 오프라인 판매 통계
      const offlineSales = salesData.reduce((sum, sale) => {
        return sum + (sale.products.price * sale.quantity)
      }, 0)

      // 전체 판매액
      const totalSales = onlineSales + offlineSales

      // 수수료 계산 (CLAUDE.md 명세: 기본 25% + 500만원 초과 시 5%)
      const baseRate = 0.25 // 25%
      const bonusRate = totalSales > 5000000 ? 0.05 : 0 // 500만원 초과 시 +5%
      const totalRate = baseRate + bonusRate
      const monthlyCommission = Math.round(totalSales * totalRate)

      // 통합 주문 내역 생성 (온라인 + 오프라인)
      const combinedOrders = [
        ...ordersData.map(order => ({
          id: `order-${order.id}`,
          type: 'online',
          date: order.created_at,
          productName: order.products.name,
          customerName: order.customer_name,
          quantity: order.quantity,
          amount: order.total_amount,
          status: order.status
        })),
        ...salesData.map(sale => ({
          id: `sale-${sale.id}`,
          type: 'offline',
          date: sale.sale_date,
          productName: sale.products.name,
          customerName: sale.customer_name,
          quantity: sale.quantity,
          amount: sale.products.price * sale.quantity,
          status: 'completed'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

      console.log('📊 Final stats:', {
        totalSales,
        monthlyCommission,
        totalOrders: completedOrders.length + salesData.length,
        onlineSales,
        offlineSales,
        combinedOrders: combinedOrders.length
      })

      setStats({
        monthlySales: totalSales,
        monthlyCommission,
        totalOrders: completedOrders.length + salesData.length,
        onlineSales,
        offlineSales,
        onlineCount: completedOrders.length,
        offlineCount: salesData.length,
        thisMonthOrders: combinedOrders
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
          <div className="flex items-center gap-4">
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
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">이번 달 총 판매액</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.monthlySales)}
                </p>
                <div className="flex gap-2 mt-2 text-xs text-gray-600">
                  <span className="flex items-center">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                    온라인: {formatCurrency(stats.onlineSales)} ({stats.onlineCount}건)
                  </span>
                  <span className="flex items-center">
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
                    오프라인: {formatCurrency(stats.offlineSales)} ({stats.offlineCount}건)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">이번 달 예상 수수료</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthlyCommission)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {stats.monthlySales > 5000000 ? '🎉 보너스 +5% 달성!' : '기본 25%'}
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
              <p className="text-sm font-medium text-gray-500">이번 달 총 건수</p>
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
            <Package className="h-5 w-5 mr-2" />
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
              {products.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  상품 목록을 불러오는 중...
                </div>
              ) : (
                products.map(product => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    <p className="text-lg font-semibold text-blue-600 mt-2">
                      {formatCurrency(product.price)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => copyToClipboard(generateProductUrl(product.id))}
                        className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        복사
                      </button>
                      <a
                        href={generateProductUrl(product.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        바로가기
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 최근 주문 내역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            이번 달 주문 내역
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  구분
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
                  판매금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.thisMonthOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    이번 달 주문 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                stats.thisMonthOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(order.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.type === 'online'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.type === 'online' ? '🌐 온라인' : '🏪 오프라인'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.quantity}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status === 'completed' ? '완료' : order.status === 'cancelled' ? '취소' : '대기'}
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
