import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { format } from 'date-fns'
import { CheckCircle, Circle, Download } from 'lucide-react'

const Commissions = () => {
  const [commissions, setCommissions] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    calculateCommissions()
  }, [selectedMonth])

  const calculateCommissions = async () => {
    setLoading(true)
    try {
      const monthStart = `${selectedMonth}-01`
      const year = parseInt(selectedMonth.split('-')[0])
      const month = parseInt(selectedMonth.split('-')[1])
      const nextMonth = new Date(year, month, 1)
      const monthEnd = format(new Date(nextMonth - 1), 'yyyy-MM-dd')

      // 해당 월의 오프라인 판매 데이터 가져오기 (sales 테이블)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          employees (id, name, employee_code),
          products (price, cost)
        `)
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd)

      if (salesError) throw salesError

      // 해당 월의 온라인 주문 데이터 가져오기 (orders 테이블)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          employees (id, name, employee_code),
          products (price, cost)
        `)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59')

      if (ordersError) throw ordersError

      // 사원별로 데이터 그룹화
      const employeeMap = new Map()

      // 오프라인 판매 집계
      salesData?.forEach(sale => {
        const empId = sale.employees.id
        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employee: sale.employees,
            sales: [],
            totalSales: 0,
            totalCost: 0,
            salesCount: 0,
          })
        }

        const empData = employeeMap.get(empId)
        const saleAmount = sale.products.price * sale.quantity
        const costAmount = sale.products.cost * sale.quantity

        empData.sales.push(sale)
        empData.totalSales += saleAmount
        empData.totalCost += costAmount
        empData.salesCount += 1
      })

      // 온라인 주문 집계
      ordersData?.forEach(order => {
        // 판매자가 연결된 주문만 처리
        if (order.employees?.id) {
          const empId = order.employees.id
          if (!employeeMap.has(empId)) {
            employeeMap.set(empId, {
              employee: order.employees,
              sales: [],
              totalSales: 0,
              totalCost: 0,
              salesCount: 0,
            })
          }

          const empData = employeeMap.get(empId)
          const orderAmount = order.total_amount || (order.products.price * order.quantity)
          const costAmount = order.products.cost * order.quantity

          empData.sales.push(order)
          empData.totalSales += orderAmount
          empData.totalCost += costAmount
          empData.salesCount += 1
        }
      })

      // 수수료 계산
      const commissionsData = Array.from(employeeMap.values()).map(empData => {
        const baseCommission = empData.totalSales * 0.25
        const bonusCommission = empData.totalSales > 5000000 ? empData.totalSales * 0.05 : 0
        const totalCommission = baseCommission + bonusCommission
        const hasBonus = empData.totalSales > 5000000

        return {
          employee: empData.employee,
          totalSales: empData.totalSales,
          totalCost: empData.totalCost,
          salesCount: empData.salesCount,
          baseCommission,
          bonusCommission,
          totalCommission,
          hasBonus,
          sales: empData.sales,
        }
      })

      // 기존 수수료 지급 정보 가져오기
      const { data: existingCommissions } = await supabase
        .from('commissions')
        .select('*')
        .eq('year_month', selectedMonth)

      // 지급 정보 병합
      const finalCommissions = commissionsData.map(comm => {
        const existing = existingCommissions?.find(ec => ec.employee_id === comm.employee.id)
        return {
          ...comm,
          is_paid: existing?.is_paid || false,
          paid_date: existing?.paid_date || null,
          commission_id: existing?.id || null,
        }
      })

      setCommissions(finalCommissions)
    } catch (error) {
      console.error('Error calculating commissions:', error)
      alert('수수료 계산 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const togglePaidStatus = async (commission) => {
    const newPaidStatus = !commission.is_paid
    const paidDate = newPaidStatus ? format(new Date(), 'yyyy-MM-dd') : null

    try {
      if (commission.commission_id) {
        // 업데이트
        const { error } = await supabase
          .from('commissions')
          .update({
            is_paid: newPaidStatus,
            paid_date: paidDate,
          })
          .eq('id', commission.commission_id)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('commissions')
          .insert([{
            employee_id: commission.employee.id,
            year_month: selectedMonth,
            total_sales: commission.totalSales,
            total_cost: commission.totalCost,
            base_commission: commission.baseCommission,
            bonus_commission: commission.bonusCommission,
            total_commission: commission.totalCommission,
            is_paid: newPaidStatus,
            paid_date: paidDate,
          }])

        if (error) throw error
      }

      calculateCommissions()
    } catch (error) {
      console.error('Error updating paid status:', error)
      alert('지급 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const markAllAsPaid = async () => {
    if (!confirm('모든 수수료를 지급 완료로 처리하시겠습니까?')) return

    const paidDate = format(new Date(), 'yyyy-MM-dd')

    try {
      for (const commission of commissions) {
        if (!commission.is_paid) {
          if (commission.commission_id) {
            await supabase
              .from('commissions')
              .update({
                is_paid: true,
                paid_date: paidDate,
              })
              .eq('id', commission.commission_id)
          } else {
            await supabase
              .from('commissions')
              .insert([{
                employee_id: commission.employee.id,
                year_month: selectedMonth,
                total_sales: commission.totalSales,
                total_cost: commission.totalCost,
                base_commission: commission.baseCommission,
                bonus_commission: commission.bonusCommission,
                total_commission: commission.totalCommission,
                is_paid: true,
                paid_date: paidDate,
              }])
          }
        }
      }

      alert('모든 수수료가 지급 완료로 처리되었습니다.')
      calculateCommissions()
    } catch (error) {
      console.error('Error marking all as paid:', error)
      alert('지급 처리 중 오류가 발생했습니다.')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const totalStats = commissions.reduce(
    (acc, comm) => ({
      totalSales: acc.totalSales + comm.totalSales,
      totalCommission: acc.totalCommission + comm.totalCommission,
      paidCount: acc.paidCount + (comm.is_paid ? 1 : 0),
    }),
    { totalSales: 0, totalCommission: 0, paidCount: 0 }
  )

  return (
    <div>
      {/* 월 선택 및 통계 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">조회 월</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={markAllAsPaid}
            disabled={commissions.length === 0 || totalStats.paidCount === commissions.length}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            전체 지급 처리
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">총 매출액</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(totalStats.totalSales)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">총 수수료</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totalStats.totalCommission)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">지급 완료</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {totalStats.paidCount} / {commissions.length}명
            </p>
          </div>
        </div>
      </div>

      {/* 수수료 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
          <div className="text-gray-500">계산 중...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사원명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">총 판매액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매 건수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">기본 수수료 (25%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">추가 인센티브 (5%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">최종 지급액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">목표 달성</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">지급 상태</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    해당 월에 판매 실적이 없습니다.
                  </td>
                </tr>
              ) : (
                commissions.map((commission, index) => (
                  <tr key={index} className={commission.is_paid ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{commission.employee.name}</div>
                      <div className="text-sm text-gray-500">{commission.employee.employee_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(commission.totalSales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {commission.salesCount}건
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(commission.baseCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {commission.hasBonus ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(commission.bonusCommission)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(commission.totalCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {commission.hasBonus ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          ✅ 목표 달성
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          미달성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => togglePaidStatus(commission)}
                        className="flex items-center gap-2 text-sm"
                      >
                        {commission.is_paid ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-green-600">지급 완료</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600">미지급</span>
                          </>
                        )}
                      </button>
                      {commission.paid_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          {format(new Date(commission.paid_date), 'yyyy-MM-dd')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 수수료 계산 규칙 안내 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">수수료 계산 규칙</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 기본 수수료: 월 총 판매금액의 25%</li>
          <li>• 추가 인센티브: 월 판매금액 5,000,000원 초과 시 총 판매금액의 5% 추가 지급</li>
          <li>• 목표 달성 시 실효 수수료율: 30% (25% + 5%)</li>
        </ul>
      </div>
    </div>
  )
}

export default Commissions
