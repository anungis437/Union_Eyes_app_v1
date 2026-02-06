import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState, useEffect } from 'react';
import { useSecurityAuditContext } from '../context/SecurityAuditProvider';
export function SecurityDashboard({ firmId, userId, className = '' }) {
    const [activeTab, setActiveTab] = useState('overview');
    const { logs, anomalies, loading, error, getLogs, detectLoginAnomalies, detectDataAnomalies, detectPermissionAnomalies } = useSecurityAuditContext();
    useEffect(() => {
        // Load initial data
        getLogs({ firmId, userId, limit: 100 });
        if (userId) {
            detectLoginAnomalies(userId, firmId);
            detectDataAnomalies(userId, firmId);
        }
        else if (firmId) {
            detectPermissionAnomalies(undefined, firmId);
        }
    }, [firmId, userId]);
    return (_jsxs("div", { className: `security-dashboard ${className}`, children: [_jsxs("div", { className: "dashboard-header mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Security Dashboard" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: "Monitor security events, detect anomalies, and ensure compliance" })] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4", children: [_jsx("p", { className: "font-medium", children: "Error" }), _jsx("p", { className: "text-sm", children: error })] })), _jsx("div", { className: "border-b border-gray-200 dark:border-gray-700 mb-6", children: _jsx("nav", { className: "flex space-x-8", children: ['overview', 'logs', 'anomalies', 'compliance'].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab), className: `py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: tab.charAt(0).toUpperCase() + tab.slice(1) }, tab))) }) }), _jsxs("div", { className: "dashboard-content", children: [loading && _jsx(LoadingSpinner, {}), !loading && activeTab === 'overview' && (_jsx(OverviewTab, { logs: logs, anomalies: anomalies })), !loading && activeTab === 'logs' && (_jsx(AuditLogsTab, { logs: logs, firmId: firmId, userId: userId })), !loading && activeTab === 'anomalies' && (_jsx(AnomaliesTab, { anomalies: anomalies })), !loading && activeTab === 'compliance' && (_jsx(ComplianceTab, { firmId: firmId }))] })] }));
}
// ============================================================================
// OVERVIEW TAB
// ============================================================================
function OverviewTab({ logs, anomalies }) {
    const stats = calculateStats(logs, anomalies);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(StatCard, { title: "Total Events", value: stats.totalEvents, icon: "\uD83D\uDCCA", trend: stats.eventsTrend }), _jsx(StatCard, { title: "High Risk Events", value: stats.highRiskEvents, icon: "\u26A0\uFE0F", trend: stats.riskTrend, variant: "warning" }), _jsx(StatCard, { title: "Anomalies Detected", value: stats.anomaliesDetected, icon: "\uD83D\uDD0D", trend: stats.anomaliesTrend, variant: "danger" }), _jsx(StatCard, { title: "Compliance Score", value: `${stats.complianceScore}%`, icon: "\u2713", trend: stats.complianceTrend, variant: "success" })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Recent Activity" }), _jsx(SecurityTimeline, { logs: logs.slice(0, 10) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Risk Distribution" }), _jsx(RiskDistributionChart, { logs: logs })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Top Anomalies" }), _jsx(AnomalyList, { anomalies: anomalies.slice(0, 5) })] })] })] }));
}
// ============================================================================
// AUDIT LOGS TAB
// ============================================================================
function AuditLogsTab({ logs, firmId, userId }) {
    const [filters, setFilters] = useState({
        search: '',
        riskLevel: '',
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
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx("input", { type: "text", placeholder: "Search logs...", value: filters.search, onChange: (e) => setFilters({ ...filters, search: e.target.value }), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" }), _jsxs("select", { "aria-label": "Filter by risk level", value: filters.riskLevel, onChange: (e) => setFilters({ ...filters, riskLevel: e.target.value }), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "All Risk Levels" }), _jsx("option", { value: "info", children: "Info" }), _jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" }), _jsx("option", { value: "critical", children: "Critical" })] }), _jsxs("select", { "aria-label": "Filter by action category", value: filters.actionCategory, onChange: (e) => setFilters({ ...filters, actionCategory: e.target.value }), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "All Categories" }), _jsx("option", { value: "auth", children: "Authentication" }), _jsx("option", { value: "data", children: "Data" }), _jsx("option", { value: "rbac", children: "RBAC" }), _jsx("option", { value: "api", children: "API" }), _jsx("option", { value: "security", children: "Security" }), _jsx("option", { value: "system", children: "System" })] }), _jsx("button", { onClick: () => exportLogs({ firmId, userId }, 'csv'), className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Export CSV" })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-900", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Time" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Action" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "User" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Risk" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Result" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "IP" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200 dark:divide-gray-700", children: filteredLogs.map((log) => (_jsxs("tr", { className: "hover:bg-gray-50 dark:hover:bg-gray-900", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm", children: new Date(log.created_at).toLocaleString() }), _jsx("td", { className: "px-6 py-4 text-sm", children: log.action_type }), _jsxs("td", { className: "px-6 py-4 text-sm", children: [log.user_id?.slice(0, 8), "..."] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx(RiskBadge, { level: log.risk_level }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx(ResultBadge, { result: log.success ? 'success' : 'failure' }) }), _jsx("td", { className: "px-6 py-4 text-sm", children: log.ip_address })] }, log.id))) })] }) })] }));
}
// ============================================================================
// ANOMALIES TAB
// ============================================================================
function AnomaliesTab({ anomalies }) {
    const [filter, setFilter] = useState('all');
    const filteredAnomalies = anomalies.filter(a => filter === 'all' || a.severity === filter);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex space-x-2", children: ['all', 'critical', 'high', 'medium', 'low'].map((f) => (_jsx("button", { onClick: () => setFilter(f), className: `px-4 py-2 rounded-lg ${filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, children: f.charAt(0).toUpperCase() + f.slice(1) }, f))) }), _jsxs("div", { className: "space-y-4", children: [filteredAnomalies.map((anomaly) => (_jsx(AnomalyCard, { anomaly: anomaly }, anomaly.id))), filteredAnomalies.length === 0 && (_jsx("div", { className: "text-center py-12 text-gray-500", children: "No anomalies detected" }))] })] }));
}
// ============================================================================
// COMPLIANCE TAB
// ============================================================================
function ComplianceTab({ firmId }) {
    const { complianceReport, generateSOC2Report, generateGDPRReport, generateHIPAAReport } = useSecurityAuditContext();
    const [framework, setFramework] = useState('SOC2');
    const handleGenerateReport = () => {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();
        if (!firmId)
            return;
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Compliance Framework" }), _jsx("div", { className: "flex space-x-4", children: ['SOC2', 'GDPR', 'HIPAA'].map((f) => (_jsx("button", { onClick: () => setFramework(f), className: `px-6 py-3 rounded-lg font-medium ${framework === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, children: f }, f))) }), _jsxs("button", { onClick: handleGenerateReport, className: "mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700", children: ["Generate ", framework, " Report"] })] }), complianceReport && (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsxs("h3", { className: "text-lg font-semibold mb-4", children: [complianceReport.framework, " Report"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "border-b pb-4", children: [_jsx("h4", { className: "font-medium mb-2", children: "Summary" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Total Events" }), _jsx("p", { className: "text-2xl font-bold", children: complianceReport.summary.total_events })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Compliance Rate" }), _jsxs("p", { className: "text-2xl font-bold text-green-600", children: [complianceReport.summary.compliance_rate.toFixed(1), "%"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Critical Issues" }), _jsx("p", { className: "text-2xl font-bold text-red-600", children: complianceReport.summary.critical_issues })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "High Priority" }), _jsx("p", { className: "text-2xl font-bold text-orange-600", children: complianceReport.summary.high_priority_issues })] })] })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium mb-2", children: "Findings" }), _jsx("div", { className: "space-y-2", children: complianceReport.findings.map((finding) => (_jsx("div", { className: "p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900", children: _jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(SeverityBadge, { severity: finding.severity }), _jsx("h5", { className: "font-medium", children: finding.title })] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: finding.description }), _jsxs("p", { className: "text-sm text-blue-600 mt-2", children: ["Recommendation: ", finding.recommendation] })] }) }) }, finding.id))) })] })] })] }))] }));
}
// ============================================================================
// SHARED COMPONENTS
// ============================================================================
function LoadingSpinner() {
    return (_jsx("div", { className: "flex justify-center items-center py-12", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
}
function StatCard({ title, value, icon, trend, variant = 'default' }) {
    const colors = {
        default: 'bg-white',
        success: 'bg-green-50',
        warning: 'bg-yellow-50',
        danger: 'bg-red-50'
    };
    return (_jsx("div", { className: `${colors[variant]} rounded-lg shadow p-6`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: title }), _jsx("p", { className: "text-3xl font-bold mt-2", children: value }), trend !== undefined && (_jsxs("p", { className: `text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`, children: [trend >= 0 ? '↑' : '↓', " ", Math.abs(trend), "% from last period"] }))] }), _jsx("div", { className: "text-4xl", children: icon })] }) }));
}
function RiskBadge({ level }) {
    const colors = {
        info: 'bg-gray-100 text-gray-800',
        low: 'bg-blue-100 text-blue-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-orange-100 text-orange-800',
        critical: 'bg-red-100 text-red-800'
    };
    return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded ${colors[level]}`, children: level.toUpperCase() }));
}
function ResultBadge({ result }) {
    const colors = {
        success: 'bg-green-100 text-green-800',
        failure: 'bg-red-100 text-red-800',
        partial: 'bg-yellow-100 text-yellow-800'
    };
    return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded ${colors[result] || colors.partial}`, children: result }));
}
function SeverityBadge({ severity }) {
    const colors = {
        critical: 'bg-red-100 text-red-800',
        high: 'bg-orange-100 text-orange-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-blue-100 text-blue-800'
    };
    return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded ${colors[severity]}`, children: severity.toUpperCase() }));
}
function SecurityTimeline({ logs }) {
    return (_jsx("div", { className: "space-y-4", children: logs.map((log, index) => (_jsxs("div", { className: "flex items-start space-x-4", children: [_jsx("div", { className: "flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium", children: log.action_type }), _jsx("p", { className: "text-xs text-gray-500", children: new Date(log.created_at).toLocaleTimeString() })] }), _jsxs("p", { className: "text-xs text-gray-600 mt-1", children: ["User: ", log.user_id?.slice(0, 8), "... | IP: ", log.ip_address] })] })] }, log.id))) }));
}
function RiskDistributionChart({ logs }) {
    const distribution = logs.reduce((acc, log) => {
        acc[log.risk_level] = (acc[log.risk_level] || 0) + 1;
        return acc;
    }, {});
    const total = logs.length;
    return (_jsx("div", { className: "space-y-2", children: Object.entries(distribution).map(([level, count]) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { className: "capitalize", children: level }), _jsxs("span", { children: [count, " (", ((count / total) * 100).toFixed(1), "%)"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full ${level === 'critical' ? 'bg-red-500 w-full' :
                            level === 'high' ? 'bg-orange-500' :
                                level === 'medium' ? 'bg-yellow-500' :
                                    level === 'low' ? 'bg-blue-500' : 'bg-gray-500'}` }) })] }, level))) }));
}
function AnomalyList({ anomalies }) {
    return (_jsx("div", { className: "space-y-3", children: anomalies.map((anomaly) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: anomaly.type.replace(/_/g, ' ') }), _jsx("p", { className: "text-xs text-gray-600", children: anomaly.description })] }), _jsx(SeverityBadge, { severity: anomaly.severity })] }, anomaly.id))) }));
}
function AnomalyCard({ anomaly }) {
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [_jsx(SeverityBadge, { severity: anomaly.severity }), _jsxs("span", { className: "text-xs text-gray-500", children: ["Confidence: ", (anomaly.confidence * 100).toFixed(0), "%"] })] }), _jsx("h4", { className: "text-lg font-semibold", children: anomaly.type.replace(/_/g, ' ') })] }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(anomaly.detected_at).toLocaleString() })] }), _jsx("p", { className: "text-gray-700 dark:text-gray-300 mb-4", children: anomaly.description }), _jsxs("div", { className: "bg-blue-50 dark:bg-blue-900/20 rounded p-3 mb-4", children: [_jsx("p", { className: "text-sm font-medium text-blue-800 dark:text-blue-200", children: "Recommended Action" }), _jsx("p", { className: "text-sm text-blue-700 dark:text-blue-300 mt-1", children: anomaly.recommended_action })] }), anomaly.auto_blocked && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded p-3", children: _jsx("p", { className: "text-sm font-medium text-red-800", children: "\u26A0\uFE0F Automatically Blocked" }) }))] }));
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function calculateStats(logs, anomalies) {
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
//# sourceMappingURL=SecurityDashboard.js.map