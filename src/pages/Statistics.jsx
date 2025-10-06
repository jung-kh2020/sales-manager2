import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { format, startOfMonth, endOfMonth, subMonths, differenceInMonths } from 'date-fns'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { Calendar } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const Statistics = () => {
  const [period, setPeriod] = useState('6months')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [salesTrend, setSalesTrend] = useState({ labels: [], data: [] })
  const [productStats, setProductStats] = useState({ labels: [], data: [] })
  const [employeeStats, setEmployeeStats] = useState({ labels: [], data: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [period, customStartDate, customEndDate])

  const getDateRange = () => {
    const now = new Date()

    if (period === 'custom') {
      const start = customStartDate || format(subMonths(now, 5), 'yyyy-MM-01')
      const end = customEndDate || format(endOfMonth(now), 'yyyy-MM-dd')
      const monthsDiff = Math.max(1, differenceInMonths(new Date(end), new Date(start)) + 1)

      return {
        startDate: start,
        endDate: end,
        monthsToShow: monthsDiff
      }
    }

    const monthsMap = {
      '1month': 1,
      '3months': 3,
      '6months': 6,
      '12months': 12
    }

    const monthsToShow = monthsMap[period] || 6

    return {
      startDate: format(subMonths(now, monthsToShow - 1), 'yyyy-MM-01'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      monthsToShow
    }
  }

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const { startDate, endDate, monthsToShow } = getDateRange()

      // 판매 데이터 가져오기
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          *,
          products (name, price),
          employees (name)
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)

      if (error) throw error

      // 월별 매출 추이 계산
      const monthlyData = new Map()
      const productData = new Map()
      const employeeData = new Map()

      salesData?.forEach(sale => {
        const month = format(new Date(sale.sale_date), 'yyyy-MM')
        const saleAmount = sale.products.price * sale.quantity

        // 월별 매출
        monthlyData.set(month, (monthlyData.get(month) || 0) + saleAmount)

        // 상품별 매출
        const productName = sale.products.name
        productData.set(productName, (productData.get(productName) || 0) + saleAmount)

        // 사원별 매출
        const employeeName = sale.employees.name
        employeeData.set(employeeName, (employeeData.get(employeeName) || 0) + saleAmount)
      })

      // 월별 매출 추이 데이터 정렬
      const months = []
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const month = format(subMonths(new Date(), i), 'yyyy-MM')
        months.push(month)
      }

      const monthlyValues = months.map(month => monthlyData.get(month) || 0)

      setSalesTrend({
        labels: months.map(m => format(new Date(m + '-01'), 'yyyy년 MM월')),
        data: monthlyValues,
      })

      // 상품별 판매 비율
      setProductStats({
        labels: Array.from(productData.keys()),
        data: Array.from(productData.values()),
      })

      // 사원별 성과
      const sortedEmployees = Array.from(employeeData.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

      setEmployeeStats({
        labels: sortedEmployees.map(([name]) => name),
        data: sortedEmployees.map(([, amount]) => amount),
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
    }).format(value)
  }

  const salesTrendChartData = {
    labels: salesTrend.labels,
    datasets: [
      {
        label: '월별 매출',
        data: salesTrend.data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
    ],
  }

  const salesTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '월별 매출 추이',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return formatCurrency(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return formatCurrency(value)
          }
        }
      }
    }
  }

  const productChartData = {
    labels: productStats.labels,
    datasets: [
      {
        label: '판매 금액',
        data: productStats.data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
      },
    ],
  }

  const productOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: '상품별 판매 비율',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = formatCurrency(context.parsed)
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${label}: ${value} (${percentage}%)`
          }
        }
      }
    },
  }

  const employeeChartData = {
    labels: employeeStats.labels,
    datasets: [
      {
        label: '판매 금액',
        data: employeeStats.data,
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
      },
    ],
  }

  const employeeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '사원별 성과 비교',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return formatCurrency(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return formatCurrency(value)
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 기간 선택 */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">조회 기간</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* 기간 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('1month')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === '1month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1개월
              </button>
              <button
                onClick={() => setPeriod('3months')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === '3months'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                3개월
              </button>
              <button
                onClick={() => setPeriod('6months')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === '6months'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                6개월
              </button>
              <button
                onClick={() => setPeriod('12months')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === '12months'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                12개월
              </button>
              <button
                onClick={() => setPeriod('custom')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                기간설정
              </button>
            </div>

            {/* 커스텀 날짜 선택 */}
            {period === 'custom' && (
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

      {/* 차트 그리드 */}
      <div className="space-y-6">
        {/* 월별 매출 추이 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="h-[400px]">
            <Line data={salesTrendChartData} options={salesTrendOptions} />
          </div>
        </div>

        {/* 상품별 & 사원별 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            {productStats.data.length > 0 ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="w-full max-w-[400px]">
                  <Pie data={productChartData} options={productOptions} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            {employeeStats.data.length > 0 ? (
              <div className="h-[400px]">
                <Bar data={employeeChartData} options={employeeOptions} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 상세 데이터 테이블 */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">상세 데이터</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 상품별 상세 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">상품별 판매 현황</h4>
              <div className="space-y-2">
                {productStats.labels.map((label, index) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(productStats.data[index])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 사원별 상세 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">사원별 판매 현황</h4>
              <div className="space-y-2">
                {employeeStats.labels.map((label, index) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(employeeStats.data[index])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics
