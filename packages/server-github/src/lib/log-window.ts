/**
 * Bounds the `run-view` log output (#1257).
 *
 * A full run log is often thousands of lines (hundreds of KB). Returned whole,
 * it exceeds what MCP clients accept in one tool result, and the agent sees an
 * unmarked fragment. Without an explicit `tailLines`, the log is cut to its
 * last lines under a character budget, and the result always says how many
 * lines the full log had and whether it was cut.
 */

/** Lines kept when the caller sets no `tailLines`. */
export const DEFAULT_LOG_TAIL_LINES = 300;
/** Characters kept when the caller sets no `tailLines`. */
export const DEFAULT_LOG_MAX_CHARS = 30_000;

export interface LogWindowOptions {
  /** Keep exactly the last N (matching) lines, with no character budget. */
  tailLines?: number;
  /** Keep only lines matching this case-insensitive regular expression. */
  grep?: string;
}

export interface LogWindow {
  logs: string;
  /** Lines in the full log. */
  totalLines: number;
  /** Lines matching `grep`, when given. */
  matchedLines?: number;
  /** Lines in `logs`. */
  returnedLines: number;
  /** True when `logs` holds fewer lines than the full (or grep-filtered) log. */
  truncated: boolean;
}

export function windowLog(raw: string, opts: LogWindowOptions = {}): LogWindow {
  const all = raw === "" ? [] : raw.replace(/\r?\n$/, "").split(/\r?\n/);

  let selected = all;
  let matchedLines: number | undefined;
  if (opts.grep !== undefined) {
    let re: RegExp;
    try {
      re = new RegExp(opts.grep, "i");
    } catch (err) {
      throw new Error(
        `grep is not a valid regular expression: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    selected = all.filter((line) => re.test(line));
    matchedLines = selected.length;
  }

  let kept: string[];
  if (opts.tailLines !== undefined) {
    kept = selected.slice(-opts.tailLines);
  } else {
    kept = lastLinesWithin(selected.slice(-DEFAULT_LOG_TAIL_LINES), DEFAULT_LOG_MAX_CHARS);
  }

  return {
    logs: kept.join("\n"),
    totalLines: all.length,
    ...(matchedLines !== undefined ? { matchedLines } : {}),
    returnedLines: kept.length,
    truncated: kept.length < selected.length || kept.at(-1) !== selected.at(-1),
  };
}

/** The longest run of trailing lines whose joined length fits `maxChars`. */
function lastLinesWithin(lines: string[], maxChars: number): string[] {
  let size = 0;
  let start = lines.length;
  while (start > 0) {
    const next = lines[start - 1].length + (start < lines.length ? 1 : 0);
    if (size + next > maxChars) break;
    size += next;
    start--;
  }
  if (start === lines.length && lines.length > 0) {
    // One line alone is over budget: keep its end, where errors usually are.
    return [lines[lines.length - 1].slice(-maxChars)];
  }
  return lines.slice(start);
}
