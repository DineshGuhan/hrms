import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('boom');
  return <p>all good</p>;
}

// React logs caught render errors to console.error; silence them so test output stays clean.
let errorSpy: MockInstance;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders the fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('recovers when the user clicks Try again and the child no longer throws', () => {
    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setExplode(false)}>
            fix
          </button>
          <ErrorBoundary>
            <Bomb explode={explode} />
          </ErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByText('fix'));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('all good')).toBeInTheDocument();
  });
});
