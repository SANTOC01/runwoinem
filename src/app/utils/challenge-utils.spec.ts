import { detectRankUp } from './challenge-utils';

const r = (...pairs: [string, number][]) => pairs.map(([name, value]) => ({ name, value }));

describe('detectRankUp', () => {
  it('reports places climbed and who was overtaken', () => {
    const before = r(['Anna', 50], ['Ben', 40], ['Cleo', 30], ['Dan', 20]);
    const after = r(['Anna', 50], ['Dan', 45], ['Ben', 40], ['Cleo', 30]);
    expect(detectRankUp(before, after, 'Dan')).toEqual({ name: 'Dan', from: 4, to: 2, overtaken: ['Ben', 'Cleo'] });
  });

  it('returns null when the place does not change', () => {
    const before = r(['Anna', 50], ['Ben', 40]);
    const after = r(['Anna', 50], ['Ben', 45]);
    expect(detectRankUp(before, after, 'Ben')).toBeNull();
  });

  it('treats a newcomer as climbing past everyone below them', () => {
    const before = r(['Anna', 50], ['Ben', 10]);
    const after = r(['Anna', 50], ['Eve', 20], ['Ben', 10]);
    expect(detectRankUp(before, after, 'Eve')).toEqual({ name: 'Eve', from: null, to: 2, overtaken: ['Ben'] });
  });

  it('returns null for a newcomer in last place', () => {
    const before = r(['Anna', 50]);
    const after = r(['Anna', 50], ['Eve', 5]);
    expect(detectRankUp(before, after, 'Eve')).toBeNull();
  });
});
