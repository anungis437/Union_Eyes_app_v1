"use client";

/**
 * Tenant Selector Component
 * 
 * Dropdown component for switching between tenants.
 * Shows current tenant and allows selection of available tenants.
 */

import { useTenant } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function TenantSelector() {
  const { currentTenant, tenants, switchTenant, isLoading } = useTenant();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.tenantId) {
      return; // Already on this tenant
    }

    setIsSwitching(true);
    try {
      await switchTenant(tenantId);
    } catch (error) {
      console.error("Failed to switch tenant:", error);
      setIsSwitching(false);
    }
  };

  // Don't show selector if still loading or no tenant data
  if (isLoading || !currentTenant || tenants.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[200px] justify-between"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentTenant.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Select Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.tenantId}
            onSelect={() => handleTenantSwitch(tenant.tenantId)}
            className="cursor-pointer"
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                currentTenant.tenantId === tenant.tenantId
                  ? "opacity-100"
                  : "opacity-0"
              )}
            />
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              {tenant.subscriptionTier && (
                <span className="text-xs text-muted-foreground">
                  {tenant.subscriptionTier}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
