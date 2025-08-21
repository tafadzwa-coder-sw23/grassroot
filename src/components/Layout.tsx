import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/lib/createPageUrl";
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  Settings, 
  Activity,
  Zap
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Trading",
    url: "/trading",
    icon: Activity,
  },
  {
    title: "Trading Dashboard",
    url: createPageUrl("TradingDashboard"),
    icon: BarChart3,
  },
  {
    title: "Active Signals",
    url: createPageUrl("ActiveSignals"),
    icon: Target,
  },
  {
    title: "Performance",
    url: createPageUrl("Performance"),
    icon: TrendingUp,
  },
  {
    title: "Backend Setup",
    url: createPageUrl("BackendSetup"),
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }: { children: React.ReactNode; currentPageName?: string }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <style>{`
          :root {
            --primary-dark: #0A1628;
            --primary-blue: #00D4FF;
            --success-green: #10B981;
            --danger-coral: #F87171;
            --text-primary: #1E293B;
            --text-secondary: #64748B;
            --background-card: rgba(255, 255, 255, 0.95);
            --border-subtle: rgba(148, 163, 184, 0.2);
          }
          
          .glass-effect {
            background: var(--background-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-subtle);
          }
          
          .gradient-text {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
        `}</style>
        
        <Sidebar className="border-r border-slate-200/50 glass-effect">
          <SidebarHeader className="border-b border-slate-200/50 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl gradient-text">packgo</h2>
                <p className="text-xs text-slate-500 font-medium">Market Analysis</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-300 
                          rounded-xl mb-1 group relative overflow-hidden
                          ${location.pathname === item.url ? 
                            'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 shadow-sm' : 
                            'text-slate-600'
                          }
                        `}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3 relative z-10">
                          <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-8">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                Market Status
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-slate-600">Markets</span>
                    </div>
                    <span className="text-xs text-green-600 font-semibold">OPEN</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Active Signals</span>
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Success Rate</span>
                    <span className="text-sm font-bold text-green-600">78%</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/50 p-4">
            <div className="glass-effect rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">Trading Mode</p>
                  <p className="text-xs text-slate-500">Manual Execution</p>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold gradient-text">packgo</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
