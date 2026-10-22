export interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Word-level diff between two texts.
 *
 * The previous version greedily looked ahead 6 tokens and often reported
 * matching words as removed and re-added once edits got larger than a word or
 * two. This uses the Myers O((N+M)·D) shortest-edit-script algorithm, so the
 * result is a true minimal diff. Common leading/trailing text is trimmed first,
 * and adjacent tokens of the same type are merged so the view renders far
 * fewer <span>s.
 */

// Above this many edits the exact search gets expensive; the remaining middle
// section is shown as one removal plus one addition instead.
const MAX_EDIT_DISTANCE = 2000;

type Op = [DiffToken['type'], string];

const tokenize = (text: string) => text.split(/(\s+)/).filter((t) => t.length > 0);

export function computeSimpleDiff(original: string, revised: string): DiffToken[] {
  const a = tokenize(original);
  const b = tokenize(revised);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const out: DiffToken[] = [];
  const push = (type: DiffToken['type'], value: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({ type, value });
  };

  for (let i = 0; i < start; i++) push('unchanged', a[i]);
  for (const [type, value] of myersMiddle(a.slice(start, endA), b.slice(start, endB))) push(type, value);
  for (let i = endA; i < a.length; i++) push('unchanged', a[i]);

  return out;
}

function myersMiddle(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  if (n === 0) return b.map((t): Op => ['added', t]);
  if (m === 0) return a.map((t): Op => ['removed', t]);

  const max = Math.min(n + m, MAX_EDIT_DISTANCE);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  // trace[d] holds the slice v[-d..d] after step d, which is all backtracking needs.
  const trace: Int32Array[] = [];
  let found = -1;

  for (let d = 0; d <= max && found < 0; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }

  if (found < 0) {
    // Too different to diff precisely within budget: replace the whole block.
    const removed = a.map((t): Op => ['removed', t]);
    const added = b.map((t): Op => ['added', t]);
    return [...removed, ...added];
  }

  // Walk back through the trace to recover the edit script.
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const prev = trace[d - 1]; // indexed by k + (d - 1)
    const k = x - y;
    const get = (kk: number) => prev[kk + d - 1];
    const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
    const prevX = get(prevK);
    const prevY = prevX - prevK;
    // Follow the diagonal (matching tokens) back to the point just after this step's edit.
    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.push(['unchanged', a[x]]);
    }
    if (x === prevX) {
      y--;
      ops.push(['added', b[y]]);
    } else {
      x--;
      ops.push(['removed', a[x]]);
    }
  }
  while (x > 0 && y > 0) {
    x--;
    y--;
    ops.push(['unchanged', a[x]]);
  }
  return ops.reverse();
}
