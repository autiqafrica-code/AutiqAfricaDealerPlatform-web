import { useMemo, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { BarChart3, CalendarDays, Car, ChevronDown, ClipboardList, CreditCard, DatabaseBackup, Factory, FileText, FilePlus2, KeyRound, LogOut, Mail, PieChart, Settings2, ListChecks, Tags, BellRing, Shield, ShieldCheck, Smartphone, UserPlus, UserRoundCheck, Users, Wrench, TrendingUp, Clock, WalletCards } from 'lucide-react'
import { ROLE_ACCESS } from '../config/appConfig'
import AppFooter from './AppFooter.jsx'

const allNav = [
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
  { to: '/technician', label: 'Technician', icon: Smartphone, section: 'Workflows' },
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
  const allowed = ROLE_ACCESS[auth.roleCode] || []
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
  const toggleSection = (section) => {
    setOpenSections((current) => {
      const next = new Set(current)
      if (next.has(section)) {
        next.delete(section)
      } else {
        // On mobile (bottom bar), show only one panel at a time to avoid overlap
        if (typeof window !== 'undefined' && window.innerWidth <= 680) return new Set([section])
        next.add(section)
      }
      return next
    })
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brandBlock">
          <img className="sidebarBrandLogo" src="/assets/autiq-logo-white.png" alt="Autiq Africa logo" />
          <div>
            <strong>Autiq Africa</strong>
            <span>Dealer & Workshop</span>
          </div>
        </div>
        <div className="roleBox locked">
          <label>Logged in role</label>
          <strong>{auth.roleName}</strong>
          <span>Only permitted screens are shown.</span>
        </div>
        <nav className="navList compactNavList" aria-label="Logged in workspace menu">
          {Object.entries(groupedNav).map(([section, items]) => {
            const isOpen = openSections.has(section) || items.some((item) => item.to === location.pathname)
            return (
              <div className="navAccordion" key={section}>
                <button className="navAccordionBtn" type="button" onClick={() => toggleSection(section)} aria-expanded={isOpen} aria-label={section} title={section}>
                  <span>{section}</span>
                  <span className="navCount">{items.length}</span>
                  <ChevronDown className={isOpen ? 'chevron open' : 'chevron'} size={16} />
                </button>
                {isOpen && (
                  <div className="navAccordionPanel">
                    {items.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink key={item.to} to={item.to}>
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
          <div className="workspaceHeaderTitleGroup noWorkspaceLogo">
            <h1>{auth.roleName} Workspace</h1>
          </div>
          <div className="workspaceHeaderActions">
            {auth.roleCode === 'FRONT_DESK' && <Link className="softBtn secondaryBtn" to="/tracking">Customer Tracking</Link>}
          </div>
        </header>
        <div className="workspaceContent">
          <Outlet />
        </div>
        <AppFooter compact />
      </main>
    </div>
  )
}
