import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../services/supabase'
import { Plus, Edit2, Trash2, Search, Eye, EyeOff, Key } from 'lucide-react'

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    phone: '',
    email: '',
    hire_date: '',
    status: 'active',
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, statusFilter])

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching employees:', error)
    } else {
      setEmployees(data || [])
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEmployees(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (editingEmployee) {
      // 수정 모드
      const oldStatus = editingEmployee.status
      const newStatus = formData.status

      // 1. 사원 정보 업데이트
      const { error } = await supabase
        .from('employees')
        .update(formData)
        .eq('id', editingEmployee.id)

      if (error) {
        alert('사원 정보 수정 실패: ' + error.message)
        return
      }

      // 2. 상태가 변경되면 users 테이블도 업데이트
      if (oldStatus !== newStatus) {
        const isActive = newStatus === 'active'
        const { error: userError } = await supabase
          .from('users')
          .update({ is_active: isActive })
          .eq('email', formData.email)

        if (userError) {
          console.error('User status update error:', userError)
          alert('사원 정보는 수정되었으나 로그인 상태 변경에 실패했습니다.')
          return
        }

        // 3. 퇴사 처리 시 Supabase Auth에서도 비활성화
        if (!isActive) {
          // 관리자 권한으로 해당 사용자의 세션을 무효화하려면 Supabase Admin API 필요
          // 현재는 is_active 플래그로 로그인 차단
          console.log(`User ${formData.email} has been deactivated`)
        }
      }

      alert('사원 정보가 수정되었습니다.')
    } else {
      // 신규 등록 모드
      if (!formData.email) {
        alert('이메일을 입력해주세요.')
        return
      }

      if (!password || password.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.')
        return
      }

      try {
        // 0. 이메일 중복 체크
        const { data: existingEmployee, error: checkError } = await supabase
          .from('employees')
          .select('email')
          .eq('email', formData.email)
          .maybeSingle()

        if (checkError) throw checkError

        if (existingEmployee) {
          alert('이미 등록된 이메일입니다.')
          return
        }

        // 1. 사원 등록
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .insert([formData])
          .select()
          .single()

        if (empError) throw empError

        // 2. Supabase Auth에 사용자 생성 (signUp 사용)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              role: 'employee',
              employee_id: employee.id,
              name: formData.name
            }
          }
        })

        if (authError) {
          // Auth 생성 실패 시 사원 레코드 롤백
          await supabase.from('employees').delete().eq('id', employee.id)
          throw authError
        }

        // 3. users 테이블에 레코드 생성
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            email: formData.email,
            password_hash: '', // Supabase Auth가 관리
            role: 'employee',
            employee_id: employee.id,
            is_active: true
          }])

        if (userError) {
          // users 생성 실패 시 롤백
          await supabase.from('employees').delete().eq('id', employee.id)
          throw userError
        }

        alert(`✅ 사원이 등록되었습니다.\n\n📧 이메일: ${formData.email}\n🔑 초기 비밀번호: ${password}\n\n⚠️ 등록된 이메일로 확인 링크가 전송되었습니다.\n확인 링크를 클릭하면 로그인할 수 있습니다.`)
      } catch (error) {
        console.error('Employee registration error:', error)
        alert('사원 등록 실패: ' + error.message)
        return
      }
    }

    resetForm()
    fetchEmployees()
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name,
      phone: employee.phone,
      email: employee.email || '',
      hire_date: employee.hire_date || '',
      status: employee.status,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('정말로 이 사원을 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)

    if (error) {
      alert('사원 삭제 실패: ' + error.message)
    } else {
      alert('사원이 삭제되었습니다.')
      fetchEmployees()
    }
  }

  const resetForm = () => {
    setFormData({
      employee_code: '',
      name: '',
      phone: '',
      email: '',
      hire_date: '',
      status: 'active',
    })
    setPassword('')
    setShowPassword(false)
    setEditingEmployee(null)
    setShowModal(false)
  }

  const handlePasswordReset = async (employee) => {
    if (!confirm(`${employee.name}님의 비밀번호를 "123456"으로 초기화하시겠습니까?`)) {
      return
    }

    if (!supabaseAdmin) {
      alert('⚠️ Admin 권한이 설정되지 않았습니다.\n\n.env 파일에 VITE_SUPABASE_SERVICE_ROLE_KEY를 추가해주세요.')
      return
    }

    try {
      // 1. Supabase Auth에서 해당 사용자 찾기
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) throw listError

      const targetUser = users.find(u => u.email === employee.email)

      if (!targetUser) {
        throw new Error('해당 사용자를 찾을 수 없습니다.')
      }

      // 2. 비밀번호를 123456으로 업데이트
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        { password: '123456' }
      )

      if (updateError) throw updateError

      alert(`✅ ${employee.name}님의 비밀번호가 "123456"으로 초기화되었습니다.\n\n사원에게 초기 비밀번호를 안내해주세요.`)
    } catch (error) {
      console.error('Password reset error:', error)
      alert('비밀번호 초기화 실패: ' + error.message)
    }
  }

  return (
    <div>
      {/* 필터 및 검색 */}
      <div className="bg-white p-5 rounded-xl shadow-card mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="사원명 또는 코드로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="all">전체</option>
              <option value="active">재직</option>
              <option value="inactive">퇴사</option>
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            신규 사원 등록
          </button>
        </div>
      </div>

      {/* 사원 목록 테이블 */}
      <div className="bg-white shadow-card rounded-xl overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">사원코드</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">사원명</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">연락처</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">이메일</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">입사일</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  사원이 없습니다.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee, index) => (
                <tr key={employee.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{employee.employee_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.hire_date || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.status === 'active' ? '재직' : '퇴사'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePasswordReset(employee)}
                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="비밀번호 재설정"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">
              {editingEmployee ? '사원 정보 수정' : '신규 사원 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사원 코드 *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사원명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일 {!editingEmployee && '*'}
                  </label>
                  <input
                    type="email"
                    required={!editingEmployee}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={editingEmployee}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder={!editingEmployee ? "로그인에 사용될 이메일" : ""}
                  />
                  {!editingEmployee && (
                    <p className="mt-1 text-xs text-gray-500">로그인 계정으로 사용됩니다</p>
                  )}
                </div>
                {!editingEmployee && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">비밀번호 *</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="최소 6자 이상"
                    />
                    <p className="mt-1 text-xs text-gray-500">로그인 시 사용될 비밀번호</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  >
                    <option value="active">재직</option>
                    <option value="inactive">퇴사</option>
                  </select>
                  {editingEmployee && formData.status === 'inactive' && (
                    <p className="mt-1 text-xs text-red-600">퇴사 처리 시 로그인이 차단됩니다</p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  {editingEmployee ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
