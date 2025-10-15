import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 세션 복원
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user.email)
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (email) => {
    try {
      // 먼저 JOIN을 시도
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          employees (
            id,
            name,
            employee_code,
            referral_code,
            phone,
            email
          )
        `)
        .eq('email', email)
        .single()

      if (error && error.message.includes('relationship')) {
        // JOIN 실패 시 fallback: 개별 쿼리
        console.warn('Foreign key relationship not found, using fallback query')

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (userError) throw userError

        let employeeData = null
        if (userData.employee_id) {
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('id, name, employee_code, referral_code, phone, email')
            .eq('id', userData.employee_id)
            .single()

          if (!empError) {
            employeeData = empData
          }
        }

        setUser({
          id: userData.id,
          email: userData.email,
          role: userData.role,
          employee: employeeData,
          isActive: userData.is_active
        })
        return
      }

      if (error) throw error

      setUser({
        id: data.id,
        email: data.email,
        role: data.role,
        employee: data.employees,
        isActive: data.is_active
      })
    } catch (error) {
      console.error('Profile fetch error:', error)
      setUser(null)
    }
  }

  const login = async (email, password) => {
    try {
      setLoading(true)

      // Supabase Auth로 로그인
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // 사용자 프로필 가져오기 및 활성 상태 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_active, role')
        .eq('email', email)
        .single()

      if (userError) {
        await supabase.auth.signOut()
        throw new Error('사용자 정보를 찾을 수 없습니다.')
      }

      // 비활성 계정 차단
      if (!userData.is_active) {
        await supabase.auth.signOut()
        throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.')
      }

      await fetchUserProfile(email)

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.message || '로그인에 실패했습니다.'
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const createEmployeeAccount = async (employeeData, password) => {
    try {
      // 1. 사원 등록
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single()

      if (empError) throw empError

      // 2. 사용자 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employeeData.email,
        password: password,
        options: {
          data: {
            role: 'employee',
            employee_id: employee.id
          }
        }
      })

      if (authError) throw authError

      // 3. users 테이블에 레코드 생성
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          email: employeeData.email,
          password_hash: '', // Supabase Auth가 관리
          role: 'employee',
          employee_id: employee.id,
          is_active: true
        }])

      if (userError) throw userError

      return { success: true, employee }
    } catch (error) {
      console.error('Create employee account error:', error)
      return { 
        success: false, 
        error: error.message || '사원 계정 생성에 실패했습니다.' 
      }
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    createEmployeeAccount,
    isAdmin: user?.role === 'admin',
    isEmployee: user?.role === 'employee'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
