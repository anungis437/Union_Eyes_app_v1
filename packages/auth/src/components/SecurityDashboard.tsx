/**
 * Security Dashboard
 * 
 * Comprehensive security monitoring dashboard with audit logs,
 * anomaly detection, compliance reporting, and analytics.
 * 
 * @module SecurityDashboard
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */

import React, { useState, useEffect } from 'react';
import { useSecurityAuditContext } from '../context/SecurityAuditProvider';
import type { AuditLog, AuditRiskLevel } from '../services/securityAuditService';
import type { AnomalyDetection } from '../services/anomalyDetectionService';

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export interface SecurityDashboardProps {
  firmId?: string;
  userId?: string;
  className?: string;
}

export function SecurityDashboard({ firmId, userId, className = '' }: SecurityDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'anomalies' | 'compliance'>('overview');
  const {
    logs,
    anomalies,
    loading,
    error,
    getLogs,
    detectLoginAnomalies,
    detectDataAnomalies,
    detectPermissionAnomalies
  } = useSecurityAuditContext();

  useEffect(() => {
    // Load initial data
    getLogs({ firmId, userId, limit: 100 });
    
    if (userId) {
      detectLoginAnomalies(userId, firmId);
      detectDataAnomalies(userId, firmId);
    } else if (firmId) {
      detectPermissionAnomalies(undefined, firmId);
    }
  }, [firmId, userId]);

  return (
    <div className={`security-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Security Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor security events, detect anomalies, and ensure compliance
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {['overview', 'logs', 'anomalies', 'compliance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {loading && <LoadingSpinner />}
        
        {!loading && activeTab === 'overview' && (
          <OverviewTab logs={logs} anomalies={anomalies} />
        )}
        
        {!loading && activeTab === 'logs' && (
          <AuditLogsTab logs={logs} firmId={firmId} userId={userId} />
        )}
        
        {!loading && activeTab === 'anomalies' && (
          <AnomaliesTab anomalies={anomalies} />
        )}
        
        {!loading && activeTab === 'compliance' && (
          <ComplianceTab firmId={firmId} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ logs, anomalies }: { logs: AuditLog[]; anomalies: AnomalyDetection[] }) {
  const stats = calculateStats(logs, anomalies);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={stats.totalEvents}
          icon="📊"
          trend={stats.eventsTrend}
        />
        <StatCard
          title="High Risk Events"
          value={stats.highRiskEvents}
          icon="⚠️"
          trend={stats.riskTrend}
          variant="warning"
        />
        <StatCard
          title="Anomalies Detected"
          value={stats.anomaliesDetected}
          icon="🔍"
          trend={stats.anomaliesTrend}
          variant="danger"
        />
        <StatCard
          title="Compliance Score"
          value={`${stats.complianceScore}%`}
          icon="✓"
          trend={stats.complianceTrend}
          variant="success"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <SecurityTimeline logs={logs.slice(0, 10)} />
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
          <RiskDistributionChart logs={logs} />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Anomalies</h3>
          <AnomalyList anomalies={anomalies.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUDIT LOGS TAB
// ============================================================================

function AuditLogsTab({ logs, firmId, userId }: { logs: AuditLog[]; firmId?: string; userId?: string }) {
  const [filters, setFilters] = useState({
    search: '',
    riskLevel: '' as AuditRiskLevel | '',
    actionCategory: '',
    startDate: '',
    endDate: ''
  });
  const { searchLogs, exportLogs } = useSecurityAuditContext();

  const filteredLogs = logs.filter(log => {
    if (filters.search && !log.action_type.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.riskLevel && log.risk_level !== filters.riskLevel) {
      return false;
    }
    if (filters.actionCategory) {
      const category = log.action_type.split('.')[0]; // Extract category from action_type (e.g., 'auth' from 'auth.login.success')
      if (category !== filters.actionCategory) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            aria-label="Filter by risk level"
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Risk Levels</option>
            <option value="info">Info</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          
          <select
            aria-label="Filter by action category"
            value={filters.actionCategory}
            onChange={(e) => setFilters({ ...filters, actionCategory: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="data">Data</option>
            <option value="rbac">RBAC</option>
            <option value="api">API</option>
            <option value="security">Security</option>
            <option value="system">System</option>
          </select>
          
          <button
            onClick={() => exportLogs({ firmId, userId }, 'csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">{log.action_type}</td>
                <td className="px-6 py-4 text-sm">{log.user_id?.slice(0, 8)}...</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RiskBadge level={log.risk_level} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ResultBadge result={log.success ? 'success' : 'failure'} />
                </td>
                <td className="px-6 py-4 text-sm">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// ANOMALIES TAB
// ============================================================================

function AnomaliesTab({ anomalies }: { anomalies: AnomalyDetection[] }) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const filteredAnomalies = anomalies.filter(a => 
    filter === 'all' || a.severity === filter
  );

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex space-x-2">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {filteredAnomalies.map((anomaly) => (
          <AnomalyCard key={anomaly.id} anomaly={anomaly} />
        ))}
        
        {filteredAnomalies.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No anomalies detected
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPLIANCE TAB
// ============================================================================

function ComplianceTab({ firmId }: { firmId?: string }) {
  const { complianceReport, generateSOC2Report, generateGDPRReport, generateHIPAAReport } = useSecurityAuditContext();
  const [framework, setFramework] = useState<'SOC2' | 'GDPR' | 'HIPAA'>('SOC2');

  const handleGenerateReport = () => {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    if (!firmId) return;

    switch (framework) {
      case 'SOC2':
        generateSOC2Report(firmId, startDate, endDate);
        break;
      case 'GDPR':
        generateGDPRReport(firmId, startDate, endDate);
        break;
      case 'HIPAA':
        generateHIPAAReport(firmId, startDate, endDate);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Framework Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Compliance Framework</h3>
        <div className="flex space-x-4">
          {(['SOC2', 'GDPR', 'HIPAA'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFramework(f)}
              className={`px-6 py-3 rounded-lg font-medium ${
                framework === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <button
          onClick={handleGenerateReport}
          className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Generate {framework} Report
        </button>
      </div>

      {/* Report Display */}
      {complianceReport && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {complianceReport.framework} Report
          </h3>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="border-b pb-4">
              <h4 className="font-medium mb-2">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Events</p>
                  <p className="text-2xl font-bold">{complianceReport.summary.total_events}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Compliance Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {complianceReport.summary.compliance_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Critical Issues</p>
                  <p className="text-2xl font-bold text-red-600">
                    {complianceReport.summary.critical_issues}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {complianceReport.summary.high_priority_issues}
                  </p>
                </div>
              </div>
            </div>

            {/* Findings */}
            <div>
              <h4 className="font-medium mb-2">Findings</h4>
              <div className="space-y-2">
                {complianceReport.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <SeverityBadge severity={finding.severity} />
                          <h5 className="font-medium">{finding.title}</h5>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                        <p className="text-sm text-blue-600 mt-2">
                          Recommendation: {finding.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, variant = 'default' }: {
  title: string;
  value: string | number;
  icon: string;
  trend?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colors = {
    default: 'bg-white',
    success: 'bg-green-50',
    warning: 'bg-yellow-50',
    danger: 'bg-red-50'
  };

  return (
    <div className={`${colors[variant]} rounded-lg shadow p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
            </p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: AuditRiskLevel }) {
  const colors = {
    info: 'bg-gray-100 text-gray-800',
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    failure: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[result as keyof typeof colors] || colors.partial}`}>
      {result}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[severity as keyof typeof colors]}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function SecurityTimeline({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <div key={log.id} className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{log.action_type}</p>
              <p className="text-xs text-gray-500">
                {new Date(log.created_at).toLocaleTimeString()}
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              User: {log.user_id?.slice(0, 8)}... | IP: {log.ip_address}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskDistributionChart({ logs }: { logs: AuditLog[] }) {
  const distribution = logs.reduce((acc, log) => {
    acc[log.risk_level] = (acc[log.risk_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = logs.length;

  return (
    <div className="space-y-2">
      {Object.entries(distribution).map(([level, count]) => (
        <div key={level}>
          <div className="flex justify-between text-sm mb-1">
            <span className="capitalize">{level}</span>
            <span>{count} ({((count / total) * 100).toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                level === 'critical' ? 'bg-red-500 w-full' :
                level === 'high' ? 'bg-orange-500' :
                level === 'medium' ? 'bg-yellow-500' :
                level === 'low' ? 'bg-blue-500' : 'bg-gray-500'
              }`}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnomalyList({ anomalies }: { anomalies: AnomalyDetection[] }) {
  return (
    <div className="space-y-3">
      {anomalies.map((anomaly) => (
        <div key={anomaly.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <div>
            <p className="text-sm font-medium">{anomaly.type.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-600">{anomaly.description}</p>
          </div>
          <SeverityBadge severity={anomaly.severity} />
        </div>
      ))}
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: AnomalyDetection }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <SeverityBadge severity={anomaly.severity} />
            <span className="text-xs text-gray-500">
              Confidence: {(anomaly.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <h4 className="text-lg font-semibold">{anomaly.type.replace(/_/g, ' ')}</h4>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(anomaly.detected_at).toLocaleString()}
        </span>
      </div>
      
      <p className="text-gray-700 dark:text-gray-300 mb-4">{anomaly.description}</p>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 mb-4">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Recommended Action
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          {anomaly.recommended_action}
        </p>
      </div>
      
      {anomaly.auto_blocked && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm font-medium text-red-800">⚠️ Automatically Blocked</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateStats(logs: AuditLog[], anomalies: AnomalyDetection[]) {
  const highRiskLogs = logs.filter(l => l.risk_level === 'high' || l.risk_level === 'critical');
  
  return {
    totalEvents: logs.length,
    highRiskEvents: highRiskLogs.length,
    anomaliesDetected: anomalies.length,
    complianceScore: 95, // Mock - would calculate from compliance data
    eventsTrend: 12,
    riskTrend: -5,
    anomaliesTrend: 3,
    complianceTrend: 2
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SecurityDashboard;
