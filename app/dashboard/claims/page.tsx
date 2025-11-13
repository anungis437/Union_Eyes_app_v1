"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Calendar,
  User,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type CaseStatus = "pending" | "in-review" | "approved" | "rejected" | "resolved";
type CasePriority = "low" | "medium" | "high" | "urgent";

interface Case {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  category: string;
  submittedDate: string;
  lastUpdate: string;
  assignedTo?: string;
  notes?: string;
}

// Mock data - TODO: Replace with actual data from database
const mockCases: Case[] = [
  {
    id: "CASE-001",
    title: "Overtime Pay Dispute",
    description: "Requesting review of unpaid overtime hours for March 2025",
    status: "in-review",
    priority: "high",
    category: "Wage & Hour",
    submittedDate: "2025-11-10",
    lastUpdate: "2025-11-12",
    assignedTo: "Sarah Johnson (Steward)",
    notes: "Steward reviewing timesheets"
  },
  {
    id: "CASE-002",
    title: "Workplace Safety Concern",
    description: "Equipment malfunction in section B needs immediate attention",
    status: "pending",
    priority: "urgent",
    category: "Safety",
    submittedDate: "2025-11-13",
    lastUpdate: "2025-11-13",
  },
  {
    id: "CASE-003",
    title: "Schedule Change Request",
    description: "Requesting shift modification due to family circumstances",
    status: "approved",
    priority: "medium",
    category: "Scheduling",
    submittedDate: "2025-11-05",
    lastUpdate: "2025-11-08",
    assignedTo: "Mike Chen (Steward)",
    notes: "Approved for next month"
  },
];

const statusConfig = {
  pending: { 
    label: "Pending", 
    icon: <Clock size={16} />, 
    color: "text-yellow-700 bg-yellow-100 border-yellow-200",
    dotColor: "bg-yellow-500"
  },
  "in-review": { 
    label: "In Review", 
    icon: <AlertCircle size={16} />, 
    color: "text-blue-700 bg-blue-100 border-blue-200",
    dotColor: "bg-blue-500"
  },
  approved: { 
    label: "Approved", 
    icon: <CheckCircle size={16} />, 
    color: "text-green-700 bg-green-100 border-green-200",
    dotColor: "bg-green-500"
  },
  rejected: { 
    label: "Rejected", 
    icon: <XCircle size={16} />, 
    color: "text-red-700 bg-red-100 border-red-200",
    dotColor: "bg-red-500"
  },
  resolved: { 
    label: "Resolved", 
    icon: <CheckCircle size={16} />, 
    color: "text-gray-700 bg-gray-100 border-gray-200",
    dotColor: "bg-gray-500"
  },
};

const priorityConfig = {
  low: { label: "Low", color: "text-gray-600" },
  medium: { label: "Medium", color: "text-blue-600" },
  high: { label: "High", color: "text-orange-600" },
  urgent: { label: "Urgent", color: "text-red-600" },
};

export default function ClaimsPage() {
  const [cases] = useState<Case[]>(mockCases);
  const [selectedFilter, setSelectedFilter] = useState<"all" | CaseStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const filteredCases = cases.filter(c => {
    const matchesFilter = selectedFilter === "all" || c.status === selectedFilter;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusCounts = {
    all: cases.length,
    pending: cases.filter(c => c.status === "pending").length,
    "in-review": cases.filter(c => c.status === "in-review").length,
    approved: cases.filter(c => c.status === "approved").length,
    rejected: cases.filter(c => c.status === "rejected").length,
    resolved: cases.filter(c => c.status === "resolved").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Cases</h1>
              <p className="text-gray-600 text-lg">Track and manage your union cases</p>
            </div>
            <Link href="/dashboard/claims/new">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                New Case
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          {[
            { key: "all", label: "All Cases", count: statusCounts.all },
            { key: "pending", label: "Pending", count: statusCounts.pending },
            { key: "in-review", label: "In Review", count: statusCounts["in-review"] },
            { key: "approved", label: "Approved", count: statusCounts.approved },
            { key: "rejected", label: "Rejected", count: statusCounts.rejected },
            { key: "resolved", label: "Resolved", count: statusCounts.resolved },
          ].map((stat) => (
            <motion.button
              key={stat.key}
              onClick={() => setSelectedFilter(stat.key as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFilter === stat.key
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                  : "bg-white/80 backdrop-blur-sm text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-xs font-medium opacity-90">{stat.label}</div>
            </motion.button>
          ))}
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cases by title, description, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cases List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredCases.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <FileText size={32} className="text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Cases Found</h2>
                    <p className="text-gray-600 mb-6">
                      {searchQuery || selectedFilter !== "all" 
                        ? "Try adjusting your filters or search terms"
                        : "Submit your first case to get started"}
                    </p>
                    {!searchQuery && selectedFilter === "all" && (
                      <Link href="/dashboard/claims/new">
                        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                          Submit Your First Case
                        </button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredCases.map((caseItem, index) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      {/* Case Header */}
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => setExpandedCase(expandedCase === caseItem.id ? null : caseItem.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-gray-500">{caseItem.id}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[caseItem.status].color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[caseItem.status].dotColor}`}></span>
                              {statusConfig[caseItem.status].label}
                            </span>
                            <span className={`text-xs font-semibold ${priorityConfig[caseItem.priority].color}`}>
                              {priorityConfig[caseItem.priority].label} Priority
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                            {caseItem.title}
                            {expandedCase === caseItem.id ? (
                              <ChevronDown size={20} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={20} className="text-gray-400" />
                            )}
                          </h3>
                          <p className="text-gray-600 mb-3">{caseItem.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              Submitted: {new Date(caseItem.submittedDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              Updated: {new Date(caseItem.lastUpdate).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {caseItem.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedCase === caseItem.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                              {caseItem.assignedTo && (
                                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                                  <User size={20} className="text-blue-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Assigned To</p>
                                    <p className="text-sm text-gray-700">{caseItem.assignedTo}</p>
                                  </div>
                                </div>
                              )}
                              
                              {caseItem.notes && (
                                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                                  <MessageSquare size={20} className="text-green-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Latest Update</p>
                                    <p className="text-sm text-gray-700">{caseItem.notes}</p>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-3 pt-2">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                  View Full Details
                                </button>
                                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                  Add Comment
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Help Section */}
        {filteredCases.length > 0 && (
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
                    <h3 className="font-semibold text-gray-900 mb-2">Need Help with a Case?</h3>
                    <p className="text-gray-700 mb-4">
                      Contact your union steward for assistance with any case. They can provide guidance, 
                      updates, and help escalate urgent matters.
                    </p>
                    <Link href="/dashboard/members">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Contact Steward
                      </button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
