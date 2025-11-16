"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FileText, 
  Mic, 
  Vote, 
  BookOpen, 
  Shield, 
  Users, 
  BarChart3, 
  Scale, 
  Bell, 
  ArrowRight,
  TrendingUp,
  Clock,
  AlertCircle
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { DeadlineWidget } from "@/components/deadlines";
import { useRouter } from "next/navigation";

type UserRole = "member" | "steward" | "officer" | "admin";

// TODO: Fetch actual role from database
const getUserRole = (): UserRole => "admin"; // DEV: Shows all features

interface DashboardStats {
  activeClaims: number;
  pendingReviews: number;
  resolvedCases: number;
  highPriorityClaims: number;
}

interface DeadlineSummary {
  activeDeadlines: number;
  overdueCount: number;
  dueSoonCount: number;
  criticalCount: number;
  avgDaysOverdue: number;
  onTimePercentage: number;
}

interface CriticalDeadline {
  id: string;
  deadlineName: string;
  claimNumber?: string;
  currentDeadline: string;
  isOverdue: boolean;
  daysUntilDue?: number;
  daysOverdue: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  roles: UserRole[];
}

const quickLinks: QuickLink[] = [
  {
    title: "Submit a Case",
    description: "Voice-enabled submission",
    href: "/dashboard/claims/new",
    icon: <Mic size={24} />,
    color: "from-blue-500 to-blue-600",
    roles: ["member", "steward", "officer", "admin"]
  },
  {
    title: "My Cases",
    description: "Track your submissions",
    href: "/dashboard/claims",
    icon: <FileText size={24} />,
    color: "from-green-500 to-green-600",
    roles: ["member", "steward", "officer", "admin"]
  },
  {
    title: "Vote",
    description: "Active union votes",
    href: "/dashboard/voting",
    icon: <Vote size={24} />,
    color: "from-purple-500 to-purple-600",
    roles: ["member", "steward", "officer", "admin"]
  },
  {
    title: "Case Queue",
    description: "Review member cases",
    href: "/dashboard/workbench",
    icon: <Shield size={24} />,
    color: "from-orange-500 to-orange-600",
    roles: ["steward", "officer", "admin"]
  },
  {
    title: "Member Directory",
    description: "Contact members",
    href: "/dashboard/members",
    icon: <Users size={24} />,
    color: "from-cyan-500 to-cyan-600",
    roles: ["steward", "officer", "admin"]
  },
  {
    title: "Analytics",
    description: "Union insights",
    href: "/dashboard/analytics",
    icon: <BarChart3 size={24} />,
    color: "from-indigo-500 to-indigo-600",
    roles: ["steward", "officer", "admin"]
  },
  {
    title: "Grievances",
    description: "Formal processes",
    href: "/dashboard/grievances",
    icon: <Scale size={24} />,
    color: "from-amber-500 to-amber-600",
    roles: ["officer", "admin"]
  },
  {
    title: "Admin Panel",
    description: "System management",
    href: "/dashboard/admin",
    icon: <Shield size={24} />,
    color: "from-red-500 to-red-600",
    roles: ["admin"]
  },
];

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
  roles: UserRole[];
}

