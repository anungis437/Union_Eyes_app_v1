/**
 * Tests for UI Components
 * 
 * Validates signal badge rendering and dashboard widget functionality.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalBadge, SignalDot, SignalTypeBadge } from '@/components/cases/signal-badge';
import type { Signal } from '@/lib/services/lro-signals';

describe('SignalBadge', () => {
  const createMockSignal = (severity: Signal['severity'], type: Signal['type']): Signal => ({
    id: 'signal-123',
    caseId: 'case-123',
    type,
    severity,
    title: 'Test Signal',
    description: 'Test description',
    actionable: true,
    context: {
      casePriority: 'high',
      currentState: 'investigating',
    },
    generatedAt: new Date(),
  });

  describe('SignalBadge Component', () => {
    it('should render critical signal badge', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} />);

      expect(container.textContent).toContain('Critical');
      expect(container.querySelector('.bg-red-100')).toBeTruthy();
      expect(container.querySelector('.text-red-800')).toBeTruthy();
    });

    it('should render urgent signal badge', () => {
      const signal = createMockSignal('urgent', 'sla_at_risk');
      const { container } = render(<SignalBadge signal={signal} />);

      expect(container.textContent).toContain('Urgent');
      expect(container.querySelector('.bg-orange-100')).toBeTruthy();
    });

    it('should render warning signal badge', () => {
      const signal = createMockSignal('warning', 'case_stale');
      const { container } = render(<SignalBadge signal={signal} />);

      expect(container.textContent).toContain('Warning');
      expect(container.querySelector('.bg-yellow-100')).toBeTruthy();
    });

    it('should render info signal badge', () => {
      const signal = createMockSignal('info', 'urgent_state');
      const { container } = render(<SignalBadge signal={signal} />);

      expect(container.textContent).toContain('Info');
      expect(container.querySelector('.bg-blue-100')).toBeTruthy();
    });

    it('should render without text when showText is false', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} showText={false} />);

      expect(container.textContent).not.toContain('Critical');
      expect(container.textContent).toContain('🔴'); // Icon still present
    });

    it('should render in small size', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} size="sm" />);

      expect(container.querySelector('.text-xs')).toBeTruthy();
      expect(container.querySelector('.px-2')).toBeTruthy();
    });

    it('should render in large size', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} size="lg" />);

      expect(container.querySelector('.text-base')).toBeTruthy();
      expect(container.querySelector('.px-4')).toBeTruthy();
    });

    it('should include signal description as title attribute', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} />);

      const badge = container.querySelector('[title]');
      expect(badge?.getAttribute('title')).toBe('Test description');
    });
  });

  describe('SignalDot Component', () => {
    it('should render critical dot with red background', () => {
      const { container } = render(<SignalDot severity="critical" />);
      expect(container.querySelector('.bg-red-500')).toBeTruthy();
    });

    it('should render urgent dot with orange background', () => {
      const { container } = render(<SignalDot severity="urgent" />);
      expect(container.querySelector('.bg-orange-500')).toBeTruthy();
    });

    it('should render warning dot with yellow background', () => {
      const { container } = render(<SignalDot severity="warning" />);
      expect(container.querySelector('.bg-yellow-500')).toBeTruthy();
    });

    it('should render info dot with blue background', () => {
      const { container } = render(<SignalDot severity="info" />);
      expect(container.querySelector('.bg-blue-500')).toBeTruthy();
    });

    it('should have proper aria-label', () => {
      const { container } = render(<SignalDot severity="critical" />);
      const dot = container.querySelector('[aria-label]');
      expect(dot?.getAttribute('aria-label')).toBe('critical');
    });
  });

  describe('SignalTypeBadge Component', () => {
    it('should render SLA breached type badge', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('SLA Breached');
    });

    it('should render SLA at risk type badge', () => {
      const signal = createMockSignal('urgent', 'sla_at_risk');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('SLA At Risk');
    });

    it('should render acknowledgment overdue type badge', () => {
      const signal = createMockSignal('critical', 'acknowledgment_overdue');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('Ack Overdue');
    });

    it('should render member waiting type badge', () => {
      const signal = createMockSignal('urgent', 'member_waiting');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('Member Waiting');
    });

    it('should render case stale type badge', () => {
      const signal = createMockSignal('warning', 'case_stale');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('Stale');
    });

    it('should render escalation needed type badge', () => {
      const signal = createMockSignal('urgent', 'escalation_needed');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('Escalate');
    });

    it('should render urgent state type badge', () => {
      const signal = createMockSignal('info', 'urgent_state');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.textContent).toContain('Urgent State');
    });

    it('should apply severity-based styling', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalTypeBadge signal={signal} />);

      expect(container.querySelector('.bg-red-100')).toBeTruthy();
      expect(container.querySelector('.text-red-800')).toBeTruthy();
    });
  });

  describe('Badge Visual Consistency', () => {
    it('should use consistent icons for each severity', () => {
      const severities: Array<Signal['severity']> = ['critical', 'urgent', 'warning', 'info'];
      const expectedIcons = ['🔴', '🟠', '🟡', '🔵'];

      severities.forEach((severity, index) => {
        const signal = createMockSignal(severity, 'sla_breached');
        const { container } = render(<SignalBadge signal={signal} />);
        expect(container.textContent).toContain(expectedIcons[index]);
      });
    });

    it('should use consistent color schemes', () => {
      const testCases = [
        { severity: 'critical' as const, bg: 'bg-red-100', text: 'text-red-800' },
        { severity: 'urgent' as const, bg: 'bg-orange-100', text: 'text-orange-800' },
        { severity: 'warning' as const, bg: 'bg-yellow-100', text: 'text-yellow-800' },
        { severity: 'info' as const, bg: 'bg-blue-100', text: 'text-blue-800' },
      ];

      testCases.forEach(({ severity, bg, text }) => {
        const signal = createMockSignal(severity, 'sla_breached');
        const { container } = render(<SignalBadge signal={signal} />);
        
        expect(container.querySelector(`.${bg}`)).toBeTruthy();
        expect(container.querySelector(`.${text}`)).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper contrast for critical badge', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} />);

      // Red-100 background with red-800 text provides good contrast
      expect(container.querySelector('.bg-red-100.text-red-800')).toBeTruthy();
    });

    it('should include descriptive text for screen readers', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} />);

      expect(container.textContent).toContain('Critical');
    });

    it('should use semantic HTML', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      const { container } = render(<SignalBadge signal={signal} />);

      // Check for div with inline-flex (proper container element)
      expect(container.querySelector('div.inline-flex')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all signal types correctly', () => {
      const types: Array<Signal['type']> = [
        'sla_breached',
        'sla_at_risk',
        'acknowledgment_overdue',
        'member_waiting',
        'case_stale',
        'escalation_needed',
        'urgent_state',
      ];

      types.forEach(type => {
        const signal = createMockSignal('critical', type);
        const { container } = render(<SignalTypeBadge signal={signal} />);
        expect(container.textContent).toBeTruthy();
      });
    });

    it('should handle long signal descriptions in title', () => {
      const signal = createMockSignal('critical', 'sla_breached');
      signal.description = 'A'.repeat(500); // Very long description
      
      const { container } = render(<SignalBadge signal={signal} />);
      const badge = container.querySelector('[title]');
      expect(badge?.getAttribute('title')).toBe(signal.description);
    });
  });
});
