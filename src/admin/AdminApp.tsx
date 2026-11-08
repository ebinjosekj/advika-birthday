import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { Download, LogOut, RefreshCw, Search, Trash2 } from 'lucide-react';
import { eventConfig } from '../config/eventConfig';
import { RSVP_TABLE } from '../services/rsvpService';
import { filterRows, summarize, toCSV, type AdminRsvp } from './rsvpStats';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;
function sb() {
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: true, storageKey: 'advika-admin-auth' } });
  return client;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await sb()!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError('That email and password didn’t match an admin account.');
    else onDone();
  };
  return (
    <form className="panel admin-card" onSubmit={submit} data-testid="admin-signin">
      <h1 className="display" style={{ fontSize: '2rem', margin: '0 0 6px' }}>
        RSVP dashboard
      </h1>
      <p className="fine" style={{ margin: '0 0 20px' }}>
        Sign in with your Supabase admin account to see who’s coming.
      </p>
      <div className="field">
        <label htmlFor="ad-email">Email</label>
        <input id="ad-email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ad-pass">Password</label>
        <input id="ad-pass" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export function Dashboard({ rows, loading, error, onRefresh, onDelete, onSignOut, email }: { rows: AdminRsvp[]; loading: boolean; error: string | null; onRefresh: () => void; onDelete: (r: AdminRsvp) => void; onSignOut: () => void; email?: string }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'all' | 'yes' | 'no'>('all');
  const stats = useMemo(() => summarize(rows), [rows]);
  const visible = useMemo(() => filterRows(rows, q, show), [rows, q, show]);
  const download = () => {
    const blob = new Blob([toCSV(visible)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'advika-rsvps.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="admin-wrap" data-testid="admin-dashboard">
      <header className="admin-head">
        <div>
          <p className="fine" style={{ margin: 0 }}>
            {eventConfig.eventName} · {eventConfig.dateLabel}
          </p>
          <h1 className="display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: '2px 0 0' }}>
            RSVPs
          </h1>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn btn-ghost" onClick={download} disabled={!visible.length}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
          <button className="btn btn-ghost" onClick={onSignOut} title={email}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>

      <section className="admin-stats" aria-label="Summary">
        <div className="panel stat" data-testid="stat-guests">
          <span className="stat-num">{stats.guests}</span>
          <span className="fine">guests coming</span>
        </div>
        <div className="panel stat">
          <span className="stat-num">{stats.attendingHouseholds}</span>
          <span className="fine">replied yes</span>
        </div>
        <div className="panel stat">
          <span className="stat-num">{stats.declined}</span>
          <span className="fine">can’t make it</span>
        </div>
        <div className="panel stat">
          <span className="stat-num">{stats.replies}</span>
          <span className="fine">total replies</span>
        </div>
      </section>

      <div className="panel admin-table-card">
        <div className="admin-tools">
          <label className="admin-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search names and messages</span>
            <input className="input" placeholder="Search names or messages" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="seg" role="group" aria-label="Filter">
            {(['all', 'yes', 'no'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}>
                {k === 'all' ? 'All' : k === 'yes' ? 'Coming' : 'Not coming'}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!error && !loading && visible.length === 0 && <p className="fine">{rows.length ? 'No replies match that search.' : 'No RSVPs yet. They’ll appear here as guests reply.'}</p>}
        {visible.length > 0 && (
          <table className="admin-table" data-testid="rsvp-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Coming</th>
                <th scope="col">Guests</th>
                <th scope="col">Message</th>
                <th scope="col">Replied</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td data-label="Name">{r.name}</td>
                  <td data-label="Coming">
                    <span className={`pill ${r.attending ? 'yes' : 'no'}`}>{r.attending ? 'Yes' : 'No'}</span>
                  </td>
                  <td data-label="Guests">{r.attending ? r.attendees : '—'}</td>
                  <td data-label="Message" className="msg">
                    {r.message || <span className="fine">—</span>}
                  </td>
                  <td data-label="Replied">{new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                  <td>
                    <button className="icon-btn" aria-label={`Delete RSVP from ${r.name}`} onClick={() => onDelete(r)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<AdminRsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supa = sb();

  useEffect(() => {
    if (!supa) return;
    supa.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data } = supa.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supa]);

  const load = useCallback(async () => {
    if (!supa) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supa.from(RSVP_TABLE).select('id, name, attending, attendees, message, created_at').order('created_at', { ascending: false });
    setLoading(false);
    if (error) setError('Couldn’t load RSVPs. Make sure this account is listed in the admins table and the dashboard SQL has been run.');
    else setRows((data ?? []) as AdminRsvp[]);
  }, [supa]);

  useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [session, load]);

  if (!supa)
    return (
      <main className="admin-page">
        <div className="panel admin-card">
          <h1 className="display">RSVP dashboard</h1>
          <p>Supabase isn’t configured for this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
        </div>
      </main>
    );

  return (
    <main className="admin-page">
      {!checked ? null : session ? (
        <Dashboard
          rows={rows}
          loading={loading}
          error={error}
          email={session.user.email}
          onRefresh={load}
          onSignOut={() => supa.auth.signOut()}
          onDelete={async (r) => {
            if (!window.confirm(`Delete the RSVP from ${r.name}? This can’t be undone.`)) return;
            const { error } = await supa.from(RSVP_TABLE).delete().eq('id', r.id);
            if (error) setError('Couldn’t delete that RSVP.');
            else setRows((all) => all.filter((x) => x.id !== r.id));
          }}
        />
      ) : (
        <SignIn onDone={load} />
      )}
    </main>
  );
}
