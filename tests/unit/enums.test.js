import { Instruments, LengthOptions } from '../../src/models/shared/index.js';

describe('Enums', () => {
  describe('Instruments', () => {
    test('should have all expected instrument values', () => {
      expect(Instruments.PIANO).toBe('Piano');
      expect(Instruments.VOICE).toBe('Voice');
      expect(Instruments.GUITAR).toBe('Guitar');
      expect(Instruments.BASS_GUITAR).toBe('Bass Guitar');
      expect(Instruments.UKULELE).toBe('Ukulele');
      expect(Instruments.DRUMS).toBe('Drums');
      expect(Instruments.VIOLIN).toBe('Violin');
    });

    test('should have exactly 7 instruments', () => {
      const instrumentKeys = Object.keys(Instruments);
      expect(instrumentKeys).toHaveLength(7);
    });

    test('should have consistent key-value mapping', () => {
      expect(Instruments.PIANO).toContain('Piano');
      expect(Instruments.VOICE).toContain('Voice');
      expect(Instruments.GUITAR).toContain('Guitar');
    });
  });

  describe('LengthOptions', () => {
    test('should have all expected length values', () => {
      expect(LengthOptions.THIRTY_MINUTES).toBe(30);
      expect(LengthOptions.FORTY_FIVE_MINUTES).toBe(45);
      expect(LengthOptions.SIXTY_MINUTES).toBe(60);
    });

    test('should have exactly 3 length options', () => {
      const lengthKeys = Object.keys(LengthOptions);
      expect(lengthKeys).toHaveLength(3);
    });

    test('should have numeric values', () => {
      Object.values(LengthOptions).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });

    test('should have ascending order values', () => {
      expect(LengthOptions.THIRTY_MINUTES).toBeLessThan(LengthOptions.FORTY_FIVE_MINUTES);
      expect(LengthOptions.FORTY_FIVE_MINUTES).toBeLessThan(LengthOptions.SIXTY_MINUTES);
    });
  });
});
