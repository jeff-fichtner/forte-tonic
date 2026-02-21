describe('Simple Test', () => {
  test('should work with ES modules', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
