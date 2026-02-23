/** Strip UTF-8 BOM (byte order mark) from string content. */
export function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/** Check if a value is a plain object (not an array, null, or primitive). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strip JSON comments (JSONC) from a string so it can be parsed by JSON.parse.
 * Handles single-line (//) and block comments, respecting strings.
 *
 * VS Code, Zed, and other editors commonly use JSONC for config files.
 * We must strip comments before parsing to avoid data loss.
 */
export function stripJsonComments(input: string): string {
  let result = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // String literal — copy verbatim including any escape sequences
    if (ch === '"') {
      result += '"';
      i++;
      while (i < len) {
        const sc = input[i];
        result += sc;
        i++;
        if (sc === "\\") {
          // Copy escaped character
          if (i < len) {
            result += input[i];
            i++;
          }
        } else if (sc === '"') {
          break;
        }
      }
      continue;
    }

    // Single-line comment
    if (ch === "/" && i + 1 < len && input[i + 1] === "/") {
      i += 2;
      while (i < len && input[i] !== "\n") {
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === "/" && i + 1 < len && input[i + 1] === "*") {
      i += 2;
      while (i < len) {
        if (input[i] === "*" && i + 1 < len && input[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Parse a JSONC string (JSON with comments) into a value.
 * Strips comments and BOM, then delegates to JSON.parse.
 */
export function parseJsonc(input: string): unknown {
  return JSON.parse(stripJsonComments(stripBom(input).trim()));
}
