import React from 'react';
export type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'security';
export interface SettingsPageProps {
    defaultTab?: SettingsTab;
    onClose?: () => void;
    showCloseButton?: boolean;
    className?: string;
}
export declare const ProfileSettingsPage: React.FC<SettingsPageProps>;
export interface CompactSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: SettingsTab;
}
export declare const CompactSettingsModal: React.FC<CompactSettingsModalProps>;
export interface SettingsWidgetProps {
    onOpenFullSettings?: () => void;
    className?: string;
}
export declare const SettingsWidget: React.FC<SettingsWidgetProps>;
declare const _default: {
    ProfileSettingsPage: React.FC<SettingsPageProps>;
    CompactSettingsModal: React.FC<CompactSettingsModalProps>;
    SettingsWidget: React.FC<SettingsWidgetProps>;
};
export default _default;
//# sourceMappingURL=ProfileSettingsPage.d.ts.map