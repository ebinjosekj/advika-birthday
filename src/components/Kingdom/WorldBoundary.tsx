import { Component, type ReactNode } from 'react';

/** If the GPU context fails at runtime, fall back to the painted world instead of a blank page. */
export class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('3D world unavailable, using painted fallback:', err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
