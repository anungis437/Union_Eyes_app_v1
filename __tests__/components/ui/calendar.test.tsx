import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

const dayPickerMock = vi.fn(() => null);

vi.mock('react-day-picker', () => ({
  DayPicker: (props: Record<string, unknown>) => {
    dayPickerMock(props);
    return null;
  }
}));

import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  beforeEach(() => {
    dayPickerMock.mockClear();
  });

  it('passes default props and base class names', () => {
    render(<Calendar className="custom" />);

    expect(dayPickerMock).toHaveBeenCalledTimes(1);
    const props = dayPickerMock.mock.calls[0][0] as Record<string, any>;

    expect(props.showOutsideDays).toBe(true);
    expect(props.className).toContain('p-3');
    expect(props.className).toContain('custom');
    expect(props.classNames.nav_button_previous).toBe('absolute left-1');
    expect(props.classNames.nav_button_next).toBe('absolute right-1');
  });

  it('allows overriding classNames and showOutsideDays', () => {
    render(
      <Calendar
        showOutsideDays={false}
        classNames={{ day: 'custom-day' }}
      />
    );

    const props = dayPickerMock.mock.calls[0][0] as Record<string, any>;
    expect(props.showOutsideDays).toBe(false);
    expect(props.classNames.day).toBe('custom-day');
  });
});
