// Entry point for shared UI library
export * from './components';
export { default as BusinessUnitSwitcher, businessUnits } from './components/BusinessUnitSwitcher';
export { default as UniversalAppSwitcher, allApps, practiceAreas, legalTools, adminTools } from './components/UniversalAppSwitcher';
export { default as UnifiedLayout } from './components/UnifiedLayout';
// Utilities
export { cn } from './utils/cn';
export { parseTimeEntry, calculateBillableAmount, formatCurrency, formatDuration } from './utils/timeUtils';
//# sourceMappingURL=index.js.map