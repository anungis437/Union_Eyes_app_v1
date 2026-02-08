import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

describe('Alert', () => {
  it('renders default alert content', () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened.</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Something happened.')).toBeInTheDocument();
  });

  it('renders destructive variant styling', () => {
    render(
      <Alert variant="destructive">
        <AlertDescription>Danger zone.</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('text-destructive');
  });
});
