import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingCart, DollarSign, BarChart3, Package, LogOut, ExternalLink, Inbox, Key, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { supabase } from '../services/supabase'

const Layout = ({ children }) => {
  const location = useLocation()
  const { user, logout, isAdmin } = useAuth()

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const adminNavigation = [
    { name: '대시보드', href: '/', icon: LayoutDashboard },
    { name: '사원 관리', href: '/employees', icon: Users },
    { name: '판매 관리', href: '/sales', icon: ShoppingCart },
    { name: '온라인 주문 확인', href: '/online-orders', icon: Inbox },
    { name: '상품 관리', href: '/products', icon: Package },
    { name: '수수료', href: '/commissions', icon: DollarSign },
    { name: '통계', href: '/statistics', icon: BarChart3 },
    { name: '발주사이트', href: 'https://rctorder.bravo6.kr/login?redirectTo=%2Forder', icon: ExternalLink, external: true },
  ]

  const employeeNavigation = [
    { name: '내 대시보드', href: '/', icon: LayoutDashboard },
  ]

  const navigation = isAdmin ? adminNavigation : employeeNavigation

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    if (newPassword.length < 6) {
      alert('새 비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (currentPassword === newPassword) {
      alert('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      alert('✅ 비밀번호가 성공적으로 변경되었습니다.')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change error:', error)
      alert('비밀번호 변경 실패: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-[15vw] min-w-[200px] max-w-[300px] bg-white shadow-sm h-screen border-r border-gray-200 overflow-y-auto flex-shrink-0 relative">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200">
          <div>
            <h1 className="text-base font-bold text-gray-900">리뷰999+</h1>
            <p className="text-xs text-gray-500">관리시스템</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-5 space-y-3">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href

            // 외부 링크인 경우
            if (item.external) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-3 rounded-lg transition-all duration-200 border-2 bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg transition-colors bg-gray-100 group-hover:bg-blue-100">
                      <Icon className="h-4 w-4 transition-colors text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <span className="text-lg font-medium text-gray-700 group-hover:text-blue-600">
                      {item.name}
                    </span>
                  </div>
                </a>
              )
            }

            // 내부 링크
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group block p-3 rounded-lg transition-all duration-200 border-2
                  ${isActive
                    ? 'bg-blue-50 border-blue-500 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`
                    p-1.5 rounded-lg transition-colors
                    ${isActive ? 'bg-blue-600' : 'bg-gray-100 group-hover:bg-blue-100'}
                  `}>
                    <Icon
                      className={`
                        h-4 w-4 transition-colors
                        ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}
                      `}
                    />
                  </div>
                  <span className={`
                    text-lg font-medium
                    ${isActive ? 'text-blue-700' : 'text-gray-700 group-hover:text-blue-600'}
                  `}>
                    {item.name}
                  </span>
                </div>
              </Link>
            )
          })}
        </nav>

               {/* User Info */}
               <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
                 <div className="p-3">
                   <div className="px-2 py-2 bg-gray-50 rounded-lg">
                     <div className="flex items-center justify-between">
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-medium text-gray-900">
                           {user?.employee?.name || '관리자'}
                         </p>
                         <p className="text-xs text-gray-500 truncate">
                           {user?.email}
                         </p>
                         <p className="text-xs text-blue-600">
                           {isAdmin ? '관리자' : '사원'}
                         </p>
                       </div>
                       <button
                         onClick={logout}
                         className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                         title="로그아웃"
                       >
                         <LogOut className="h-4 w-4" />
                       </button>
                     </div>
                   </div>

                   {/* 비밀번호 변경 버튼 */}
                   <button
                     onClick={() => setShowPasswordModal(!showPasswordModal)}
                     className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                   >
                     <Key className="h-4 w-4" />
                     비밀번호 변경
                   </button>

                   {/* 비밀번호 변경 모달 (사이드바 내부에서만 표시) */}
                   {showPasswordModal && (
                     <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                       <h3 className="text-sm font-semibold text-gray-900 mb-3">비밀번호 변경</h3>
                       <form onSubmit={handlePasswordChange}>
                         <div className="space-y-3">
                           <div>
                             <div className="flex items-center justify-between mb-1">
                               <label className="text-xs font-medium text-gray-700">현재 비밀번호 *</label>
                               <button
                                 type="button"
                                 onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                 className="text-gray-400 hover:text-gray-600"
                               >
                                 {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                               </button>
                             </div>
                             <input
                               type={showCurrentPassword ? "text" : "password"}
                               required
                               value={currentPassword}
                               onChange={(e) => setCurrentPassword(e.target.value)}
                               className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               placeholder="현재 비밀번호"
                             />
                           </div>

                           <div>
                             <div className="flex items-center justify-between mb-1">
                               <label className="text-xs font-medium text-gray-700">새 비밀번호 *</label>
                               <button
                                 type="button"
                                 onClick={() => setShowNewPassword(!showNewPassword)}
                                 className="text-gray-400 hover:text-gray-600"
                               >
                                 {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                               </button>
                             </div>
                             <input
                               type={showNewPassword ? "text" : "password"}
                               required
                               value={newPassword}
                               onChange={(e) => setNewPassword(e.target.value)}
                               className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               placeholder="최소 6자 이상"
                             />
                           </div>

                           <div>
                             <div className="flex items-center justify-between mb-1">
                               <label className="text-xs font-medium text-gray-700">새 비밀번호 확인 *</label>
                               <button
                                 type="button"
                                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                 className="text-gray-400 hover:text-gray-600"
                               >
                                 {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                               </button>
                             </div>
                             <input
                               type={showConfirmPassword ? "text" : "password"}
                               required
                               value={confirmPassword}
                               onChange={(e) => setConfirmPassword(e.target.value)}
                               className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               placeholder="새 비밀번호 재입력"
                             />
                           </div>

                           <div className="flex gap-2 pt-2">
                             <button
                               type="button"
                               onClick={() => {
                                 setShowPasswordModal(false)
                                 setCurrentPassword('')
                                 setNewPassword('')
                                 setConfirmPassword('')
                               }}
                               className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                             >
                               취소
                             </button>
                             <button
                               type="submit"
                               className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                             >
                               변경
                             </button>
                           </div>
                         </div>
                       </form>
                     </div>
                   )}
                 </div>
               </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 h-16 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || '대시보드'}
              </h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">시스템 정상</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout