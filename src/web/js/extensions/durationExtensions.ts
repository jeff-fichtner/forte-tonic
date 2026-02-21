// Native Duration extensions

// Add methods to native Duration class for 12-hour format
if (typeof window !== 'undefined' && window.Duration) {
  window.Duration.prototype.to12HourFormat = function () {
    return this.to12Hour();
  };

  // Add method for 24-hour format
  window.Duration.prototype.to24HourFormat = function () {
    return this.to24Hour();
  };
}

// ES module export for proper module loading
export {};
