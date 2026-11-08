import type { Vec3 } from '../../config/worldLayout';

export interface BurstRequest {
  pos: Vec3;
  color: string;
  count: number;
  speed: number;
}

/** Tiny queue so DOM code and 3D code can both request particle bursts. */
const queue: BurstRequest[] = [];
export const burstQueue = queue;

export function emitBurst(pos: Vec3, color = '#ffe6a8', count = 120, speed = 4) {
  queue.push({ pos, color, count, speed });
  if (queue.length > 32) queue.shift();
}
