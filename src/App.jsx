import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './components/Login'
import Dashboard from './pages/Dashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Employees from './pages/Employees'
import Sales from './pages/Sales'
import OnlineOrders from './pages/OnlineOrders'
import Commissions from './pages/Commissions'
import Statistics from './pages/Statistics'
import Products from './pages/Products'
import ProductCatalog from './pages/ProductCatalog'
import OrderSuccess from './pages/OrderSuccess'

const AppRoutes = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // 공개 경로 (로그인 없이 접근 가능)
  const publicPaths = ['/product/', '/order-success/']
  const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 공개 페이지는 로그인 없이 접근 가능
  if (isPublicPath) {
    return (
      <Routes>
        <Route path="/product/:id" element={<ProductCatalog />} />
        <Route path="/order-success/:id" element={<OrderSuccess />} />
      </Routes>
    )
  }

  // 보호된 페이지는 로그인 필요
  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={
          user.role === 'admin' ? <Dashboard /> : <EmployeeDashboard />
        } />
        {user.role === 'admin' && (
          <>
            <Route path="/employees" element={<Employees />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/online-orders" element={<OnlineOrders />} />
            <Route path="/commissions" element={<Commissions />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/products" element={<Products />} />
          </>
        )}
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
