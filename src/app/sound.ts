import { useSyncExternalStore } from 'react';

/**
 * Card-table sounds, synthesised with Web Audio so there are no audio files to load:
 * a soft paper "tick" for each move, a riffle for dealing, a chime for winning.
 * Also gives a light vibration on phones. One switch controls both.
 */
export type Sound = 'place' | 'deal' | 'win' | 'lose';

const KEY = 'talonbox:sound';
const EVENT = 'talonbox:sound';
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastPlace = 0;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSoundEnabled(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    soundEnabled,
    () => true,
  );
  return [on, setSoundEnabled];
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/** A short band-passed noise burst: the sound of a card landing on cloth. */
function tick(a: AudioContext, at: number, freq: number, gain: number, length = 0.05) {
  const src = a.createBufferSource();
  src.buffer = noise;
  const band = a.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = 0.9;
  const env = a.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(band).connect(env).connect(a.destination);
  src.start(at, Math.random() * 0.1, length + 0.02);
}

function tone(a: AudioContext, at: number, freq: number, length: number, gain = 0.09, type: OscillatorType = 'triangle') {
  const osc = a.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const env = a.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(env).connect(a.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

// Creating an AudioContext can take a moment; do it on the first user gesture, not mid-game.
if (typeof window !== 'undefined') {
  const warm = () => {
    if (soundEnabled()) audio();
  };
  window.addEventListener('pointerdown', warm, { once: true, capture: true });
  window.addEventListener('keydown', warm, { once: true, capture: true });
}

/**
 * Plays after the current frame so sound never delays the screen update it accompanies.
 * `haptic: false` for moves the player didn't make (CPU turns, auto-play): sound but no buzz.
 */
export function play(sound: Sound, { haptic = true }: { haptic?: boolean } = {}) {
  if (!soundEnabled()) return;
  window.setTimeout(() => playNow(sound, haptic), 0);
}

/** Browsers only allow sound and vibration after the visitor has interacted with the page. */
const userHasInteracted = () => navigator.userActivation?.hasBeenActive ?? true;

function playNow(sound: Sound, haptic: boolean) {
  if (!userHasInteracted()) return;
  const a = audio();
  if (sound === 'place') {
    // Several moves in one frame (auto-play) should still sound like one card.
    const now = performance.now();
    if (now - lastPlace < 45) return;
    lastPlace = now;
    if (haptic) navigator.vibrate?.(6);
  }
  if (!a) return;
  const t = a.currentTime + 0.01;
  switch (sound) {
    case 'place':
      tick(a, t, 1700 + Math.random() * 500, 0.35);
      break;
    case 'deal':
      for (let i = 0; i < 14; i++) tick(a, t + i * 0.035 + Math.random() * 0.01, 2200 + Math.random() * 900, 0.22, 0.035);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, t + i * 0.12, f, 0.6));
      if (haptic) navigator.vibrate?.([20, 60, 20]);
      break;
    case 'lose':
      tone(a, t, 392, 0.35, 0.07);
      tone(a, t + 0.22, 311.13, 0.6, 0.07);
      break;
  }
}
