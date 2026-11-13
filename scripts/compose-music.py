"""
Renders the invitation's background music: "Advika's Waltz", an original
music-box lullaby in D major (3/4). Pure synthesis — no samples, no licences.

  python3 scripts/compose-music.py            # writes public/audio/advika-waltz.wav
  ffmpeg -i public/audio/advika-waltz.wav -codec:a libmp3lame -b:a 96k public/audio/advika-waltz.mp3

The piece is 48 bars and ends on a pickup note that leads straight back into
bar 1; note tails and reverb past the end are folded onto the start, so the
file loops seamlessly.
"""
import os
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
BPM = 80
BEAT = 60 / BPM
BAR = 3 * BEAT
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- score
CH = {  # bass, upper chord tones
    'D': (50, [62, 66, 69]), 'Bm': (47, [62, 66, 71]), 'G': (43, [62, 67, 71]),
    'A': (45, [61, 64, 69]), 'Em7': (40, [62, 64, 67]), 'A7': (45, [61, 64, 67]),
    'F#m': (42, [61, 66, 69]), 'D/F#': (42, [62, 66, 69]), 'Em': (40, [64, 67, 71]),
    'Gm': (43, [62, 67, 70]), 'B7': (47, [63, 66, 69]),
}
A1 = [('D', [(0, 2, 78), (2, 1, 81)]), ('Bm', [(0, 2, 86), (2, 1, 83)]),
      ('G', [(0, 1.5, 83), (1.5, .5, 81), (2, 1, 79)]), ('A', [(0, 3, 76)]),
      ('D', [(0, 2, 78), (2, 1, 81)]), ('Bm', [(0, 1, 86), (1, 1, 85), (2, 1, 83)]),
      ('Em7', [(0, 1.5, 79), (1.5, .5, 78), (2, 1, 76)]), ('A7', [(0, 2, 76), (2, 1, 73)])]
A2 = [('D', [(0, 2, 74), (2, 1, 78)]), ('F#m', [(0, 2, 81), (2, 1, 85)]),
      ('G', [(0, 1, 83), (1, 1, 86), (2, 1, 83)]), ('D/F#', [(0, 3, 81)]),
      ('Em', [(0, 1, 79), (1, 1, 83), (2, 1, 79)]), ('A', [(0, 1.5, 78), (1.5, .5, 76), (2, 1, 73)]),
      ('D', [(0, 3, 74)]), ('D', [(2, 1, 69)])]
B = [('G', [(0, 2, 83), (2, 1, 86)]), ('A', [(0, 2, 85), (2, 1, 88)]),
     ('F#m', [(0, 2, 81), (2, 1, 85)]), ('Bm', [(0, 1.5, 86), (1.5, .5, 85), (2, 1, 83)]),
     ('Em', [(0, 1, 79), (1, 1, 83), (2, 1, 88)]), ('A', [(0, 1, 86), (1, 1, 85), (2, 1, 81)]),
     ('D', [(0, 2, 78), (2, 1, 81)]), ('A7', [(0, 2, 79), (2, 1, 76)]),
     ('G', [(0, 2, 83), (2, 1, 79)]), ('Gm', [(0, 2, 82), (2, 1, 79)]),
     ('D', [(0, 1, 78), (1, 1, 81), (2, 1, 86)]), ('B7', [(0, 2, 87), (2, 1, 83)]),
     ('Em', [(0, 2, 88), (2, 1, 83)]), ('A7', [(0, 1, 85), (1, 1, 81), (2, 1, 79)]),
     ('D', [(0, 2, 78), (2, 1, 76)]), ('A', [(0, 2, 76), (2, 1, 73)])]
SCORE = A1 + A2 + B + A1 + A2
N_BARS = len(SCORE)
LENGTH = int(round(N_BARS * BAR * SR))
TAIL = int(6 * SR)
L = np.zeros((LENGTH + TAIL, 2))


def add(buf, start_s, sig, pan=0.0, gain=1.0):
    i = max(0, int(round(start_s * SR)))
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    n = min(len(sig), len(buf) - i)
    buf[i:i + n, 0] += sig[:n] * l * gain
    buf[i:i + n, 1] += sig[:n] * r * gain


