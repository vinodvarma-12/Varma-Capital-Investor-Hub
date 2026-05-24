import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  PieChart,
  Package,
  Newspaper,
  MessageSquare,
  UserCircle,
  Settings,
  Users,
  FileText,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  Lock,
  Shield,
  History,
  Lightbulb,
  UserPlus,
  RefreshCw
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Public pages that don't require authentication
const PUBLIC_PAGES = ['InvestorAuth', 'Waitlist', 'Legal', 'AcceptInvitation'];

// Get the dashboard URL based on user role
const getDashboardByRole = (role) => {
  switch (role) {
    case 'super_admin':
      return createPageUrl('SuperAdminDashboard');
    case 'admin':
      return createPageUrl('AdminDashboard');
    default:
      return createPageUrl('Dashboard');
  }
};

export default function Layout({ children, currentPageName }) {
  const { logout, user: authUser, isAuthenticated, loading: authSessionLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') !== 'light'
  );
  const [showCompliancePopup, setShowCompliancePopup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const currentPageNameRef = useRef(currentPageName);

  useEffect(() => {
    currentPageNameRef.current = currentPageName;
  }, [currentPageName]);

  // Disable SEO indexing for all internal pages
  useEffect(() => {
    // Add noindex meta tag
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';

    // Add noindex for Google specifically
    let metaGooglebot = document.querySelector('meta[name="googlebot"]');
    if (!metaGooglebot) {
      metaGooglebot = document.createElement('meta');
      metaGooglebot.name = 'googlebot';
      document.head.appendChild(metaGooglebot);
    }
    metaGooglebot.content = 'noindex, nofollow';
  }, []);

  useEffect(() => {
    const complianceAccepted = sessionStorage.getItem('compliance_accepted');
    if (!complianceAccepted) {
      setShowCompliancePopup(true);
    }
  }, []);

  // Theme tokens live on :root / html.light in index.css; html must carry .dark or .light
  // so body inherits --foreground and Tailwind `dark:` variants match the shell.
  useEffect(() => {
    const el = document.documentElement;
    if (darkMode) {
      el.classList.add("dark");
      el.classList.remove("light");
    } else {
      el.classList.remove("dark");
      el.classList.add("light");
    }
  }, [darkMode]);

  const isPublicPage = PUBLIC_PAGES.some(page => 
    currentPageName === page || currentPageName?.startsWith('Legal')
  );

  // Guest on protected route → login (keeps currentPageName in its own effect so we don't refetch profile on every nav)
  useEffect(() => {
    if (authSessionLoading || isAuthenticated) return;
    setUser(null);
    setAuthChecked(true);
    const onPublic = PUBLIC_PAGES.some(
      (page) => currentPageName === page || currentPageName?.startsWith('Legal')
    );
    if (!onPublic) {
      navigate(createPageUrl("InvestorAuth"));
    }
  }, [authSessionLoading, isAuthenticated, currentPageName, navigate]);

  // Load profile when Supabase session exists / changes (login without full reload left profile stale)
  useEffect(() => {
    if (authSessionLoading || !isAuthenticated) return;

    let cancelled = false;

    (async () => {
      // Only block the UI on first load when we have no user yet
      if (!user) setAuthChecked(false);
      try {
        const userData = await User.me();
        if (cancelled) return;
        setUser(userData);
        // Theme is stored in localStorage, not the DB — don't override it here

        const allowedRoles = ['investor', 'admin', 'super_admin'];
        if (!allowedRoles.includes(userData.role)) {
          console.error("User does not have required role");
          await logout();
          return;
        }

        setAuthChecked(true);
      } catch {
        console.error("User not authenticated");
        if (cancelled) return;
        setAuthChecked(true);
        const onPublic = PUBLIC_PAGES.some(
          (page) =>
            currentPageNameRef.current === page ||
            currentPageNameRef.current?.startsWith('Legal')
        );
        if (!onPublic) {
          navigate(createPageUrl("InvestorAuth"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authSessionLoading, isAuthenticated, authUser?.id, logout, navigate]);

  useEffect(() => {
    if (!user || currentPageName !== 'InvestorAuth') return;
    navigate(getDashboardByRole(user.role));
  }, [user, currentPageName, navigate]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
  };

      const handleAcceptCompliance = () => {
        sessionStorage.setItem('compliance_accepted', 'true');
        setShowCompliancePopup(false);
      };

  // Base investor navigation that everyone can see
  const investorNavItems = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Portfolio", url: createPageUrl("Portfolio"), icon: PieChart },
    { title: "Products", url: createPageUrl("Products"), icon: Package },
    { title: "Markets", url: createPageUrl("Markets"), icon: TrendingUp },
    { title: "Documents", url: createPageUrl("Documents"), icon: FileText },
    { title: "News & Insights", url: createPageUrl("NewsAndInsights"), icon: Newspaper },
    { title: "Support", url: createPageUrl("Support"), icon: MessageSquare },
    { title: "Profile", url: createPageUrl("Profile"), icon: UserCircle },
  ];

  // Admin-only features (in addition to investor features)
  const adminOnlyItems = [
    { title: "Admin Dashboard", url: createPageUrl("AdminDashboard"), icon: LayoutDashboard, divider: true },
    { title: "Manage Investors", url: createPageUrl("AdminInvestors"), icon: Users },
    { title: "Product Management", url: createPageUrl("AdminProducts"), icon: Package },
    { title: "NAV Editor", url: createPageUrl("AdminNAV"), icon: TrendingUp },
    { title: "Document Upload", url: createPageUrl("AdminDocuments"), icon: FileText },
    { title: "Support Queue", url: createPageUrl("AdminSupport"), icon: MessageSquare },
    { title: "Waitlist Management", url: createPageUrl("AdminWaitlist"), icon: UserPlus },
  ];

  // Super Admin-only features (in addition to investor + admin features)
  const superAdminOnlyItems = [
    { title: "Super Admin Dashboard", url: createPageUrl("SuperAdminDashboard"), icon: Shield, divider: true },
    { title: "Lock-in Management", url: createPageUrl("AdminLockIns"), icon: Lock },
    { title: "Insights & Content", url: createPageUrl("AdminInsights"), icon: Lightbulb },
    { title: "System Settings", url: createPageUrl("AdminSettings"), icon: Settings },
    { title: "Audit Logs", url: createPageUrl("AdminAudit"), icon: History },
  ];

  const getNavigationItems = () => {
    let navItems = [...investorNavItems];
    
    // Add admin features for admin and super_admin
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      navItems = [...navItems, ...adminOnlyItems];
    }
    
    // Add super admin features for super_admin only
    if (user?.role === 'super_admin') {
      navItems = [...navItems, ...superAdminOnlyItems];
    }
    
    return navItems;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-red-600 text-white text-xs"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-600 text-white text-xs"><Users className="w-3 h-3 mr-1" />Admin</Badge>;
      default:
        return <Badge className="bg-green-600 text-white text-xs"><UserCircle className="w-3 h-3 mr-1" />Investor</Badge>;
    }
  };

  const navigationItems = getNavigationItems();

  // Show public pages for unauthenticated users
  if (!user && isPublicPage) {
    return children;
  }

  // Full-page loader only on genuine first load — when there is no user yet
  if (!user && !isPublicPage && (!authChecked || authSessionLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-gold-bright animate-spin mx-auto" />
          <div className="text-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
        <>
          <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track {
          background: ${darkMode ? '#0a0a0a' : '#f5f5f4'};
        }
        ::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#b3892266' : '#ccab6c'};
          border-radius: 3px;
        }
      `}</style>

      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar className="border-r border-sidebar-border bg-sidebar">
            <SidebarHeader className="border-b border-sidebar-border p-6">
              <div className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png" 
                  alt="Varma Capital" 
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h2 className="font-bold text-lg text-sidebar-foreground">Varma Capital</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">Investor Portal</p>
                    {getRoleBadge(user.role)}
                  </div>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-2">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <div key={item.title}>
                        {item.divider && (
                          <div className="border-t border-sidebar-border mt-2 px-4 py-2 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {user?.role === 'super_admin' && item.title.includes('Super') ? 'Super Admin' : 
                             user?.role === 'admin' && item.title.includes('Admin') ? 'Admin Tools' : ''}
                          </div>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            asChild 
                            className={`transition-all duration-200 rounded-xl mb-1 ${
                                                              location.pathname === item.url || 
                                                              (item.title === "News & Insights" && currentPageName === "NewsAndInsights") ? 
                                                              'bg-sidebar-accent text-gold-bright dark:text-gold-bright light:bg-[#fedea0]/30 light:text-[#8a6818]' : 
                                                              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-[#fedea0] light:hover:text-[#b38922]'
                                                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </div>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                                          <AvatarFallback className="bg-[#b38922] text-black text-sm font-semibold">
                                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {user.full_name || user.email}
                    </p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {user.role?.replace('_', ' ')} {user.department && `• ${user.department}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleDarkMode}
                    className="flex-1 text-muted-foreground hover:bg-sidebar-accent hover:text-[#fedea0]"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex-1 text-muted-foreground hover:bg-sidebar-accent hover:text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex flex-1 flex-col bg-background">
            <header className="border-b border-border bg-card px-6 py-4 md:hidden">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="rounded-lg p-2 text-foreground transition-colors duration-200 hover:bg-accent" />
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png" 
                  alt="Varma Capital" 
                  className="w-8 h-8 object-contain"
                />
                <h1 className="text-xl font-semibold text-foreground">Varma Capital</h1>
                {getRoleBadge(user.role)}
              </div>
            </header>

            <div className="flex-1 overflow-auto">
                              {children}
                            </div>

                            <footer className="border-t border-border bg-card px-6 py-4 text-center text-sm text-muted-foreground">
                              Varma Capital © 2026 — All Rights Reserved
                            </footer>
                          </main>
                        </div>
                      </SidebarProvider>

                      {/* Compliance Popup */}
                      <Dialog open={showCompliancePopup} onOpenChange={() => {}}>
                        <DialogContent className="max-w-md border-border bg-card" onPointerDownOutside={(e) => e.preventDefault()}>
                          <DialogHeader>
                            <div className="flex justify-center mb-4">
                              <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png" 
                                alt="Varma Capital" 
                                className="w-12 h-12"
                              />
                            </div>
                            <DialogTitle className="text-center text-card-foreground">
                              Important Disclosure
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-4 text-center text-muted-foreground">
                            <p>This portal is for informational purposes only. Past performance is not indicative of future results.</p>
                          </div>
                          <DialogFooter className="sm:justify-center">
                            <Button 
                              onClick={handleAcceptCompliance}
                              className="bg-[#fedea0] px-8 text-black hover:bg-[#ccab6c]"
                            >
                              I Understand
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  );
                }