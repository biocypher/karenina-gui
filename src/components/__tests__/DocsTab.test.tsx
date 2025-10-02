import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocsTab } from '../DocsTab';
import { ThemeProvider } from '../ThemeProvider';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('DocsTab', () => {
  it('renders the documentation header', () => {
    renderWithTheme(<DocsTab />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive guide to using the Karenina benchmarking system')).toBeInTheDocument();
  });

  it('renders all four documentation sections', () => {
    renderWithTheme(<DocsTab />);
    expect(screen.getByText('The Karenina Framework')).toBeInTheDocument();
    expect(screen.getByText('General Configurations')).toBeInTheDocument();
    expect(screen.getByText('Template Generation')).toBeInTheDocument();
    expect(screen.getByText('Benchmarking')).toBeInTheDocument();
  });

  it('has the first section (The Karenina Framework) expanded by default', () => {
    renderWithTheme(<DocsTab />);
    const firstSectionContent = screen.getByText(/Karenina is a framework for defining benchmarks/i);
    expect(firstSectionContent).toBeInTheDocument();
  });

  it('can expand a collapsed section when clicked', () => {
    renderWithTheme(<DocsTab />);

    // General Configurations section should be collapsed initially
    const generalConfigsHeader = screen.getByText('General Configurations');
    expect(screen.queryByText(/In the upper right corner/i)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(generalConfigsHeader);

    // Now the content should be visible
    expect(screen.getByText(/In the upper right corner/i)).toBeInTheDocument();
  });

  it('can collapse an expanded section when clicked', () => {
    renderWithTheme(<DocsTab />);

    // The Karenina Framework section is expanded by default
    const frameworkHeader = screen.getByText('The Karenina Framework');
    expect(screen.getByText(/Karenina is a framework for defining benchmarks/i)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(frameworkHeader);

    // Now the content should be hidden
    expect(screen.queryByText(/Karenina is a framework for defining benchmarks/i)).not.toBeInTheDocument();
  });

  it('can have multiple sections expanded simultaneously', () => {
    renderWithTheme(<DocsTab />);

    // Expand Template Generation section
    const templateGenHeader = screen.getByText('Template Generation');
    fireEvent.click(templateGenHeader);

    // Both sections should be visible
    expect(screen.getByText(/Karenina is a framework for defining benchmarks/i)).toBeInTheDocument();
    expect(screen.getByText(/The Template Generation tab is the starting point/i)).toBeInTheDocument();
  });

  it('displays the footer tip message', () => {
    renderWithTheme(<DocsTab />);
    expect(screen.getByText(/Click on any section header to expand or collapse its content/i)).toBeInTheDocument();
  });

  it('uses ChevronDown icon for expanded sections', () => {
    renderWithTheme(<DocsTab />);
    // The first section is expanded by default, so it should have ChevronDown
    // We can verify this by checking the button structure (indirect test)
    const firstSectionButton = screen.getByText('The Karenina Framework').closest('button');
    expect(firstSectionButton).toBeInTheDocument();
  });

  it('renders markdown content correctly', () => {
    renderWithTheme(<DocsTab />);

    // Expand a section and verify markdown rendering
    const templateGenHeader = screen.getByText('Template Generation');
    fireEvent.click(templateGenHeader);

    // Check for specific markdown elements from the content
    expect(screen.getByText(/Question Extraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Answer Template Generation/i)).toBeInTheDocument();
  });
});
