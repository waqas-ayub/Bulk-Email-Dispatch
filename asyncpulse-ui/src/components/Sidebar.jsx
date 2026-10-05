import {
    LayoutDashboard,
    Mail,
    Webhook,
    BarChart3,
    Settings,
    Zap,
    ChevronRight,
  } from 'lucide-react';
  
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, disabled: true },
    { id: 'bulk-email', label: 'Bulk Email', icon: Mail, active: true },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook, disabled: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, disabled: true },
    { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
  ];
  
  export default function Sidebar() {
    return (
      <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/5 bg-bg-surface/50 backdrop-blur-xl">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-md -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">
                AsyncPulse
              </span>
              <span className="text-[10px] text-white/40 font-medium">
                v0.1.0
              </span>
            </div>
          </div>
        </div>
  
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
              Platform
            </span>
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                className={`
                  group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-200
                  ${
                    item.active
                      ? 'bg-primary/10 text-white border border-primary/20 shadow-sm shadow-primary/10'
                      : item.disabled
                      ? 'text-white/30 cursor-not-allowed'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    item.active ? 'text-primary-hover' : ''
                  }`}
                  strokeWidth={2}
                />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {item.active && (
                  <ChevronRight className="w-3.5 h-3.5 text-primary-hover" />
                )}
                {item.disabled && (
                  <span className="text-[9px] uppercase tracking-wider text-white/25 font-semibold">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>
  
        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="rounded-xl p-3 bg-gradient-to-br from-primary/10 to-info/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-semibold text-white/80">
                All systems operational
              </span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Celery workers and Redis broker are healthy.
            </p>
          </div>
        </div>
      </aside>
    );
  }