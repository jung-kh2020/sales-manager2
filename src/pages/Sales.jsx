import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { format } from 'date-fns'
import { Plus, Edit2, Trash2, Filter } from 'lucide-react'

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
        products (name, price, cost)
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

    const submitData = {
      ...formData,
      employee_id: parseInt(formData.employee_id),
      product_id: parseInt(formData.product_id),
      quantity: parseInt(formData.quantity),
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
                    {formatCurrency(sale.products?.price * sale.quantity)}
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
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSale ? '판매 정보 수정' : '신규 판매 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">사원 선택 *</label>
                  <select
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">상품 선택 *</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700">판매일자 *</label>
                  <input
                    type="date"
                    required
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">수량 *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {totalAmount > 0 && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      판매금액: <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">고객명</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">비고</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSale ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales
