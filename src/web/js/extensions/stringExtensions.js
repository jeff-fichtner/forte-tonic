// add Capitalize to string prototype
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// ES module export for proper module loading
export {};
