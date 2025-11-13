"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Users,
  Settings,
  Shield,
  BarChart3,
  Database,
  Mail,
  Building2,
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Activity,
  Download,
  Upload,
  RefreshCw,
  Info,
} from "lucide-react";

type AdminSection =
  | "overview"
  | "users"
  | "locals"
  | "system"
  | "security"
  | "reports"
  | "database";

interface LocalSection {
  id: string;
  number: string;
  name: string;
  region: string;
  memberCount: number;
  activeCount: number;
  president: string;
  contact: string;
  status: "active" | "inactive";
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "lro" | "steward" | "member";
  local: string;
  status: "active" | "inactive";
  lastLogin: string;
}

export default function AdminPage() {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const localSections: LocalSection[] = [
    {
      id: "1",
      number: "301",
      name: "Toronto Central",
      region: "Ontario",
      memberCount: 1234,
      activeCount: 987,
      president: "Sarah Johnson",
      contact: "toronto@union.ca",
      status: "active",
    },
    {
      id: "2",
      number: "302",
      name: "Ottawa Valley",
      region: "Ontario",
      memberCount: 856,
      activeCount: 743,
      president: "Mike Chen",
      contact: "ottawa@union.ca",
      status: "active",
    },
    {
      id: "3",
      number: "401",
      name: "Montreal Metro",
      region: "Quebec",
      memberCount: 2145,
      activeCount: 1876,
      president: "Jean Tremblay",
      contact: "montreal@union.ca",
      status: "active",
    },
    {
      id: "4",
      number: "501",
      name: "Vancouver West",
      region: "British Columbia",
      memberCount: 1567,
      activeCount: 1342,
      president: "Emily Wong",
      contact: "vancouver@union.ca",
      status: "active",
    },
    {
      id: "5",
      number: "601",
      name: "Calgary South",
      region: "Alberta",
      memberCount: 678,
      activeCount: 534,
      president: "David Martinez",
      contact: "calgary@union.ca",
      status: "active",
    },
  ];

  const systemUsers: SystemUser[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.johnson@union.ca",
      role: "lro",
      local: "301 - Toronto Central",
      status: "active",
      lastLogin: "2025-11-13T09:30:00",
    },
    {
      id: "2",
      name: "Mike Chen",
      email: "mike.chen@union.ca",
      role: "lro",
      local: "302 - Ottawa Valley",
      status: "active",
      lastLogin: "2025-11-13T08:15:00",
    },
    {
      id: "3",
      name: "Admin User",
      email: "admin@union.ca",
      role: "admin",
      local: "National",
      status: "active",
      lastLogin: "2025-11-13T10:00:00",
    },
    {
      id: "4",
      name: "Emily Davis",
      email: "emily.davis@union.ca",
      role: "steward",
      local: "301 - Toronto Central",
      status: "active",
      lastLogin: "2025-11-12T16:45:00",
    },
  ];

  const adminSections = [
    {
      id: "overview",
      label: "Overview",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: "users",
      label: "User Management",
      icon: <Users className="w-5 h-5" />,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "locals",
      label: "Local Sections",
      icon: <Building2 className="w-5 h-5" />,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "system",
      label: "System Settings",
      icon: <Settings className="w-5 h-5" />,
      color: "bg-orange-100 text-orange-700",
    },
    {
      id: "security",
      label: "Security",
      icon: <Shield className="w-5 h-5" />,
      color: "bg-red-100 text-red-700",
    },
    {
      id: "reports",
      label: "Reports",
      icon: <FileText className="w-5 h-5" />,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      id: "database",
      label: "Database",
      icon: <Database className="w-5 h-5" />,
      color: "bg-pink-100 text-pink-700",
    },
  ];

  const roleConfig = {
    admin: { label: "Admin", color: "bg-red-100 text-red-700" },
    lro: { label: "LRO", color: "bg-blue-100 text-blue-700" },
    steward: { label: "Steward", color: "bg-green-100 text-green-700" },
    member: { label: "Member", color: "bg-gray-100 text-gray-700" },
  };

  const filteredLocals = localSections.filter(
    (local) =>
      local.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      local.number.includes(searchQuery) ||
      local.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = systemUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Admin Panel
          </h1>
          <p className="text-gray-600">
            System administration and union management
          </p>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {adminSections.map((section) => (
            <motion.button
              key={section.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(section.id as AdminSection)}
              className={`p-4 rounded-lg transition-all ${
                activeSection === section.id
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:shadow-md border border-gray-200"
              }`}
            >
              <div
                className={`flex items-center justify-center mb-2 ${
                  activeSection === section.id ? "" : section.color
                }`}
              >
                {section.icon}
              </div>
              <p className="text-xs font-medium text-center">
                {section.label}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Overview Section */}
        {activeSection === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Members</p>
                    <p className="text-3xl font-bold text-gray-900">6,480</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-green-600 font-medium">
                  +8.2% from last month
                </p>
              </Card>

              <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Local Sections
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {localSections.length}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  All active
                </p>
              </Card>

              <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Cases</p>
                    <p className="text-3xl font-bold text-gray-900">124</p>
                  </div>
                  <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-7 h-7 text-orange-600" />
                  </div>
                </div>
                <p className="text-xs text-orange-600 font-medium">
                  18 require attention
                </p>
              </Card>

              <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      System Health
                    </p>
                    <p className="text-3xl font-bold text-green-600">98.7%</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-7 h-7 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-green-600 font-medium">
                  All systems operational
                </p>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="space-y-3">
                {[
                  {
                    action: "New user registered",
                    user: "John Smith (Member)",
                    local: "301 - Toronto Central",
                    time: "5 minutes ago",
                  },
                  {
                    action: "Local section updated",
                    user: "Admin User",
                    local: "401 - Montreal Metro",
                    time: "1 hour ago",
                  },
                  {
                    action: "System backup completed",
                    user: "System",
                    local: "All locals",
                    time: "2 hours ago",
                  },
                  {
                    action: "Security scan completed",
                    user: "System",
                    local: "National",
                    time: "3 hours ago",
                  },
                ].map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-600">
                        {activity.user} • {activity.local}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* User Management Section */}
        {activeSection === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  User Management
                </h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Role
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Local
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Last Login
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              roleConfig[user.role].color
                            }`}
                          >
                            {roleConfig[user.role].label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {user.local}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Local Sections Management */}
        {activeSection === "locals" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Local Sections
                </h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                  <Plus className="w-4 h-4" />
                  Add Local
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locals by name, number, or region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Locals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLocals.map((local) => (
                  <Card
                    key={local.id}
                    className="p-5 bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            Local {local.number}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              local.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {local.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                          {local.name}
                        </p>
                        <p className="text-xs text-gray-600">{local.region}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Members:</span>
                        <span className="font-semibold text-gray-900">
                          {local.memberCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active Members:</span>
                        <span className="font-semibold text-green-600">
                          {local.activeCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (local.activeCount / local.memberCount) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="text-gray-600 mb-1">President:</p>
                          <p className="font-medium text-gray-900">
                            {local.president}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600 mb-1">Contact:</p>
                          <p className="font-medium text-blue-600">
                            {local.contact}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* System Settings */}
        {activeSection === "system" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                System Settings
              </h2>

              <div className="space-y-6">
                {/* General Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    General
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">
                          Maintenance Mode
                        </p>
                        <p className="text-sm text-gray-600">
                          Temporarily disable public access
                        </p>
                      </div>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">
                          Email Notifications
                        </p>
                        <p className="text-sm text-gray-600">
                          Send system email notifications
                        </p>
                      </div>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">
                          Automatic Backups
                        </p>
                        <p className="text-sm text-gray-600">
                          Daily automated database backups
                        </p>
                      </div>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cache Size</p>
                      <p className="text-2xl font-bold text-gray-900">
                        2.4 GB
                      </p>
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Clear Cache
                      </button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">
                        Database Size
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        18.7 GB
                      </p>
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Optimize
                      </button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">
                        Storage Used
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        45.2 GB
                      </p>
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Placeholder for other sections */}
        {(activeSection === "security" ||
          activeSection === "reports" ||
          activeSection === "database") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {activeSection === "security" && "Security Settings"}
                {activeSection === "reports" && "System Reports"}
                {activeSection === "database" && "Database Management"}
              </h2>
              <p className="text-gray-600">
                This section is under development
              </p>
            </Card>
          </motion.div>
        )}

        {/* Help Section */}
        <Card className="mt-8 p-6 bg-orange-50/80 backdrop-blur-sm border-orange-200">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Admin Guidelines
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>
                  • <strong>User Management:</strong> Add, edit, or deactivate
                  user accounts and assign roles
                </li>
                <li>
                  • <strong>Local Sections:</strong> Manage local section
                  details, membership, and leadership
                </li>
                <li>
                  • <strong>System Settings:</strong> Configure global system
                  preferences and features
                </li>
                <li>
                  • <strong>Security:</strong> Monitor access logs and manage
                  permissions
                </li>
                <li>
                  • <strong>Reports:</strong> Generate and export system-wide
                  analytics
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
