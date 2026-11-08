/**
 * Geography of the kingdom (world units ≈ metres) and the camera stations that
 * each page section flies to. The scroll position interpolates between stations.
 */
export type Vec3 = [number, number, number];

export interface IslandDef {
  pos: Vec3;
  radius: number;
  depth: number;
  seed: number;
  flat: { x: number; z: number; r: number; h: number }[];
}

export const ISLANDS: Record<'waterfall' | 'forest' | 'meadow' | 'castle', IslandDef> = {
  waterfall: { pos: [-38, 8, 40], radius: 17, depth: 22, seed: 11, flat: [{ x: 6, z: 2, r: 4, h: 0.6 }] },
  forest: { pos: [-60, 0, -44], radius: 24, depth: 26, seed: 23, flat: [{ x: 24, z: 0, r: 4, h: 1.5 }] },
  meadow: { pos: [36, -1, -46], radius: 21, depth: 24, seed: 37, flat: [{ x: -19, z: 0, r: 4, h: 1.5 }, { x: 6, z: -8, r: 5, h: 0.9 }] },
  castle: {
    pos: [0, 0, -118],
    radius: 40,
    depth: 34,
    seed: 5,
    flat: [
      { x: 0, z: -12, r: 24, h: 1 },
      { x: 0, z: 21, r: 8, h: 1 },
      { x: 0, z: 8, r: 5, h: 1 },
    ],
  },
};

export const LANDMARKS = {
  castle: [0, 0, -130] as Vec3,
  castleDoor: [0, 0, -113.6] as Vec3,
  cake: [0, 0, -97] as Vec3,
  seven: [-5.5, 5.4, -101] as Vec3,
  book: [0, 66, 128] as Vec3,
  celestialClock: [10, 52, -190] as Vec3,
  hiddenStar: [30, 70, -170] as Vec3,
  detailArtifacts: [-48, 6, -34] as Vec3,
  bridgeStart: [-40, 2.5, -44] as Vec3,
  bridgeEnd: [20, 2.5, -46] as Vec3,
  mushrooms: [-54, 0.2, -36] as Vec3,
  fabrics: [36, 5, -44] as Vec3,
  wishingGarden: [42, -1, -54] as Vec3,
};

export const SECTION_IDS = [
  'home',
  'birthday',
  'countdown',
  'details',
  'location',
  'dress-code',
  'rsvp',
  'wishes',
  'finale',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface Station {
  id: SectionId;
  pos: Vec3;
  look: Vec3;
  /** 0 = golden hour, 1 = moonlight */
  mood: number;
  fairy: Vec3;
  /** where the subject sits on screen (NDC, desktop) so it is never hidden behind the panel */
  frame: [number, number];
}

export const STATIONS: Station[] = [
  { id: 'home', pos: [0, 17, -30], look: [0, 16, -122], mood: 0.05, fairy: [9, 16, -56], frame: [0.42, 0.04] },
  { id: 'birthday', pos: [7, 5.6, -82], look: [0, 3.2, -97], mood: 0.18, fairy: [-3.5, 5.4, -90], frame: [-0.4, 0.02] },
  { id: 'countdown', pos: [-4, 50, -62], look: [8, 54, -190], mood: 0.92, fairy: [-9, 52, -82], frame: [0, 0.4] },
  { id: 'details', pos: [-30, 8.5, -16], look: [-52, 5, -40], mood: 0.28, fairy: [-40, 9, -26], frame: [0.4, 0] },
  { id: 'location', pos: [-46, 9, -30], look: [18, 7, -46], mood: 0.38, fairy: [-30, 10, -40], frame: [-0.38, 0] },
  { id: 'dress-code', pos: [20, 6.5, -26], look: [36, 4.5, -46], mood: 0.2, fairy: [28, 8, -34], frame: [0.4, 0] },
  { id: 'rsvp', pos: [18, 10, -60], look: [0, 13, -122], mood: 0.5, fairy: [9, 12, -76], frame: [-0.44, 0.08] },
  { id: 'wishes', pos: [53, 6.5, -37], look: [43, 2, -56], mood: 0.86, fairy: [47, 6, -46], frame: [0.4, 0] },
  { id: 'finale', pos: [26, 42, 36], look: [0, 6, -105], mood: 0.62, fairy: [0, 22, -118], frame: [0, 0.3] },
];

/** Intro flight: clouds → book → island → forest → rainbow bridge → castle doors. */
export const INTRO_PATH: { pos: Vec3[]; look: Vec3[] } = {
  pos: [
    [0, 74, 210],
    [0, 70, 160],
    [0, 67, 139],
    [0, 64, 118],
    [-14, 30, 78],
    [-30, 16, 34],
    [-44, 10, -6],
    [-36, 11, -38],
    [-6, 12, -46],
    [6, 10, -72],
    [0, 8, -90],
    [0, 7.2, -100],
  ],
  look: [
    [0, 68, 128],
    [0, 64.5, 128],
    [0, 63.5, 128],
    [0, 60, 80],
    [-38, 10, 40],
    [-42, 6, 10],
    [-58, 4, -40],
    [-6, 10, -46],
    [6, 10, -80],
    [0, 8, -114],
    [0, 5, -114],
    [0, 4.6, -114],
  ],
};
