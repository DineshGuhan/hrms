import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Card } from './Card';
import { Table } from './Table';
import { Pagination, pageItems } from './Pagination';
import { Modal } from './Modal';
import { Toast } from './Toast';

describe('Button', () => {
  it('renders its label and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and shows loading text while loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Loading');
  });
});

describe('Card', () => {
  it('renders title and children', () => {
    render(
      <Card title="Leave balance">
        <p>12 days</p>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Leave balance' })).toBeInTheDocument();
    expect(screen.getByText('12 days')).toBeInTheDocument();
  });
});

describe('Table', () => {
  const columns = [{ key: 'name', header: 'Name', render: (r: { name: string }) => r.name }];

  it('renders a row per item', () => {
    render(<Table columns={columns} rows={[{ name: 'Asha' }, { name: 'Ravi' }]} rowKey={(r) => r.name} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Ravi')).toBeInTheDocument();
  });

  it('shows the empty message when there are no rows', () => {
    render(<Table columns={columns} rows={[]} rowKey={(r) => r.name} emptyMessage="Nobody here" />);
    expect(screen.getByText('Nobody here')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('shows page numbers with ellipses for long ranges', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageItems(1, 10)).toEqual([1, 2, null, 10]);
  });

  it('marks the current page and calls onPageChange', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Modal', () => {
  it('renders when open and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Confirm" onClose={onClose}>
        <p>Are you sure?</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} title="Hidden" onClose={vi.fn()}>
        <p>x</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('shows the message and dismisses after the duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Saved" variant="success" durationMs={1000} onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
