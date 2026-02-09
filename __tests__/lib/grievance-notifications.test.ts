/**
 * Grievance Notifications Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendGrievanceFiledNotification,
  sendGrievanceAssignedNotification,
  sendGrievanceStageChangeNotification,
  sendGrievanceDeadlineReminder,
  sendGrievanceResolvedNotification,
  sendGrievanceDocumentAddedNotification,
  sendGrievanceCommentNotification,
  sendGrievanceEscalationNotification,
  sendSettlementProposalNotification,
} from '@/lib/services/grievance-notifications';
import * as notificationService from '@/lib/services/notification-service';

const sendMock = vi.fn();
const queueMock = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));


const dbMock = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
}));

vi.mock('@/database', () => ({
  db: dbMock,
}), { virtual: true });

vi.mock('@/db/schema/organization-members-schema', () => ({
  profiles: {
    phone: 'phone',
    name: 'name',
    email: 'email',
  },
}));


const baseContext = {
  organizationId: 'org-1',
  grievanceId: 'grv-1',
  grievanceNumber: 'GRV-1001',
  grievanceSubject: 'Wage dispute',
  grievantName: 'Alex Member',
  grievantEmail: 'alex@example.com',
  assignedOfficerEmail: 'officer@example.com',
  assignedOfficerName: 'Case Officer',
  currentStage: 'Filed',
  userId: 'user-1',
};

describe('Grievance Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(notificationService, 'getNotificationService').mockReturnValue({
      send: sendMock,
      queue: queueMock,
    } as any);
  });

  it('should send grievance filed notification to grievant', async () => {
    await sendGrievanceFiledNotification(baseContext);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('should send assignment notifications to officer and grievant', async () => {
    await sendGrievanceAssignedNotification(baseContext);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(queueMock).toHaveBeenCalledTimes(1);
  });

  it('should send stage change notifications', async () => {
    await sendGrievanceStageChangeNotification({
      ...baseContext,
      previousStage: 'Filed',
      newStage: 'Review',
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should send deadline reminder with urgent SMS when phone exists', async () => {
    const localSend = vi.fn();
    vi.spyOn(notificationService, 'getNotificationService').mockReturnValue({
      send: localSend,
      queue: queueMock,
    } as any);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ phone: '555-111-2222', name: 'Case Officer' }]),
        }),
      }),
    });
    dbMock.select = mockSelect;

    await sendGrievanceDeadlineReminder({
      ...baseContext,
      assignedOfficerEmail: 'officer@example.com',
      deadlineDate: new Date('2024-02-01'),
      daysRemaining: 1,
    });

    expect(notificationService.getNotificationService).toHaveBeenCalled();
    expect(localSend).toHaveBeenCalledTimes(2);
  });

  it('should send deadline reminder email only when phone missing', async () => {
    const localSend = vi.fn();
    vi.spyOn(notificationService, 'getNotificationService').mockReturnValue({
      send: localSend,
      queue: queueMock,
    } as any);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ phone: null, name: 'Case Officer' }]),
        }),
      }),
    });
    dbMock.select = mockSelect;

    await sendGrievanceDeadlineReminder({
      ...baseContext,
      assignedOfficerEmail: 'officer@example.com',
      deadlineDate: new Date('2024-02-01'),
      daysRemaining: 1,
    });

    expect(notificationService.getNotificationService).toHaveBeenCalled();
    expect(localSend).toHaveBeenCalledTimes(1);
  });

  it('should send grievance resolved notifications', async () => {
    await sendGrievanceResolvedNotification({
      ...baseContext,
      resolutionType: 'settled',
      resolutionSummary: 'Agreement reached',
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should send document added notifications to non-uploader', async () => {
    await sendGrievanceDocumentAddedNotification({
      ...baseContext,
      documentName: 'Evidence.pdf',
      uploadedBy: 'alex@example.com',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('should send comment notifications to other participants', async () => {
    await sendGrievanceCommentNotification({
      ...baseContext,
      commentAuthor: 'alex@example.com',
      commentPreview: 'Update on case',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('should send escalation notifications to recipients', async () => {
    await sendGrievanceEscalationNotification({
      ...baseContext,
      escalatedTo: ['leader1@example.com', 'leader2@example.com'],
      escalationReason: 'Missed deadline',
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should send settlement proposal notification', async () => {
    await sendSettlementProposalNotification({
      ...baseContext,
      proposedBy: 'officer@example.com',
      settlementSummary: 'Back pay offered',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
