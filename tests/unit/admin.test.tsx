import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../../src/admin/AdminApp';
import { filterRows, summarize, toCSV, type AdminRsvp } from '../../src/admin/rsvpStats';

const rows: AdminRsvp[] = [
  { id: 1, name: 'Priya Nair', attending: true, attendees: 3, message: 'Happy birthday!', created_at: '2026-11-08T15:00:00Z' },
  { id: 2, name: 'Sam Lee', attending: false, attendees: 0, message: null, created_at: '2026-11-08T16:00:00Z' },
  { id: 3, name: 'Omar', attending: true, attendees: 2, message: '=HYPERLINK("x")', created_at: '2026-11-08T17:00:00Z' },
];

describe('admin RSVP stats', () => {
  it('summarises replies, households and head-count', () => {
    expect(summarize(rows)).toEqual({ replies: 3, attendingHouseholds: 2, guests: 5, declined: 1 });
  });
  it('filters by attendance and search text', () => {
    expect(filterRows(rows, '', 'yes').map((r) => r.id)).toEqual([1, 3]);
    expect(filterRows(rows, '', 'no').map((r) => r.id)).toEqual([2]);
    expect(filterRows(rows, 'birthday', 'all').map((r) => r.id)).toEqual([1]);
  });
  it('exports CSV with quoting and formula-injection protection', () => {
    const csv = toCSV(rows);
    expect(csv.split('\r\n')[0]).toBe('"Name","Attending","Guests","Message","Replied at"');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('<Dashboard>', () => {
  it('shows totals, rows, and filters them', async () => {
    render(<Dashboard rows={rows} loading={false} error={null} onRefresh={() => {}} onDelete={() => {}} onSignOut={() => {}} />);
    expect(screen.getByTestId('stat-guests')).toHaveTextContent('5');
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Not coming' }));
    expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
  });
  it('asks to delete via an accessible button', async () => {
    const del = vi.fn();
    render(<Dashboard rows={rows} loading={false} error={null} onRefresh={() => {}} onDelete={del} onSignOut={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete RSVP from Sam Lee' }));
    expect(del).toHaveBeenCalledWith(rows[1]);
  });
});
