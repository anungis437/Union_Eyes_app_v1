/**
 * Sidebar component for UnionEyes
 * Provides comprehensive navigation for union stakeholders with role-based access
 * Supports members, stewards, officers, and administrators
 */
"use client";

import { 
  Home, 
  Settings, 
  FileText, 
  Users, 
  Vote, 
  BookOpen, 
  Shield, 
  BarChart3, 
  Mic,
  FileBarChart,
  Bell,
  Scale
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { SelectProfile } from "@/db/schema/profiles-schema";

interface SidebarProps {
  profile: SelectProfile | null;
  userEmail?: string;
  whopMonthlyPlanId: string;
  whopYearlyPlanId: string;
  userRole?: "member" | "steward" | "officer" | "admin"; // Role-based navigation
}

export default function Sidebar({ profile, userEmail, whopMonthlyPlanId, whopYearlyPlanId, userRole = "member" }: SidebarProps) {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;

  // Navigation organized by sections with human-friendly labels
  const navigationSections = [
    {
      title: "Your Union",
      roles: ["member", "steward", "officer", "admin"],
      items: [
        { href: "/dashboard", icon: <Home size={16} />, label: "Home", roles: ["member", "steward", "officer", "admin"] },
        { href: "/dashboard/claims", icon: <FileText size={16} />, label: "My Cases", roles: ["member", "steward", "officer", "admin"] },
        { href: "/dashboard/claims/new", icon: <Mic size={16} />, label: "New Case", roles: ["member", "steward", "officer", "admin"] },
      ]
    },
    {
      title: "Participation",
      roles: ["member", "steward", "officer", "admin"],
      items: [
        { href: "/dashboard/voting", icon: <Vote size={16} />, label: "Vote", roles: ["member", "steward", "officer", "admin"] },
        { href: "/dashboard/agreements", icon: <BookOpen size={16} />, label: "Our Agreements", roles: ["member", "steward", "officer", "admin"] },
      ]
    },
    {
      title: "Representative Tools",
      roles: ["steward", "officer", "admin"],
      items: [
        { href: "/dashboard/workbench", icon: <FileBarChart size={16} />, label: "Case Queue", roles: ["steward", "officer", "admin"] },
        { href: "/dashboard/members", icon: <Users size={16} />, label: "Member Directory", roles: ["steward", "officer", "admin"] },
        { href: "/dashboard/analytics", icon: <BarChart3 size={16} />, label: "Insights", roles: ["steward", "officer", "admin"] },
      ]
    },
    {
      title: "Leadership",
      roles: ["officer", "admin"],
      items: [
        { href: "/dashboard/grievances", icon: <Scale size={16} />, label: "Grievance Process", roles: ["officer", "admin"] },
        { href: "/dashboard/notifications", icon: <Bell size={16} />, label: "Alerts", roles: ["officer", "admin"] },
      ]
    },
    {
      title: "System",
      roles: ["admin"],
      items: [
        { href: "/dashboard/admin", icon: <Shield size={16} />, label: "Admin Panel", roles: ["admin"] },
        { href: "/dashboard/settings", icon: <Settings size={16} />, label: "Preferences", roles: ["member", "steward", "officer", "admin"] },
      ]
    }
  ];

  // Filter sections and items based on user role
  const getVisibleSections = () => {
    return navigationSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.roles.includes(userRole))
      }))
      .filter(section => section.items.length > 0 && section.roles.includes(userRole));
  };

  const visibleSections = getVisibleSections();

  return (
    <div className="h-screen w-[60px] md:w-[220px] bg-white/60 backdrop-blur-xl border-r border-white/40 flex flex-col justify-between py-5 relative overflow-hidden">
        {/* Glassmorphism effects */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none"
          animate={{ 
            opacity: [0.4, 0.6, 0.4],
            background: [
              "linear-gradient(to bottom, rgba(var(--primary), 0.03), transparent, rgba(var(--primary), 0.03))",
              "linear-gradient(to bottom, rgba(var(--primary), 0.05), transparent, rgba(var(--primary), 0.05))",
              "linear-gradient(to bottom, rgba(var(--primary), 0.03), transparent, rgba(var(--primary), 0.03))"
            ]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Enhanced edge highlights for 3D effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-80" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-80" />

        {/* Logo */}
        <div className="px-3 mb-8 relative z-10">
          <Link href="/dashboard">
            <motion.div 
              className="flex items-center justify-center md:justify-start gap-2"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg">
                <Shield size={18} className="text-white" />
              </div>
              <div className="hidden md:block">
                <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">UnionEyes</span>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 relative z-10 overflow-y-auto">
          <div className="space-y-6">
            {visibleSections.map((section, sectionIndex) => (
              <div key={section.title}>
                {/* Section Header */}
                <div className="mb-2 px-3">
                  <h3 className="hidden md:block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="md:hidden h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />
                </div>
                
                {/* Section Items */}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      className="block"
                    >
                      <motion.div 
                        className={`flex items-center py-2.5 px-3 rounded-lg cursor-pointer transition-all ${
                          isActive(item.href) 
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30" 
                            : "text-gray-600 hover:bg-white/80 hover:shadow-sm"
                        }`}
                        whileHover={{ 
                          scale: 1.02, 
                          x: 2,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-center">
                          {item.icon}
                        </div>
                        <span className={`ml-3 hidden md:block text-sm font-medium`}>
                          {item.label}
                        </span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom Section - User Profile */}
        <div className="mt-auto pt-4 relative z-10">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-3" />
          
          {/* User Profile Link */}
          <Link href="/dashboard/profile">
            <motion.div 
              className="flex items-center px-3 py-3 hover:bg-white/70 rounded-lg mx-2 cursor-pointer transition-colors"
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/80 flex items-center justify-center bg-white/80 shadow-sm">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8",
                      userButtonTrigger: "w-8 h-8 rounded-full"
                    }
                  }} 
                />
              </div>
              <div className="hidden md:block ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userEmail?.split('@')[0] || "Member"}
                </p>
                <p className="text-xs text-gray-500">
                  View Profile
                </p>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
  );
} 