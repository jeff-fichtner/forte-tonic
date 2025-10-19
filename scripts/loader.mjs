// ES Module loader to handle Node.js v23 compatibility issues
export async function resolve(specifier, context, defaultResolve) {
  return defaultResolve(specifier, context);
}

export async function load(url, context, defaultLoad) {
  const result = await defaultLoad(url, context);
  
  // Patch problematic packages that try to modify read-only function properties
  if (url.includes('get-intrinsic') || url.includes('uuid')) {
    let source = result.source;
    
    if (typeof source === 'string') {
      // Replace assignments to read-only function.name with try-catch blocks
      source = source.replace(
        /(\w+)\.name\s*=\s*([^;]+);/g,
        'try { $1.name = $2; } catch (e) { /* Node.js v23 compatibility */ }'
      );
      
      // Replace direct arguments.callee usage
      source = source.replace(
        /arguments\.callee/g,
        'null /* arguments.callee disabled in strict mode */'
      );
      
      result.source = source;
    }
  }
  
  return result;
}
