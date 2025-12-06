"use client";

import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, X, Bell, Settings, LayoutDashboard, FileText, Vote, BarChart3, Users, MessageSquare, Scale, Library, FileBarChart, Shield, GitCompare, Target } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { SelectProfile } from "@/db/schema/profiles-schema";
import { useLocale } from "next-intl";

interface DashboardNavbarProps {
  profile: SelectProfile | null;
  onMenuClick?: () => void;
}

export default function DashboardNavbar({ profile, onMenuClick }: DashboardNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const [notificationCount] = useState(3); // TODO: Replace with actual notification count
  
  // TODO: Implement proper admin role checking
  const isAdmin = false;
  const isCongressStaff = false; // TODO: Implement congress staff role checking
  const isFederationStaff = false; // TODO: Implement federation staff role checking
  const isOfficer = false; // TODO: Implement officer role checking
  const isSteward = false; // TODO: Implement steward role checking
  const isCrossOrgStaff = isCongressStaff || isFederationStaff;

  // Navigation items based on user role
  const navigationItems = [
    { label: "Dashboard", href: `/${locale}/dashboard`, icon: LayoutDashboard },
    
    // Core features for all users
    ...(!isCrossOrgStaff ? [
      { label: "Claims", href: `/${locale}/dashboard/claims`, icon: FileText },
      { label: "Voting", href: `/${locale}/dashboard/voting`, icon: Vote },
    ] : []),
    
    // Analytics (everyone)
    { label: "Analytics", href: `/${locale}/dashboard/analytics`, icon: BarChart3 },
    
    // Representative tools (steward+)
    ...((isSteward || isOfficer || isAdmin) && !isCrossOrgStaff ? [
      { label: "Workbench", href: `/${locale}/dashboard/workbench`, icon: FileBarChart },
      { label: "Members", href: `/${locale}/dashboard/members`, icon: Users },
    ] : []),
    
    // Leadership tools (officer+)
    ...((isOfficer || isAdmin) && !isCrossOrgStaff ? [
      { label: "Targets", href: `/${locale}/dashboard/targets`, icon: Target },
      { label: "Grievances", href: `/${locale}/dashboard/grievances`, icon: Scale },
    ] : []),
    
    // Cross-organizational tools (congress/federation staff)
    ...(isCrossOrgStaff || isAdmin ? [
      { label: "Cross-Union", href: `/${locale}/dashboard/cross-union-analytics`, icon: GitCompare },
      { label: "Precedents", href: `/${locale}/dashboard/precedents`, icon: Scale },
      { label: "Clauses", href: `/${locale}/dashboard/clause-library`, icon: Library },
      { label: "Affiliates", href: `/${locale}/dashboard/admin/organizations`, icon: Users },
    ] : []),
    
    // Admin only
    ...(isAdmin ? [
      { label: "Admin", href: `/${locale}/dashboard/admin`, icon: Shield },
    ] : []),
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/dashboard`) {
      return pathname === `/${locale}/dashboard`;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Logo + Mobile Menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Logo */}
          <Link href={`/${locale}/dashboard`} className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              UnionEyes
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          {/* Settings (Desktop) */}
          <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
            <Link href={`/${locale}/dashboard/settings`}>
              <Settings className="h-5 w-5" />
            </Link>
          </Button>

          {/* User Menu */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
          />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Mobile Settings Link */}
            <Link
              href={`/${locale}/dashboard/settings`}
              className="flex items-center space-x-3 px-3 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
