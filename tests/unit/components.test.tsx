import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RsvpForm } from '../../src/components/RSVP/RSVP';
import { WishGarden } from '../../src/components/Wishes/Wishes';

describe('<RsvpForm>', () => {
  beforeEach(() => localStorage.clear());

  it('shows clear errors and focuses the first invalid field', async () => {
    render(<RsvpForm />);
    await userEvent.click(screen.getByRole('button', { name: /send my rsvp/i }));
    expect(await screen.findByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Please choose whether you can attend.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveFocus();
    expect(screen.getByLabelText('Your name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits a “yes”, shows loading, then the attending message', async () => {
    render(<RsvpForm />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Riya');
    await userEvent.click(screen.getByLabelText(/yes, i’ll be there/i));
    await userEvent.click(screen.getByRole('button', { name: /one more guest/i }));
    expect(screen.getByLabelText(/number of attendees/i)).toHaveValue(2);
    await userEvent.click(screen.getByRole('button', { name: /send my rsvp/i }));
    expect(screen.getByRole('button', { name: /sending your reply/i })).toBeDisabled();
    expect(await screen.findByText('Yay! Your magical adventure awaits!', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/local demo/i)).toBeInTheDocument();
  });

  it('submits a “no” and hides the attendee count', async () => {
    render(<RsvpForm />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Omar');
    await userEvent.click(screen.getByLabelText(/can’t make it/i));
    expect(screen.queryByLabelText(/number of attendees/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /send my rsvp/i }));
    expect(await screen.findByText('We’ll miss you! Sending magical wishes your way.', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('shows the failure state', async () => {
    window.history.replaceState(null, '', '/?demoFail=1');
    render(<RsvpForm />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Lena');
    await userEvent.click(screen.getByLabelText(/yes, i’ll be there/i));
    await userEvent.click(screen.getByRole('button', { name: /send my rsvp/i }));
    expect(await screen.findByTestId('rsvp-error', {}, { timeout: 3000 })).toHaveTextContent(/not saved/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
    window.history.replaceState(null, '', '/');
  });
});

describe('<WishGarden>', () => {
  beforeEach(() => localStorage.clear());

  it('validates, then renders a submitted wish as text (no HTML injection)', async () => {
    const { container } = render(<WishGarden />);
    await userEvent.click(screen.getByRole('button', { name: /send my wish/i }));
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your wish'), '<b onmouseover=x>Sparkle on</b>');
    await userEvent.click(screen.getByRole('button', { name: /send my wish/i }));
    await waitFor(() => expect(within(screen.getByTestId('wish-list')).getByText('<b onmouseover=x>Sparkle on</b>')).toBeInTheDocument(), { timeout: 3000 });
    expect(container.querySelector('[data-testid=wish-list] b')).toBeNull();
    expect(screen.getByTestId('wish-confirm')).toHaveTextContent(/floating up/i);
  });
});
