import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingCart, DollarSign, BarChart3, Package, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Layout = ({ children }) => {
  const location = useLocation()
  const { user, logout, isAdmin } = useAuth()

  const adminNavigation = [
    { name: '대시보드', href: '/', icon: LayoutDashboard },
    { name: '사원 관리', href: '/employees', icon: Users },
    { name: '판매 관리', href: '/sales', icon: ShoppingCart },
    { name: '상품 관리', href: '/products', icon: Package },
    { name: '수수료', href: '/commissions', icon: DollarSign },
    { name: '통계', href: '/statistics', icon: BarChart3 },
    { name: '발주사이트', href: 'https://rctorder.bravo6.kr/login?redirectTo=%2Forder', icon: ExternalLink, external: true },
  ]

  const employeeNavigation = [
    { name: '내 대시보드', href: '/', icon: LayoutDashboard },
  ]

  const navigation = isAdmin ? adminNavigation : employeeNavigation

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-[15vw] min-w-[200px] max-w-[300px] bg-white shadow-sm h-screen border-r border-gray-200 overflow-y-auto flex-shrink-0">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200">
          <div>
            <h1 className="text-base font-bold text-gray-900">영업관리</h1>
            <p className="text-xs text-gray-500">Sales Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
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
               <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-white">
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