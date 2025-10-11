import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabase'
import { format } from 'date-fns'
import { Plus, Edit2, Trash2, Filter, X } from 'lucide-react'

const Sales = () => {
  const [sales, setSales] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
    productId: '',
  })
  const [formData, setFormData] = useState({
    employee_id: '',
    product_id: '',
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    quantity: 1,
    customer_name: '',
    note: '',
  })

  useEffect(() => {
    fetchSales()
    fetchEmployees()
    fetchProducts()
  }, [])

  useEffect(() => {
    fetchSales()
  }, [filters])

  const fetchSales = async () => {
    let query = supabase
      .from('sales')
      .select(`
        *,
        employees (name),
        products (name)
      `)
      .order('sale_date', { ascending: false })

    if (filters.startDate) {
      query = query.gte('sale_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('sale_date', filters.endDate)
    }
    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId)
    }
    if (filters.productId) {
      query = query.eq('product_id', filters.productId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sales:', error)
    } else {
      setSales(data || [])
    }
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('Error fetching employees:', error)
    } else {
      setEmployees(data || [])
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id')

    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 선택된 제품의 현재 가격/원가 가져오기
    const selectedProduct = products.find(p => p.id === parseInt(formData.product_id))
    if (!selectedProduct) {
      alert('제품을 선택해주세요.')
      return
    }

    const submitData = {
      ...formData,
      employee_id: parseInt(formData.employee_id),
      product_id: parseInt(formData.product_id),
      quantity: parseInt(formData.quantity),
      sale_price: selectedProduct.price,  // 판매 시점의 가격 스냅샷
      sale_cost: selectedProduct.cost,    // 판매 시점의 원가 스냅샷
    }

    if (editingSale) {
      const { error } = await supabase
        .from('sales')
        .update(submitData)
        .eq('id', editingSale.id)

      if (error) {
        alert('판매 정보 수정 실패: ' + error.message)
      } else {
        alert('판매 정보가 수정되었습니다.')
      }
    } else {
      const { error } = await supabase
        .from('sales')
        .insert([submitData])

      if (error) {
        alert('판매 등록 실패: ' + error.message)
      } else {
        alert('판매가 등록되었습니다.')
      }
    }

    resetForm()
    fetchSales()
  }

  const handleEdit = (sale) => {
    setEditingSale(sale)
    setFormData({
      employee_id: sale.employee_id.toString(),
      product_id: sale.product_id.toString(),
      sale_date: sale.sale_date,
      quantity: sale.quantity,
      customer_name: sale.customer_name || '',
      note: sale.note || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('정말로 이 판매 내역을 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)

    if (error) {
      alert('판매 내역 삭제 실패: ' + error.message)
    } else {
      alert('판매 내역이 삭제되었습니다.')
      fetchSales()
    }
  }

  const resetForm = () => {
    setFormData({
      employee_id: '',
      product_id: '',
      sale_date: format(new Date(), 'yyyy-MM-dd'),
      quantity: 1,
      customer_name: '',
      note: '',
    })
    setEditingSale(null)
    setShowModal(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id))
  const totalAmount = selectedProduct ? selectedProduct.price * formData.quantity : 0

  return (
    <div>
      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">필터</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">시작일</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">종료일</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">사원</label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">상품</label>
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {products.map(prod => (
                <option key={prod.id} value={prod.id}>{prod.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            신규 판매 등록
          </button>
        </div>
      </div>

      {/* 판매 목록 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매일자</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사원명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매금액</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">고객명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  판매 내역이 없습니다.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(sale.sale_date), 'yyyy-MM-dd')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.employees?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.products?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(sale.sale_price * sale.quantity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(sale)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 등록/수정 모달 */}
      {showModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
          onClick={resetForm}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '672px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingSale ? '판매 정보 수정' : '신규 판매 등록'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">사원 선택 *</label>
                  <select
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">상품 선택 *</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({formatCurrency(prod.price)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">판매일자 *</label>
                  <input
                    type="date"
                    required
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수량 *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">고객명</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="고객명을 입력하세요"
                  />
                </div>
                {totalAmount > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">판매금액</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows="4"
                    className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="추가 메모사항을 입력하세요"
                  />
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingSale ? '수정 완료' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Sales
