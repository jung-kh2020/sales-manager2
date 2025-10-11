import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCost: 0,
    totalMargin: 0,
    totalCommission: 0,
    companyMargin: 0,
    employeeCount: 0,
  })
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('month') // 'day', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [dateFilter, customStartDate, customEndDate])

  const getDateRange = () => {
    const now = new Date()
    let startDate, endDate

    switch (dateFilter) {
      case 'day':
        startDate = format(now, 'yyyy-MM-dd')
        endDate = format(now, 'yyyy-MM-dd')
        break
      case 'week':
        startDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        break
      case 'month':
        startDate = format(startOfMonth(now), 'yyyy-MM-dd')
        endDate = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case 'custom':
        startDate = customStartDate || format(startOfMonth(now), 'yyyy-MM-dd')
        endDate = customEndDate || format(now, 'yyyy-MM-dd')
        break
      default:
        startDate = format(startOfMonth(now), 'yyyy-MM-dd')
        endDate = format(endOfMonth(now), 'yyyy-MM-dd')
    }

    return { startDate, endDate }
  }

  const fetchDashboardData = async () => {
    try {
      const { startDate, endDate } = getDateRange()

      // 선택한 기간의 오프라인 판매 데이터 가져오기 (sales 테이블)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          employees (name)
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)

      if (salesError) throw salesError

      // 선택한 기간의 온라인 주문 데이터 가져오기 (orders 테이블)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          products (price, cost),
          employees (name)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      if (ordersError) throw ordersError

      // 통계 계산
      let totalSales = 0
      let totalCost = 0

      // 오프라인 판매 집계
      salesData?.forEach(sale => {
        const saleAmount = sale.sale_price * sale.quantity
        const costAmount = sale.sale_cost * sale.quantity
        totalSales += saleAmount
        totalCost += costAmount
      })

      // 온라인 주문 집계 (완료된 주문만)
      ordersData
        ?.filter(order => order.status === 'completed')
        .forEach(order => {
          const orderAmount = order.total_amount || (order.products.price * order.quantity)
          const costAmount = order.products.cost * order.quantity
          totalSales += orderAmount
          totalCost += costAmount
        })

      const totalMargin = totalSales - totalCost
      const baseCommission = totalSales * 0.25
      const bonusCommission = totalSales > 5000000 ? totalSales * 0.05 : 0
      const totalCommission = baseCommission + bonusCommission
      const companyMargin = totalMargin - totalCommission

      // 사원 수 가져오기
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      setStats({
        totalSales,
        totalCost,
        totalMargin,
        totalCommission,
        companyMargin,
        employeeCount: employeeCount || 0,
      })

      // 최근 판매 내역 (온라인 + 오프라인 통합, 완료된 주문만)
      const combinedSales = [
        ...(salesData || []).map(sale => ({
          ...sale,
          sale_date: sale.sale_date,
          sale_price: sale.sale_price,  // 오프라인: 저장된 가격 사용
          type: 'offline'
        })),
        ...(ordersData || [])
          .filter(order => order.status === 'completed')  // 완료된 주문만
          .map(order => ({
            id: order.id,
            sale_date: order.created_at?.split('T')[0],
            products: order.products,
            employees: order.employees,
            quantity: order.quantity,
            sale_price: order.total_amount ? order.total_amount / order.quantity : order.products.price,  // 온라인: total_amount 우선
            type: 'online'
          }))
      ].sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))

      setRecentSales(combinedSales.slice(0, 10))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  const statCards = [
    {
      name: '총 매출액',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      name: '총 마진',
      value: formatCurrency(stats.totalMargin),
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: '영업사원 수수료',
      value: formatCurrency(stats.totalCommission),
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      name: '회사 순마진',
      value: formatCurrency(stats.companyMargin),
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      {/* 기간 필터 */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">조회 기간</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* 일/주/월 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setDateFilter('day')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateFilter === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                일
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateFilter === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                주
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateFilter === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateFilter === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                기간설정
              </button>
            </div>

            {/* 커스텀 날짜 선택 */}
            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* 현재 선택된 기간 표시 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            조회 중인 기간: <span className="font-semibold text-gray-900">{getDateRange().startDate}</span> ~ <span className="font-semibold text-gray-900">{getDateRange().endDate}</span>
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.name}
              className="bg-white overflow-hidden shadow-card hover:shadow-card-hover rounded-xl transition-shadow duration-300 border border-gray-100"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 ${item.color} rounded-lg p-3`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        {item.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 최근 판매 내역 */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">최근 판매 내역</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  판매일자
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  구분
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  사원명
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  판매금액
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    판매 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale, index) => (
                  <tr key={`${sale.type}-${sale.id}`} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(sale.sale_date), 'yyyy-MM-dd')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        sale.type === 'online'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.type === 'online' ? '🌐 온라인' : '🏪 오프라인'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.employees?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.products?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.sale_price * sale.quantity)}
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

export default Dashboard
