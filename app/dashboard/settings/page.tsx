"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Building2, Settings as SettingsIcon, Palette, Users, Link2, Bell, Shield, CreditCard, Upload, Save, AlertCircle, Mail, MessageSquare, Database, Calendar, Check, DollarSign, Download, Info } from "lucide-react";

type OrgSettingsSection = "general" | "branding" | "members" | "integrations" | "notifications" | "security" | "billing";

export default function OrganizationSettingsPage() {
  const [activeSection, setActiveSection] = useState<OrgSettingsSection>("general");
  const [hasChanges, setHasChanges] = useState(false);
  
  const [orgSettings, setOrgSettings] = useState({
    general: {
      organizationName: "UFCW Local 175 & 633",
      shortName: "UFCW 175",
      region: "ON",
      timezone: "America/Toronto",
      language: "en",
      fiscalYearStart: "January"
    },
    branding: {
      primaryColor: "#0066CC",
      logoUrl: "",
      showBranding: true,
      customDomain: ""
    },
    members: {
      autoApproval: false,
      requireEmailVerification: true,
      allowSelfRegistration: true,
      defaultRole: "member",
      memberIdPrefix: "MEM"
    },
    integrations: {
      emailProvider: "sendgrid",
      smsProvider: "twilio",
      storageProvider: "s3",
      calendarSync: false
    },
    notifications: {
      sendAdminDigest: true,
      digestFrequency: "daily",
      alertThreshold: 10,
      enableSystemAlerts: true
    },
    security: {
      enforceStrongPasswords: true,
      requireMFA: false,
      sessionTimeout: 30,
      allowedDomains: ["ufcw175.com", "ufcw633.com"],
      ipWhitelist: ""
    },
    billing: {
      plan: "Union Pro",
      memberCount: 1234,
      billingCycle: "monthly",
      paymentMethod: "Visa ending in 4242"
    }
  });

  const settingsSections = [
    {
      id: "general" as OrgSettingsSection,
      label: "General",
      icon: <SettingsIcon size={20} />,
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: "branding" as OrgSettingsSection,
      label: "Branding",
      icon: <Palette size={20} />,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "members" as OrgSettingsSection,
      label: "Members",
      icon: <Users size={20} />,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "integrations" as OrgSettingsSection,
      label: "Integrations",
      icon: <Link2 size={20} />,
      color: "bg-orange-100 text-orange-700",
    },
    {
      id: "notifications" as OrgSettingsSection,
      label: "Notifications",
      icon: <Bell size={20} />,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "security" as OrgSettingsSection,
      label: "Security",
      icon: <Shield size={20} />,
      color: "bg-red-100 text-red-700",
    },
    {
      id: "billing" as OrgSettingsSection,
      label: "Billing",
      icon: <CreditCard size={20} />,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  const handleInputChange = (section: OrgSettingsSection, field: string, value: any) => {
    setOrgSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    console.log("Saving organization settings:", orgSettings);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    window.location.reload();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Organization Settings
            </h1>
            <p className="text-gray-600">Manage your union&apos;s configuration</p>
          </div>
        </div>
        
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Admin Only</p>
            <p className="text-sm text-amber-700">These settings affect all members of your organization. Changes will be applied immediately.</p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex-shrink-0"
        >
          <Card className="p-4 sticky top-24">
            <div className="space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeSection === section.id
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${section.color} flex items-center justify-center`}>
                    {section.icon}
                  </div>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <Card className="p-8">
            {activeSection === "general" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">General Settings</h2>
                  <p className="text-gray-600">Configure basic organization information</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={orgSettings.general.organizationName}
                      onChange={(e) => handleInputChange("general", "organizationName", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Short Name
                    </label>
                    <input
                      type="text"
                      value={orgSettings.general.shortName}
                      onChange={(e) => handleInputChange("general", "shortName", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Region
                    </label>
                    <select
                      value={orgSettings.general.region}
                      onChange={(e) => handleInputChange("general", "region", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ON">Ontario</option>
                      <option value="QC">Quebec</option>
                      <option value="BC">British Columbia</option>
                      <option value="AB">Alberta</option>
                      <option value="MB">Manitoba</option>
                      <option value="SK">Saskatchewan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={orgSettings.general.timezone}
                      onChange={(e) => handleInputChange("general", "timezone", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="America/Toronto">Eastern (Toronto)</option>
                      <option value="America/Winnipeg">Central (Winnipeg)</option>
                      <option value="America/Edmonton">Mountain (Edmonton)</option>
                      <option value="America/Vancouver">Pacific (Vancouver)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={orgSettings.general.language}
                      onChange={(e) => handleInputChange("general", "language", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiscal Year Start
                    </label>
                    <select
                      value={orgSettings.general.fiscalYearStart}
                      onChange={(e) => handleInputChange("general", "fiscalYearStart", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="January">January</option>
                      <option value="April">April</option>
                      <option value="July">July</option>
                      <option value="October">October</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "branding" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Branding & Appearance</h2>
                  <p className="text-gray-600">Customize your organization&apos;s visual identity</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        {orgSettings.branding.logoUrl ? (
                          <img src={orgSettings.branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Upload Logo
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={orgSettings.branding.primaryColor}
                        onChange={(e) => handleInputChange("branding", "primaryColor", e.target.value)}
                        className="w-20 h-12 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={orgSettings.branding.primaryColor}
                        onChange={(e) => handleInputChange("branding", "primaryColor", e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      value={orgSettings.branding.customDomain}
                      onChange={(e) => handleInputChange("branding", "customDomain", e.target.value)}
                      placeholder="members.yourunion.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Show Branding</p>
                      <p className="text-sm text-gray-600">Display &quot;Powered by UnionEyes&quot; in footer</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.branding.showBranding}
                        onChange={(e) => handleInputChange("branding", "showBranding", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "members" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Member Management</h2>
                  <p className="text-gray-600">Configure member registration and access</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Allow Self-Registration</p>
                      <p className="text-sm text-gray-600">Members can register without admin approval</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.members.allowSelfRegistration}
                        onChange={(e) => handleInputChange("members", "allowSelfRegistration", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Auto-Approve Members</p>
                      <p className="text-sm text-gray-600">Automatically approve new registrations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.members.autoApproval}
                        onChange={(e) => handleInputChange("members", "autoApproval", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Require Email Verification</p>
                      <p className="text-sm text-gray-600">Members must verify their email address</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.members.requireEmailVerification}
                        onChange={(e) => handleInputChange("members", "requireEmailVerification", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Role
                    </label>
                    <select
                      value={orgSettings.members.defaultRole}
                      onChange={(e) => handleInputChange("members", "defaultRole", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="member">Member</option>
                      <option value="steward">Steward</option>
                      <option value="union_admin">Union Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Member ID Prefix
                    </label>
                    <input
                      type="text"
                      value={orgSettings.members.memberIdPrefix}
                      onChange={(e) => handleInputChange("members", "memberIdPrefix", e.target.value)}
                      placeholder="MEM"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "integrations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Integrations</h2>
                  <p className="text-gray-600">Connect external services to your organization</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail size={16} />
                      Email Provider
                    </label>
                    <select
                      value={orgSettings.integrations.emailProvider}
                      onChange={(e) => handleInputChange("integrations", "emailProvider", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                      <option value="ses">AWS SES</option>
                      <option value="smtp">Custom SMTP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <MessageSquare size={16} />
                      SMS Provider
                    </label>
                    <select
                      value={orgSettings.integrations.smsProvider}
                      onChange={(e) => handleInputChange("integrations", "smsProvider", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="twilio">Twilio</option>
                      <option value="vonage">Vonage</option>
                      <option value="sns">AWS SNS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Database size={16} />
                      Storage Provider
                    </label>
                    <select
                      value={orgSettings.integrations.storageProvider}
                      onChange={(e) => handleInputChange("integrations", "storageProvider", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="s3">AWS S3</option>
                      <option value="azure">Azure Blob Storage</option>
                      <option value="gcs">Google Cloud Storage</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Calendar size={16} />
                        Calendar Sync
                      </p>
                      <p className="text-sm text-gray-600">Sync events with external calendars</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.integrations.calendarSync}
                        onChange={(e) => handleInputChange("integrations", "calendarSync", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Organization Notifications</h2>
                  <p className="text-gray-600">Manage notification settings for administrators</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Send Admin Digest</p>
                      <p className="text-sm text-gray-600">Regular summaries of organization activity</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.notifications.sendAdminDigest}
                        onChange={(e) => handleInputChange("notifications", "sendAdminDigest", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Digest Frequency
                    </label>
                    <select
                      value={orgSettings.notifications.digestFrequency}
                      onChange={(e) => handleInputChange("notifications", "digestFrequency", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!orgSettings.notifications.sendAdminDigest}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Threshold
                    </label>
                    <input
                      type="number"
                      value={orgSettings.notifications.alertThreshold}
                      onChange={(e) => handleInputChange("notifications", "alertThreshold", parseInt(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">Send alert when pending items exceed this number</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">System Alerts</p>
                      <p className="text-sm text-gray-600">Notifications about system updates and maintenance</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.notifications.enableSystemAlerts}
                        onChange={(e) => handleInputChange("notifications", "enableSystemAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Security & Compliance</h2>
                  <p className="text-gray-600">Configure security policies and access controls</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Enforce Strong Passwords</p>
                      <p className="text-sm text-gray-600">Require complex passwords with special characters</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.security.enforceStrongPasswords}
                        onChange={(e) => handleInputChange("security", "enforceStrongPasswords", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Require Multi-Factor Authentication</p>
                      <p className="text-sm text-gray-600">All members must enable 2FA</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orgSettings.security.requireMFA}
                        onChange={(e) => handleInputChange("security", "requireMFA", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <select
                      value={orgSettings.security.sessionTimeout}
                      onChange={(e) => handleInputChange("security", "sessionTimeout", parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed Email Domains
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {orgSettings.security.allowedDomains.map((domain, index) => (
                        <div key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          {domain}
                          <button
                            onClick={() => {
                              const newDomains = orgSettings.security.allowedDomains.filter((_, i) => i !== index);
                              handleInputChange("security", "allowedDomains", newDomains);
                            }}
                            className="text-blue-700 hover:text-blue-900"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">Only users with these email domains can register</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IP Whitelist
                    </label>
                    <textarea
                      value={orgSettings.security.ipWhitelist}
                      onChange={(e) => handleInputChange("security", "ipWhitelist", e.target.value)}
                      placeholder="192.168.1.1&#10;10.0.0.0/8"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500 mt-1">One IP address or CIDR range per line</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "billing" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Billing & Subscription</h2>
                  <p className="text-gray-600">Manage your organization&apos;s subscription and payments</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{orgSettings.billing.plan}</h3>
                        <p className="text-sm text-gray-600">{orgSettings.billing.memberCount} members</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">$299</p>
                        <p className="text-sm text-gray-600">/month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={16} className="text-green-600" />
                      <span>Unlimited grievance cases</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={16} className="text-green-600" />
                      <span>Advanced analytics</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={16} className="text-green-600" />
                      <span>Priority support</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Payment Method</p>
                        <p className="text-sm text-gray-600">{orgSettings.billing.paymentMethod}</p>
                      </div>
                      <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        Update
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Recent Invoices</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">Dec 1, 2024</td>
                            <td className="px-4 py-3 text-sm text-gray-900">$299.00</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <Check size={12} />
                                Paid
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-blue-600 hover:text-blue-700 text-sm">
                                <Download size={16} />
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">Nov 1, 2024</td>
                            <td className="px-4 py-3 text-sm text-gray-900">$299.00</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <Check size={12} />
                                Paid
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-blue-600 hover:text-blue-700 text-sm">
                                <Download size={16} />
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="px-6 py-4 shadow-xl border-2 border-blue-200 bg-white">
            <div className="flex items-center gap-4">
              <Info size={20} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-900">You have unsaved changes</span>
              <div className="flex gap-2">
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
      
      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Need Help?</h3>
            <p className="text-sm text-blue-700">
              Contact support if you need assistance configuring your organization settings.
              Changes to security settings may require all members to re-authenticate.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
