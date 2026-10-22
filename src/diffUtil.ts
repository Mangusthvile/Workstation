export interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export function computeSimpleDiff(original: string, revised: string): DiffToken[] {
  // Simple token-based word diff algorithm
  const origWords = original.split(/(\s+)/);
  const revWords = revised.split(/(\s+)/);

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;

  while (i < origWords.length || j < revWords.length) {
    if (i < origWords.length && j < revWords.length && origWords[i] === revWords[j]) {
      tokens.push({ type: 'unchanged', value: origWords[i] });
      i++;
      j++;
    } else {
      // Lookahead window to find match
      let matchOrig = -1;
      let matchRev = -1;
      const lookahead = 6;

      for (let offset = 1; offset <= lookahead; offset++) {
        if (i + offset < origWords.length && j < revWords.length && origWords[i + offset] === revWords[j]) {
          matchOrig = i + offset;
          break;
        }
        if (j + offset < revWords.length && i < origWords.length && origWords[i] === revWords[j + offset]) {
          matchRev = j + offset;
          break;
        }
      }

      if (matchOrig !== -1) {
        // Words removed from original
        while (i < matchOrig) {
          tokens.push({ type: 'removed', value: origWords[i] });
          i++;
        }
      } else if (matchRev !== -1) {
        // Words added to revised
        while (j < matchRev) {
          tokens.push({ type: 'added', value: revWords[j] });
          j++;
        }
      } else {
        if (i < origWords.length && origWords[i].trim()) {
          tokens.push({ type: 'removed', value: origWords[i] });
          i++;
        } else if (i < origWords.length) {
          i++;
        }
        if (j < revWords.length && revWords[j].trim()) {
          tokens.push({ type: 'added', value: revWords[j] });
          j++;
        } else if (j < revWords.length) {
          tokens.push({ type: 'added', value: revWords[j] });
          j++;
        }
      }
    }
  }

  return tokens;
}
