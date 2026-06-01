import { useMemo, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROLE_ACCESS, ROLE_HOME, ROLE_DISPLAY } from './config/appConfig'
import Layout from './components/Layout.jsx'
import Landing from './pages/public/Landing.jsx'
import Features from './pages/public/Features.jsx'
import About from './pages/public/About.jsx'
import Pricing from './pages/public/Pricing.jsx'
import Contact from './pages/public/Contact.jsx'
import Tracking from './pages/public/Tracking.jsx'
import Login from './pages/public/Login.jsx'
import ForgotPassword from './pages/public/ForgotPassword.jsx'
import Kanban from './pages/shared/Kanban.jsx'
import Technician from './pages/technician/Technician.jsx'
import OnboardClient from './pages/enterprise/OnboardClient.jsx'
import ConfigureModules from './pages/enterprise/ConfigureModules.jsx'
import ModuleFunctions from './pages/enterprise/ModuleFunctions.jsx'
import OnboardingEmail from './pages/enterprise/OnboardingEmail.jsx'
import UserCredentials from './pages/enterprise/UserCredentials.jsx'
import AllClients from './pages/enterprise/AllClients.jsx'
import LoginActivity from './pages/enterprise/LoginActivity.jsx'
import Revenue from './pages/enterprise/Revenue.jsx'
import DataExport from './pages/enterprise/DataExport.jsx'
import AdminUsers from './pages/enterprise/AdminUsers.jsx'
import CustomerPortal from './pages/frontdesk/CustomerPortal.jsx'
import Calendar from './pages/shared/Calendar.jsx'
import Reports from './pages/reports/Reports.jsx'
import FrontDesk from './pages/frontdesk/FrontDesk.jsx'
import AddCustomer from './pages/frontdesk/AddCustomer.jsx'
import AddVehicle from './pages/frontdesk/AddVehicle.jsx'
import CreateQuotation from './pages/frontdesk/CreateQuotation.jsx'
import PostApprovalJob from './pages/frontdesk/PostApprovalJob.jsx'
import Manager from './pages/manager/Manager.jsx'
import Workshop from './pages/workshop/Workshop.jsx'
import Accounts from './pages/accounts/Accounts.jsx'
import Parts from './pages/parts/Parts.jsx'
import Ceo from './pages/ceo/Ceo.jsx'
import QuotationUpdate from './pages/shared/QuotationUpdate.jsx'
import RecordPayment from './pages/accounts/RecordPayment.jsx'
import Invoices from './pages/accounts/Invoices.jsx'
import ReminderSettings from './pages/frontdesk/ReminderSettings.jsx'
import ServicePricing from './pages/enterprise/ServicePricing.jsx'
import ServiceChecklists from './pages/enterprise/ServiceChecklists.jsx'

function ProtectedRoute({ auth, children }) {
  const location = useLocation()
  const allowed = ROLE_ACCESS[auth.roleCode] || []
  const path = location.pathname
  if (!auth.isLoggedIn) return <Navigate to="/login" replace />
  if (!allowed.includes(path)) return <Navigate to={ROLE_HOME[auth.roleCode] || '/login'} replace />
  return children
}

export default function App() {
  const [roleCode, setRoleCode]   = useState(localStorage.getItem('autiqRoleCode') || null)
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('autiqLoggedIn') === 'true')
  const navigate = useNavigate()

  const auth = useMemo(() => ({
    roleCode,
    roleName: ROLE_DISPLAY[roleCode] || roleCode || '',
    isLoggedIn,
    login: ({ token, user }) => {
      localStorage.setItem('autiqToken',    token)
      localStorage.setItem('autiqRoleCode', user.roleCode)
      localStorage.setItem('autiqLoggedIn', 'true')
      setRoleCode(user.roleCode)
      setIsLoggedIn(true)
      navigate(ROLE_HOME[user.roleCode] || '/')
    },
    logout: () => {
      localStorage.removeItem('autiqLoggedIn')
      localStorage.removeItem('autiqToken')
      localStorage.removeItem('autiqRoleCode')
      setIsLoggedIn(false)
      setRoleCode(null)
      navigate('/login')
    },
  }), [roleCode, isLoggedIn, navigate])

  const guarded = (page) => <ProtectedRoute auth={auth}>{page}</ProtectedRoute>

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/tracking" element={<Tracking />} />
      <Route path="/login" element={<Login auth={auth} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<Layout auth={auth} />}>
        <Route path="enterprise">
          <Route path="onboard-client" element={guarded(<OnboardClient />)} />
          <Route path="modules" element={guarded(<ConfigureModules />)} />
          <Route path="module-functions" element={guarded(<ModuleFunctions />)} />
          <Route path="user-credentials" element={guarded(<UserCredentials />)} />
          <Route path="onboarding-email" element={guarded(<OnboardingEmail />)} />
          <Route path="clients" element={guarded(<AllClients />)} />
          <Route path="login-activity" element={guarded(<LoginActivity />)} />
          <Route path="revenue" element={guarded(<Revenue />)} />
          <Route path="admin-users" element={guarded(<AdminUsers />)} />
          <Route path="data-export" element={guarded(<DataExport />)} />
          <Route path="service-checklists" element={guarded(<ServiceChecklists />)} />
          <Route path="service-pricing" element={guarded(<ServicePricing />)} />
        </Route>
        <Route path="front-desk" element={guarded(<FrontDesk />)} />
        <Route path="front-desk/add-customer" element={guarded(<AddCustomer />)} />
        <Route path="front-desk/add-vehicle" element={guarded(<AddVehicle />)} />
        <Route path="front-desk/create-quotation" element={guarded(<CreateQuotation />)} />
        <Route path="front-desk/post-approval-job" element={guarded(<PostApprovalJob />)} />
        <Route path="front-desk/reminder-settings" element={guarded(<ReminderSettings />)} />
        <Route path="technician" element={guarded(<Technician />)} />
        <Route path="technician/quotation-update" element={guarded(<QuotationUpdate role="Technician" />)} />
        <Route path="manager" element={guarded(<Manager />)} />
        <Route path="workshop" element={guarded(<Workshop />)} />
        <Route path="workshop/quotation-update" element={guarded(<QuotationUpdate role="Workshop Controller" />)} />
        <Route path="accounts" element={guarded(<Accounts />)} />
        <Route path="accounts/record-payment" element={guarded(<RecordPayment />)} />
        <Route path="accounts/invoices" element={guarded(<Invoices />)} />
        <Route path="parts" element={guarded(<Parts />)} />
        <Route path="parts/quotation-update" element={guarded(<QuotationUpdate role="Parts Interpreter" />)} />
        <Route path="ceo" element={guarded(<Ceo />)} />
        <Route path="jobs" element={guarded(<Kanban />)} />
        <Route path="calendar" element={guarded(<Calendar role={auth.roleName} />)} />
        <Route path="customer-link" element={guarded(<CustomerPortal />)} />
        <Route path="reports" element={guarded(<Navigate to="/reports/jobs" replace />)} />
        <Route path="reports/jobs" element={guarded(<Reports reportType="jobs" />)} />
        <Route path="reports/revenue" element={guarded(<Reports reportType="revenue" />)} />
        <Route path="reports/technician-performance" element={guarded(<Reports reportType="technician" />)} />
        <Route path="reports/pending-approvals-payments" element={guarded(<Reports reportType="pending" />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
