import React from 'react';
export interface ConsentFormProps {
    consentType: string;
    version: string;
    content: string;
    onConsent: (consented: boolean, signature?: string) => void;
    requireSignature?: boolean;
}
export declare const ConsentForm: React.FC<ConsentFormProps>;
//# sourceMappingURL=ConsentForm.d.ts.map