# ---------------------------------------------------------------- voices
def music_box(m, vel=1.0):
    f = hz(m)
    dur = 3.2
    t = np.arange(int(dur * SR)) / SR
    # steel-tine partials: slightly inharmonic, the high ones die fast
    parts = [(1, 1.0, 1.6), (2.0, .18, 0.9), (3.98, .22, 0.45), (8.1, .08, 0.18), (13.6, .03, .08)]
    s = np.zeros_like(t)
    for ratio, amp, dec in parts:
        if f * ratio < SR / 2.2:
            s += amp * np.sin(2 * np.pi * f * ratio * t + rng.random() * 6) * np.exp(-t / dec)
    atk = np.minimum(1, t / 0.002)
    return s * atk * vel * 0.22


def harp(m, vel=1.0, dur=2.6):
    f = hz(m)
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for k, amp in enumerate([1, .45, .22, .1, .05], start=1):
        s += amp * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.1 + k * 0.9))
    return s * np.minimum(1, t / 0.004) * vel * 0.16


def pad(notes, dur):
    t = np.arange(int((dur + 1.2) * SR)) / SR
    s = np.zeros_like(t)
    for m in notes:
        for det in (-5, 0, 6):
            f = hz(m) * 2 ** (det / 1200)
            vib = 1 + 0.002 * np.sin(2 * np.pi * 4.8 * t + rng.random() * 6)
            ph = 2 * np.pi * np.cumsum(f * vib) / SR
            for k, amp in enumerate([1, .4, .18, .08], start=1):
                s += amp * np.sin(k * ph)
    env = np.minimum(1, t / 0.9) * np.clip((dur + 1.2 - t) / 1.2, 0, 1)
    return s * env * 0.012


def bass(m, dur):
    t = np.arange(int(dur * SR)) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + .5 * np.sin(4 * np.pi * f * t) + .2 * np.sin(6 * np.pi * f * t)
    return s * np.exp(-t / 1.4) * np.minimum(1, t / 0.01) * 0.11


# ---------------------------------------------------------------- render
section_of = ['A'] * 16 + ['B'] * 16 + ['A'] * 16
for b, (ch, mel) in enumerate(SCORE):
    t0 = b * BAR
    root, tones = CH[ch]
    # gentle humanisation
    hum = lambda: rng.normal(0, 0.006)
    for beat, length, m in mel:
        add(L, t0 + beat * BEAT + hum(), music_box(m, 0.9 + rng.random() * 0.15), pan=0.12)
        # a soft octave-down doubling on the long notes, like a second comb
        if length >= 2:
            add(L, t0 + beat * BEAT + 0.012, music_box(m - 12, 0.35), pan=-0.1)
    add(L, t0 + hum(), bass(root, BAR * 1.1), pan=-0.05)
    add(L, t0 + hum(), harp(root + 12, 0.6), pan=-0.25)
    if section_of[b] == 'B':
        # rolling eighth-note arpeggio
        seq = [tones[0], tones[1], tones[2], tones[1] + 12, tones[2], tones[1]]
        for i, m in enumerate(seq):
            add(L, t0 + i * BEAT / 2 + hum(), harp(m, 0.55 if i else 0.7, 1.8), pan=-0.3 + i * 0.1)
    else:
        for beat in (1, 2):
            for j, m in enumerate(tones):
                add(L, t0 + beat * BEAT + j * 0.018 + hum(), harp(m, 0.42), pan=-0.35 + j * 0.2)
    add(L, t0, pad(tones, BAR), pan=0.0, gain=1.0 if section_of[b] == 'B' else 0.75)

# fold everything past the loop point back onto the start → seamless loop
dry = L[:LENGTH].copy()
dry[:TAIL] += L[LENGTH:]

# stereo hall: decaying filtered noise, convolved circularly
ir_len = int(3.2 * SR)
ti = np.arange(ir_len) / SR
sos = butter(2, 5200, 'low', fs=SR, output='sos')
ir = np.stack([sosfilt(sos, rng.normal(0, 1, ir_len)) * np.exp(-ti / 0.75) for _ in range(2)], axis=1)
ir[: int(0.012 * SR)] = 0  # predelay
ir /= np.sqrt((ir ** 2).sum(axis=0))
wet = np.zeros_like(dry)
for c in range(2):
    full = fftconvolve(dry[:, c], ir[:, c])  # length LENGTH + ir_len - 1
    wet[:, c] = full[:LENGTH]
    wet[: len(full) - LENGTH, c] += full[LENGTH:]  # circular wrap
mix = dry * 0.78 + wet * 0.42

# gentle high-pass (phone speakers) and normalise
mix = sosfilt(butter(1, 45, 'high', fs=SR, output='sos'), mix, axis=0)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.1) * 0.86

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'advika-waltz.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
from scipy.io import wavfile
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f'{N_BARS} bars, {LENGTH / SR:.1f}s -> {out}')
