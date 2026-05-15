import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Products from './pages/Products';
import AdminDashboard from './pages/AdminDashboard';
import Markets from './pages/Markets';
import Support from './pages/Support';
import Profile from './pages/Profile';
import AdminInvestors from './pages/AdminInvestors';
import AdminProducts from './pages/AdminProducts';
import AdminSupport from './pages/AdminSupport';
import AdminSettings from './pages/AdminSettings';
import NewsAndInsights from './pages/NewsAndInsights';
import AdminInsights from './pages/AdminInsights';
import AdminNAV from './pages/AdminNAV';
import AdminLockIns from './pages/AdminLockIns';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminAudit from './pages/AdminAudit';
import AcceptInvitation from './pages/AcceptInvitation';
import Documents from './pages/Documents';
import AdminDocuments from './pages/AdminDocuments';
import Waitlist from './pages/Waitlist';
import AdminWaitlist from './pages/AdminWaitlist';
import InvestorAuth from './pages/InvestorAuth';
import Legal from './pages/Legal';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Portfolio": Portfolio,
    "Products": Products,
    "AdminDashboard": AdminDashboard,
    "Markets": Markets,
    "Support": Support,
    "Profile": Profile,
    "AdminInvestors": AdminInvestors,
    "AdminProducts": AdminProducts,
    "AdminSupport": AdminSupport,
    "AdminSettings": AdminSettings,
    "NewsAndInsights": NewsAndInsights,
    "AdminInsights": AdminInsights,
    "AdminNAV": AdminNAV,
    "AdminLockIns": AdminLockIns,
    "SuperAdminDashboard": SuperAdminDashboard,
    "AdminAudit": AdminAudit,
    "AcceptInvitation": AcceptInvitation,
    "Documents": Documents,
    "AdminDocuments": AdminDocuments,
    "Waitlist": Waitlist,
    "AdminWaitlist": AdminWaitlist,
    "InvestorAuth": InvestorAuth,
    "Legal": Legal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};