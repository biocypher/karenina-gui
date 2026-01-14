import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../../../../src/components/ui/Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <h1>Test Content</h1>
        <p>Test paragraph</p>
      </Card>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test paragraph')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    const { container } = render(<Card>Content</Card>);

    const cardElement = container.firstChild;
    expect(cardElement).toHaveClass('bg-white/80');
    expect(cardElement).toHaveClass('dark:bg-slate-800/80');
    expect(cardElement).toHaveClass('backdrop-blur-xl');
    expect(cardElement).toHaveClass('rounded-2xl');
    expect(cardElement).toHaveClass('shadow-xl');
    expect(cardElement).toHaveClass('border');
    expect(cardElement).toHaveClass('border-white/30');
    expect(cardElement).toHaveClass('dark:border-slate-700/30');
    expect(cardElement).toHaveClass('p-6');
  });

  it('applies additional className when provided', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);

    const cardElement = container.firstChild;
    expect(cardElement).toHaveClass('custom-class');
    // Should still have default classes
    expect(cardElement).toHaveClass('bg-white/80');
  });

  it('renders with complex nested content', () => {
    render(
      <Card>
        <div data-testid="nested-div">
          <button>Click me</button>
          <input type="text" placeholder="Enter text" />
        </div>
      </Card>
    );

    expect(screen.getByTestId('nested-div')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });
});
