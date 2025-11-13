import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import BusinessUnitSwitcher from './BusinessUnitSwitcher';

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface UnifiedLayoutProps {
  children: React.ReactNode;
  businessUnitId: string;
  businessUnitName: string;
  businessUnitIcon: React.ComponentType<any>;
  navItems: NavItem[];
  integrations?: string;
}

export default function UnifiedLayout({
  children,
  businessUnitId,
  businessUnitName,
  businessUnitIcon: BusinessUnitIcon,
  navItems,
  integrations,
}: UnifiedLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`w-80 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col shadow-2xl border-r border-slate-700`}>
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BusinessUnitIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">{businessUnitName}</div>
              <div className="text-xs text-slate-300">Nunngisa Law Platform</div>
            </div>
          </div>
          
          {/* Business Unit Switcher */}
          <BusinessUnitSwitcher currentUnit={businessUnitId} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                             (item.path !== '/admin' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' 
                      : 'hover:bg-slate-700/50 text-slate-200 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${
                      isActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'
                    }`} />
                    <span className="text-sm font-medium truncate">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              {integrations && (
                <>
                  <div className="font-medium">Platform Integrations</div>
                  <div className="flex items-center space-x-1 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>{integrations}</span>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Admin v{new Date().getFullYear()}.1
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="min-h-full text-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
}
