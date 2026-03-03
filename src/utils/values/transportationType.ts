export const TransportationType = {
  BUS: 'bus',
  PICKUP: 'pickup',
} as const;

export type TransportationTypeValue = (typeof TransportationType)[keyof typeof TransportationType];
