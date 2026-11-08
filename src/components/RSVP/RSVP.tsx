import { useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Minus, Phone, Plus, Send } from 'lucide-react';
import { eventConfig } from '../../config/eventConfig';
import { hasErrors, validateRsvp, type RsvpErrors, type RsvpInput } from '../../utils/validation';
import { previousSubmission, submitRsvp, toRecord } from '../../services/rsvpService';
import { backendMode, newClientId } from '../../services/backend';
import { telUrl } from '../../utils/links';
import { TransitionManager } from '../../animations/sectionTransitions/TransitionManager';
import { emitBurst } from '../../animations/particleEffects/bursts';
import { audio } from '../../services/audioEngine';
import { Chapter } from '../ui/Chapter';
import { NextChapter } from '../ui/NextChapter';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function RsvpForm() {
  const ids = { name: useId(), msg: useId(), count: useId(), err: useId() };
  const [form, setForm] = useState<RsvpInput>({ name: '', attending: '', attendees: 1, message: '' });
  const [errors, setErrors] = useState<RsvpErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{ attending: boolean; demo: boolean; error?: string } | null>(null);
  const clientId = useRef(newClientId());
  const prior = useMemo(() => previousSubmission(), [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const nameRef = useRef<HTMLInputElement>(null);
  const L = eventConfig.limits;

  const update = <K extends keyof RsvpInput>(k: K, v: RsvpInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof RsvpErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    const errs = validateRsvp(form);
    const clean = Object.fromEntries(Object.entries(errs).filter(([, v]) => v)) as RsvpErrors;
    setErrors(clean);
    if (hasErrors(clean)) {
      const first = Object.keys(clean)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    setStatus('submitting');
    const rec = toRecord(form, clientId.current);
    const res = await submitRsvp(rec);
    if (res.ok) {
      setStatus('success');
      setResult({ attending: rec.attending, demo: res.demo });
      emitBurst([16, 12, -80], rec.attending ? '#ffe2a6' : '#cfe0ff', 300, 7);
      // the form collapses into a short thank-you card: bring that card into view
      // (otherwise the page shifts and the guest is left looking at the next chapter)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          TransitionManager.scrollTo('rsvp');
          document.querySelector<HTMLElement>('[data-testid=rsvp-success]')?.focus({ preventScroll: true });
        }),
      );
      audio.play(rec.attending ? 'reveal' : 'chime');
    } else {
      setStatus('error');
      setResult({ attending: rec.attending, demo: res.demo, error: res.error });
    }
  };

  if (status === 'success' && result) {
    return (
      <div role="status" data-testid="rsvp-success" className="rsvp-success" tabIndex={-1}>
        <CheckCircle2 className="rsvp-success-icon" size={34} aria-hidden="true" />
        <p className="display" style={{ fontSize: '2rem', margin: '0 0 8px' }}>
          {result.attending ? eventConfig.messages.attendingYes : eventConfig.messages.attendingNo}
        </p>
        <p className="fine" style={{ margin: '0 0 16px' }}>
          Thank you, {form.name.trim()}.{' '}
          {result.demo ? 'This is a local demo, so your reply was saved only in this browser. The hosts have not received it yet.' : 'Your reply has been sent to the hosts.'}
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            clientId.current = newClientId();
            setStatus('idle');
            setResult(null);
            setTimeout(() => nameRef.current?.focus(), 0);
          }}
        >
          Change my reply
        </button>
      </div>
    );
  }

  const disabled = status === 'submitting';
  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={status === 'error' ? ids.err : undefined} data-testid="rsvp-form">
      {backendMode === 'demo' && (
        <p className="badge" style={{ margin: '0 0 14px' }} data-testid="demo-badge">
          Demo mode: replies are kept in this browser only
        </p>
      )}
      {prior && status === 'idle' && (
        <p className="fine" style={{ margin: '0 0 12px' }}>
          You already replied from this device as {prior.name}. Sending again updates the hosts with a new reply.
        </p>
      )}
      <div className="field">
        <label htmlFor={ids.name}>Your name</label>
        <input id={ids.name} ref={nameRef} data-field="name" className="input" name="name" autoComplete="name" maxLength={L.nameMax + 10} value={form.name} onChange={(e) => update('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${ids.name}-e` : undefined} disabled={disabled} required />
        {errors.name && (
          <span id={`${ids.name}-e`} className="error" role="alert">
            {errors.name}
          </span>
        )}
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 16px' }} aria-invalid={!!errors.attending} aria-describedby={errors.attending ? 'att-e' : undefined}>
        <legend>Will you attend?</legend>
        <div className="choice" style={{ marginTop: 6 }}>
          {(['yes', 'no'] as const).map((v, i) => (
            <label key={v}>
              <input type="radio" name="attending" value={v} data-field={i === 0 ? 'attending' : undefined} checked={form.attending === v} onChange={() => update('attending', v)} disabled={disabled} />
              {v === 'yes' ? 'Yes, I’ll be there' : 'Sorry, I can’t make it'}
            </label>
          ))}
        </div>
        {errors.attending && (
          <span id="att-e" className="error" role="alert">
            {errors.attending}
          </span>
        )}
      </fieldset>
      {form.attending !== 'no' && (
        <div className="field">
          <label htmlFor={ids.count}>Number of attendees (including you)</label>
          <div className="stepper">
            <button type="button" className="icon-btn" aria-label="One fewer guest" onClick={() => update('attendees', Math.max(1, Number(form.attendees) - 1))} disabled={disabled || Number(form.attendees) <= 1}>
              <Minus size={18} aria-hidden="true" />
            </button>
            <input id={ids.count} data-field="attendees" className="input" type="number" inputMode="numeric" min={1} max={L.maxAttendees} value={form.attendees} onChange={(e) => update('attendees', e.target.value)} aria-invalid={!!errors.attendees} aria-describedby={errors.attendees ? `${ids.count}-e` : undefined} disabled={disabled} />
            <button type="button" className="icon-btn" aria-label="One more guest" onClick={() => update('attendees', Math.min(L.maxAttendees, Number(form.attendees) + 1))} disabled={disabled || Number(form.attendees) >= L.maxAttendees}>
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
          {errors.attendees && (
            <span id={`${ids.count}-e`} className="error" role="alert">
              {errors.attendees}
            </span>
          )}
        </div>
      )}
      <div className="field">
        <label htmlFor={ids.msg}>
          A birthday message for Advika <span className="fine">(optional)</span>
        </label>
        <textarea id={ids.msg} data-field="message" className="input" rows={3} value={form.message} onChange={(e) => update('message', e.target.value)} aria-invalid={!!errors.message} aria-describedby={`${ids.msg}-c`} disabled={disabled} style={{ resize: 'vertical' }} />
        <span id={`${ids.msg}-c`} className={errors.message ? 'error' : 'fine'} role={errors.message ? 'alert' : undefined}>
          {errors.message ?? `${form.message.length}/${L.rsvpMessageMax}`}
        </span>
      </div>
      {status === 'error' && result?.error && (
        <p id={ids.err} className="error" role="alert" data-testid="rsvp-error" style={{ margin: '0 0 14px' }}>
          {result.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={disabled} aria-busy={disabled} data-testid="rsvp-submit">
        {disabled ? <Loader2 size={18} className="spin" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} aria-hidden="true" />}
        {disabled ? 'Sending your reply…' : status === 'error' ? 'Try again' : 'Send my RSVP'}
      </button>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </form>
  );
}

export function RSVP() {
  return (
    <Chapter id="rsvp" align="right" labelledBy="rsvp-title" tall>
      <div className="panel" style={{ width: 'min(100%, 600px)' }}>
        <p className="h-sub" style={{ margin: '0 0 4px' }}>
          Please reply by {eventConfig.rsvpDeadlineLabel}
        </p>
        <h2 id="rsvp-title" className="display h-section" style={{ margin: '0 0 18px' }} tabIndex={-1}>
          Will You Join Our Magical Celebration?
        </h2>
        <RsvpForm />
        <div className="rsvp-contact">
          <p className="fine" style={{ margin: '0 0 10px' }}>
            Questions? Call us
          </p>
          <ul>
            {eventConfig.contacts.map((c) => (
              <li key={c.e164}>
                <a className="call-pill" href={telUrl(c.e164)} aria-label={`Call ${c.display}`} data-testid="tel-link">
                  <Phone size={16} aria-hidden="true" />
                  <span>{c.display}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <NextChapter from="rsvp" />
      </div>
    </Chapter>
  );
}
