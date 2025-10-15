import { Routes, Route } from 'react-router-dom'
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
import PaymentPage from './pages/PaymentPage'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFail from './pages/PaymentFail'

const AppRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Single Routes block - fixes "No routes matched" error
  return (
    <Routes>
      {/* Public routes - no auth required, no layout - MUST be defined first */}
      <Route path="/product/:slug" element={<ProductCatalog />} />
      <Route path="/order-success/:id" element={<OrderSuccess />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/fail" element={<PaymentFail />} />

      {/* Protected routes - auth required, with layout */}
      {user ? (
        <>
          <Route path="/" element={
            <Layout>
              {user.role === 'admin' ? <Dashboard /> : <EmployeeDashboard />}
            </Layout>
          } />
          {user.role === 'admin' && (
            <>
              <Route path="/employees" element={<Layout><Employees /></Layout>} />
              <Route path="/sales" element={<Layout><Sales /></Layout>} />
              <Route path="/online-orders" element={<Layout><OnlineOrders /></Layout>} />
              <Route path="/commissions" element={<Layout><Commissions /></Layout>} />
              <Route path="/statistics" element={<Layout><Statistics /></Layout>} />
              <Route path="/products" element={<Layout><Products /></Layout>} />
            </>
          )}
        </>
      ) : (
        <Route path="*" element={<Login />} />
      )}
    </Routes>
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
