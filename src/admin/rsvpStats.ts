export interface AdminRsvp {
  id: number;
  name: string;
  attending: boolean;
  attendees: number;
  message: string | null;
  created_at: string;
}

export function summarize(rows: AdminRsvp[]) {
  const yes = rows.filter((r) => r.attending);
  return {
    replies: rows.length,
    attendingHouseholds: yes.length,
    guests: yes.reduce((n, r) => n + (r.attendees || 0), 0),
    declined: rows.length - yes.length,
  };
}

export function filterRows(rows: AdminRsvp[], q: string, show: 'all' | 'yes' | 'no') {
  const needle = q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (show === 'all' || (show === 'yes' ? r.attending : !r.attending)) &&
      (!needle || r.name.toLowerCase().includes(needle) || (r.message ?? '').toLowerCase().includes(needle)),
  );
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  // neutralise spreadsheet formulas and quote everything
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCSV(rows: AdminRsvp[]) {
  const head = ['Name', 'Attending', 'Guests', 'Message', 'Replied at'];
  const body = rows.map((r) => [r.name, r.attending ? 'Yes' : 'No', r.attendees, r.message ?? '', new Date(r.created_at).toLocaleString()]);
  return [head, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
