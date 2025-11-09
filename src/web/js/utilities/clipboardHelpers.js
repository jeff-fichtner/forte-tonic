/**
 * Clipboard utility functions
 */

/**
 * Copy text to clipboard with fallback support
 * @param {string} text - Text to copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    // Attempt to use the Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      if (typeof M !== 'undefined') {
        M.toast({ html: `Copied '${text}' to clipboard.` });
      }
      return;
    }
  } catch (error) {
    console.error('Failed to copy text to clipboard with modern API:', error);
  }

  try {
    // Fallback to execCommand for older browsers
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    if (typeof M !== 'undefined') {
      M.toast({ html: `Copied '${text}' to clipboard.` });
    }
  } catch (error) {
    console.error('Failed to copy text to clipboard with fallback:', error);
    if (typeof M !== 'undefined') {
      M.toast({ html: 'Failed to copy text to clipboard.' });
    }
  }
}
