import { useMemo, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { BarChart3, CalendarDays, Car, ChevronDown, ClipboardList, CreditCard, DatabaseBackup, Factory, FileText, FilePlus2, KeyRound, LayoutDashboard, LogOut, Mail, Menu, PieChart, Settings2, ListChecks, Tags, BellRing, Shield, ShieldCheck, Smartphone, UserPlus, UserRoundCheck, Users, Wrench, TrendingUp, Clock, WalletCards, X } from 'lucide-react'
import { roleAccess, roleHome } from '../data/appConfig'
import AppFooter from './AppFooter.jsx'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('autiq_user') || 'null') } catch { return null }
}

const allNav = [
  { to: '/enterprise/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { to: '/enterprise/onboard-client', label: 'Onboard Client', icon: UserPlus, section: 'Setup' },
  { to: '/enterprise/modules', label: 'Client Modules', icon: Settings2, section: 'Setup' },
  { to: '/enterprise/module-functions', label: 'Module Functions', icon: ClipboardList, section: 'Setup' },
  { to: '/enterprise/user-credentials', label: 'User Credentials', icon: KeyRound, section: 'Access' },
  { to: '/enterprise/admin-users', label: 'Admin Users', icon: ShieldCheck, section: 'Access' },
  { to: '/enterprise/onboarding-email', label: 'Onboarding Email', icon: Mail, section: 'Setup' },
  { to: '/enterprise/clients', label: 'All Clients', icon: Shield, section: 'Clients' },
  { to: '/enterprise/login-activity', label: 'Login Activity', icon: Users, section: 'Clients' },
  { to: '/enterprise/revenue', label: 'Client Revenue', icon: PieChart, section: 'Clients' },
  { to: '/enterprise/data-export', label: 'Data Export', icon: DatabaseBackup, section: 'Clients' },
  { to: '/enterprise/service-pricing', label: 'Service Pricing', icon: Tags, section: 'Services' },
  { to: '/enterprise/service-checklists', label: 'Service Checklists', icon: ListChecks, section: 'Services' },
  { to: '/front-desk', label: 'Service Desk', icon: Users, section: 'Front Desk' },
  { to: '/front-desk/add-customer', label: 'Add Customer', icon: UserPlus, section: 'Front Desk' },
  { to: '/front-desk/add-vehicle', label: 'Customer Vehicles', icon: Car, section: 'Front Desk' },
  { to: '/front-desk/create-quotation', label: 'Create Quotation', icon: FilePlus2, section: 'Front Desk' },
  { to: '/front-desk/post-approval-job', label: 'Approved Quotations', icon: ClipboardList, section: 'Front Desk' },
  { to: '/front-desk/reminder-settings', label: 'Approval Reminders', icon: BellRing, section: 'Front Desk' },
  { to: '/tracking', label: 'Customer Tracking', icon: Smartphone, section: 'Front Desk' },
  { to: '/technician', label: 'Technician', icon: Wrench, section: 'Workflows' },
  { to: '/technician/quotation-update', label: 'Tech Quote Update', icon: FileText, section: 'Workflows' },
  { to: '/manager', label: 'Manager', icon: UserRoundCheck, section: 'Workflows' },
  { to: '/workshop', label: 'Workshop', icon: Factory, section: 'Workflows' },
  { to: '/workshop/quotation-update', label: 'Workshop Quote Update', icon: FileText, section: 'Workflows' },
  { to: '/accounts', label: 'Accounts', icon: CreditCard, section: 'Accounts' },
  { to: '/accounts/record-payment', label: 'Record Payment', icon: CreditCard, section: 'Accounts' },
  { to: '/parts', label: 'Parts', icon: Wrench, section: 'Workflows' },
  { to: '/parts/quotation-update', label: 'Parts Quote Update', icon: FileText, section: 'Workflows' },
  { to: '/ceo', label: 'CEO', icon: BarChart3, section: 'Executive' },
  { to: '/jobs', label: 'Job Board', icon: ClipboardList, section: 'Operations' },
  { to: '/calendar', label: 'Appointment Calendar', icon: CalendarDays, section: 'Operations' },
  { to: '/customer-link', label: 'Customer Link', icon: FileText, section: 'Front Desk' },
  { to: '/reports/jobs', label: 'Jobs Created & Completed', icon: Clock, section: 'Reports' },
  { to: '/reports/revenue', label: 'Revenue', icon: TrendingUp, section: 'Reports' },
  { to: '/reports/technician-performance', label: 'Technician Performance', icon: Wrench, section: 'Reports' },
  { to: '/reports/pending-approvals-payments', label: 'Pending Approvals & Payments', icon: WalletCards, section: 'Reports' }
]

export default function Layout({ auth }) {
  const user = useMemo(getStoredUser, [])
  const displayName = user?.workshopName || user?.name || auth.role
  const dashboardPath = roleHome[auth.role] || '/'
  const allowed = roleAccess[auth.role] || []
  const location = useLocation()
  const nav = allNav.filter((item) => allowed.includes(item.to))
  const groupedNav = useMemo(() => nav.reduce((groups, item) => {
    const section = item.section || 'Main'
    if (!groups[section]) groups[section] = []
    groups[section].push(item)
    return groups
  }, {}), [nav])
  const activeSection = nav.find((item) => item.to === location.pathname)?.section || Object.keys(groupedNav)[0]
  const [openSections, setOpenSections] = useState(() => new Set(activeSection ? [activeSection] : []))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggleSection = (section) => {
    setOpenSections((current) => {
      const next = new Set(current)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  return (
    <div className="shell">
      {drawerOpen && (
        <div className="drawerOverlay" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}
      <aside className={`sidebar${drawerOpen ? ' drawerOpen' : ''}`} aria-label="Navigation menu">
        <div className="brandBlock">
          <img className="sidebarBrandLogo" src="/assets/autiq-logo-white.png" alt="Autiq Africa logo" />
          <div>
            <strong>Autiq Africa</strong>
            <span>Dealer &amp; Workshop</span>
          </div>
          <button className="sidebarCloseBtn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <div className="roleBox locked">
          <label>Logged in role</label>
          <strong>{auth.role}</strong>
          <span>Only permitted screens are shown.</span>
        </div>
        <nav className="navList compactNavList" aria-label="Workspace menu">
          {Object.entries(groupedNav).map(([section, items]) => {
            const isOpen = openSections.has(section) || items.some((item) => item.to === location.pathname)
            return (
              <div className="navAccordion" key={section}>
                <button
                  className="navAccordionBtn"
                  type="button"
                  onClick={() => toggleSection(section)}
                  aria-expanded={isOpen}
                  aria-label={section}
                  title={section}
                >
                  <span>{section}</span>
                  <span className="navCount">{items.length}</span>
                  <ChevronDown className={isOpen ? 'chevron open' : 'chevron'} size={16} />
                </button>
                {isOpen && (
                  <div className="navAccordionPanel">
                    {items.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink key={item.to} to={item.to} onClick={() => setDrawerOpen(false)}>
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <button className="ghostBtn" onClick={auth.logout}><LogOut size={18} /> Logout</button>
      </aside>

      <main className="mainArea">
        <header className="topbar workspaceHeader">
          <div className="workspaceHeaderLeft">
            <button
              className="hamburgerBtn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="wsBrandLink" aria-label="Go to home page">
              <img src="/assets/autiq-logo.png" className="wsBrandMark" alt="" aria-hidden="true" />
              <img src="/assets/AutiqAfricaname.png" className="wsBrandName" alt="Autiq Africa" />
            </Link>
          </div>
          <div className="workspaceHeaderRight">
            <span className="wsUserChip">{displayName}</span>
            <Link className="primaryBtn wsHeaderBtn" to={dashboardPath}>Dashboard</Link>
            <button className="wsLogoutBtn" onClick={auth.logout}><LogOut size={15} /><span>Logout</span></button>
          </div>
        </header>
        <div className="workspaceContent">
          <Outlet />
        </div>
        <AppFooter />
      </main>
    </div>
  )
}
