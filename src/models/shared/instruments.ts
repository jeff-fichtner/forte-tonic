export const Instruments = {
  PIANO: 'Piano',
  VOICE: 'Voice',
  GUITAR: 'Guitar',
  BASS_GUITAR: 'Bass Guitar',
  UKULELE: 'Ukulele',
  DRUMS: 'Drums',
  VIOLIN: 'Violin',
} as const;

export type Instrument = (typeof Instruments)[keyof typeof Instruments];
