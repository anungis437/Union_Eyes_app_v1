import React from 'react';
export interface AvatarUploaderProps {
    currentAvatarUrl?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    editable?: boolean;
    showUploadButton?: boolean;
    onUpload?: (file: File) => Promise<any>;
    onDelete?: () => Promise<void>;
    className?: string;
}
export declare const AvatarUploader: React.FC<AvatarUploaderProps>;
export interface ProfileCardProps {
    className?: string;
    showCompleteness?: boolean;
    onEditClick?: () => void;
}
export declare const ProfileCard: React.FC<ProfileCardProps>;
export interface ProfileEditorProps {
    onSave?: () => void;
    onCancel?: () => void;
    className?: string;
}
export declare const ProfileEditor: React.FC<ProfileEditorProps>;
declare const _default: {
    AvatarUploader: React.FC<AvatarUploaderProps>;
    ProfileCard: React.FC<ProfileCardProps>;
    ProfileEditor: React.FC<ProfileEditorProps>;
};
export default _default;
//# sourceMappingURL=ProfileComponents.d.ts.map