const stats: StatCard[] = [
  {
    title: "My Active Cases",
    value: 0,
    change: "+0 this week",
    icon: <FileText size={20} />,
    color: "text-blue-600 bg-blue-100",
    roles: ["member", "steward", "officer", "admin"]
  },
  {
    title: "Pending Reviews",
    value: 0,
    change: "In your queue",
    icon: <Clock size={20} />,
    color: "text-orange-600 bg-orange-100",
    roles: ["steward", "officer", "admin"]
  },
  {
    title: "Active Members",
    value: 0,
    change: "Total members",
    icon: <Users size={20} />,
    color: "text-green-600 bg-green-100",
    roles: ["steward", "officer", "admin"]
  },
  {
    title: "Resolution Rate",
    value: "-",
    change: "Last 30 days",
    icon: <TrendingUp size={20} />,
    color: "text-purple-600 bg-purple-100",
    roles: ["officer", "admin"]
  },
];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const userRole = getUserRole();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeClaims: 0,
    pendingReviews: 0,
    resolvedCases: 0,
    highPriorityClaims: 0,
  });
  const [deadlineSummary, setDeadlineSummary] = useState<DeadlineSummary>({
    activeDeadlines: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    criticalCount: 0,
    avgDaysOverdue: 0,
    onTimePercentage: 0,
  });
  const [criticalDeadlines, setCriticalDeadlines] = useState<CriticalDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(true);
  
  // Fetch real dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setDashboardStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Fetch deadline data
  useEffect(() => {
    const fetchDeadlines = async () => {
      try {
        setIsLoadingDeadlines(true);
        
        // Fetch summary
        const summaryResponse = await fetch('/api/deadlines/dashboard');
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setDeadlineSummary(summaryData);
        }

        // Fetch critical deadlines
        const upcomingResponse = await fetch('/api/deadlines/upcoming');
        if (upcomingResponse.ok) {
          const upcomingData = await upcomingResponse.json();
          setCriticalDeadlines(upcomingData.deadlines || []);
        }
      } catch (error) {
        console.error('Error fetching deadline data:', error);
      } finally {
        setIsLoadingDeadlines(false);
      }
    };

    fetchDeadlines();
  }, []);
  
  // Update stats with real data
  const updatedStats = stats.map(stat => {
    if (stat.title === "My Active Cases") {
      return { ...stat, value: isLoading ? "..." : dashboardStats.activeClaims, change: `${dashboardStats.highPriorityClaims} high priority` };
    } else if (stat.title === "Pending Reviews") {
      return { ...stat, value: isLoading ? "..." : dashboardStats.pendingReviews, change: "In your queue" };
    } else if (stat.title === "Resolution Rate") {
      const total = dashboardStats.activeClaims + dashboardStats.resolvedCases;
      const rate = total > 0 ? Math.round((dashboardStats.resolvedCases / total) * 100) : 0;
      return { ...stat, value: isLoading ? "..." : `${rate}%`, change: "Last 30 days" };
    }
    return stat;
  });
  
  const visibleQuickLinks = quickLinks.filter(link => link.roles.includes(userRole));
  const visibleStats = updatedStats.filter(stat => stat.roles.includes(userRole));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {user?.firstName || "Member"}
        </h1>
        <p className="text-gray-600 text-lg">
          Welcome to your UnionEyes dashboard
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {visibleStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
          >
            <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleQuickLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
            >
              <Link href={link.href}>
                <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${link.color} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      {link.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{link.description}</p>
                    <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                      Go <ArrowRight size={16} className="ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Deadline Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        <DeadlineWidget
          summary={deadlineSummary}
          criticalDeadlines={criticalDeadlines}
          loading={isLoadingDeadlines}
          onViewAll={() => router.push('/deadlines')}
        />
      </motion.div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex p-3 rounded-full bg-gray-100 mb-3">
                  <FileText size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-600">No recent activity</p>
                <p className="text-sm text-gray-500 mt-1">Your actions will appear here</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Important Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} className="text-orange-600" />
                Important Alerts
              </CardTitle>
              <CardDescription>Time-sensitive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex p-3 rounded-full bg-green-100 mb-3">
                  <Bell size={24} className="text-green-600" />
                </div>
                <p className="text-gray-600">All caught up!</p>
                <p className="text-sm text-gray-500 mt-1">No urgent alerts at this time</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Helpful Resources - For Members */}
      {(userRole === "member" || userRole === "steward") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8"
        >
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-600 text-white">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
                  <p className="text-gray-700 mb-4">
                    Our union representatives are here to support you. Submit a case using voice input, 
                    check your agreements, or reach out to your steward for guidance.
                  </p>
                  <div className="flex gap-3">
                    <Link href="/dashboard/claims/new">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Submit a Case
                      </button>
                    </Link>
                    <Link href="/dashboard/agreements">
                      <button className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                        View Agreements
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </main>
  );
} 