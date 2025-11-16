/**
 * AI Workbench Components
 * 
 * Complete set of React components for the Advanced AI Workbench feature.
 * These components provide interfaces for document analysis, predictions,
 * contract review, report generation, insights, and usage tracking.
 */

// Core AI Interaction Components
export { ChatInterface } from './ChatInterface';
export { DocumentAnalysisViewer } from './DocumentAnalysisViewer';
export { PredictionDashboard } from './PredictionDashboard';
export { ContractAnalyzer } from './ContractAnalyzer';

// Report and Insights Components
export { ReportGenerator } from './ReportGenerator';
export { AIInsightsPanel } from './AIInsightsPanel';

// Calculation and Metrics Components
export { SettlementCalculator } from './SettlementCalculator';
export { AIUsageMetrics } from './AIUsageMetrics';

/**
 * Component Usage Guide:
 * 
 * ChatInterface:
 * - Interactive AI chat for natural language queries
 * - Real-time responses with confidence scores
 * - Source attribution and SQL query display
 * 
 * DocumentAnalysisViewer:
 * - Display document/contract analysis results
 * - Tabbed interface for different analysis aspects
 * - Risk visualization and recommendations
 * 
 * PredictionDashboard:
 * - Visualize AI predictions for claims
 * - Outcome, timeline, resource, settlement predictions
 * - Confidence indicators and factor breakdowns
 * 
 * ContractAnalyzer:
 * - Interactive contract review tool
 * - Upload PDF/text contracts
 * - Clause analysis with risk assessment
 * 
 * ReportGenerator:
 * - Natural language report generation
 * - Template selection and custom specifications
 * - Background job processing with status tracking
 * 
 * AIInsightsPanel:
 * - Contextual AI suggestions and warnings
 * - Proactive recommendations
 * - User feedback collection
 * 
 * SettlementCalculator:
 * - Interactive settlement estimation
 * - Real-time calculation with what-if scenarios
 * - Historical comparison and factor analysis
 * 
 * AIUsageMetrics:
 * - Token usage and cost tracking
 * - Provider performance metrics
 * - Usage trends and budget alerts
 */
