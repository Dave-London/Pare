/**
 * Strips ANSI escape codes from a string.
 * Handles SGR (colors/styles), cursor movement, and other terminal sequences.
 */
const ANSI_REGEX = /\x1B(?:\][^\x07]*\x07|\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}
