/**
 * Session Card Component
 *
 * Displays individual session with device info, location, and actions
 */
import React from 'react';
import { SessionInfo } from '../services/sessionManagement';
interface SessionCardProps {
    session: SessionInfo;
    isCurrent?: boolean;
    onTerminate?: (sessionId: string) => void;
    showTerminateButton?: boolean;
}
export declare const SessionCard: React.FC<SessionCardProps>;
export {};
//# sourceMappingURL=SessionCard.d.ts.map