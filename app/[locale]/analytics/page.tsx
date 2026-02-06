/**
 * Analytics Dashboard Page
 * 
 * Analytics hub integrating:
 * - Dashboard designer
 * - Widget library
 * - Real-time data visualization
 * - Dashboard switching
 * 
 * @page app/[locale]/analytics/page.tsx
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DashboardDesigner } from "@/components/analytics/dashboard-designer";
import { AnalyticsWidgetLibrary } from "@/components/analytics/analytics-widget-library";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AnalyticsPage() {
  const [showDesigner, setShowDesigner] = React.useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = React.useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = React.useState("default");

  // Mock dashboards - would come from API/database
  const dashboards = [
    { id: "default", name: "Overview Dashboard" },
    { id: "claims", name: "Claims Analytics" },
    { id: "membership", name: "Membership Insights" },
    { id: "engagement", name: "Engagement Metrics" },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Visualize data and gain insights across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowWidgetLibrary(true)}>
            Widget Library
          </Button>
          <Button onClick={() => setShowDesigner(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Dashboard
          </Button>
        </div>
      </div>

      {/* Dashboard Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Dashboard:</label>
        <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dashboards.map((dash) => (
              <SelectItem key={dash.id} value={dash.id}>
                {dash.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dashboard Display Area */}
      <div className="border rounded-lg p-6 bg-white min-h-[600px]">
        <p className="text-gray-600 text-center py-12">
          Dashboard widgets will render here. Use the Dashboard Designer to customize your layout.
        </p>
      </div>

      {/* Dashboard Designer Modal */}
      {showDesigner && (
        <DashboardDesigner
          onSave={async (dashboard) => {
            console.log("Dashboard saved:", dashboard);
            setShowDesigner(false);
          }}
        />
      )}

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <AnalyticsWidgetLibrary
          onAddWidget={(widget) => {
            console.log("Widget added:", widget);
            setShowWidgetLibrary(false);
          }}
        />
      )}
    </div>
  );
}
