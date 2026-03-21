/**
 * Minimal PHP serialize parser (arrays, strings, int, float, bool, null).
 * Laravel/PHP APIs sometimes return serialized strings instead of JSON.
 */

export function phpUnserialize(input: string): unknown {
  let pos = 0;
  const s = input;

  function parseValue(): unknown {
    const c = s[pos];
    if (c === undefined) throw new Error('Unexpected end');

    if (c === 'N' && s[pos + 1] === ';') {
      pos += 2;
      return null;
    }

    if (c === 'b' && s[pos + 1] === ':') {
      pos += 2;
      const v = s[pos] === '1';
      pos += 2; // digit + ;
      return v;
    }

    if (c === 'i' && s[pos + 1] === ':') {
      pos += 2;
      const end = s.indexOf(';', pos);
      const n = parseInt(s.slice(pos, end), 10);
      pos = end + 1;
      return n;
    }

    if (c === 'd' && s[pos + 1] === ':') {
      pos += 2;
      const end = s.indexOf(';', pos);
      const n = parseFloat(s.slice(pos, end));
      pos = end + 1;
      return n;
    }

    if (c === 's' && s[pos + 1] === ':') {
      pos += 2;
      const colon = s.indexOf(':', pos);
      const len = parseInt(s.slice(pos, colon), 10);
      pos = colon + 1;
      if (s[pos] !== '"') throw new Error('Bad string');
      pos++;
      const out = s.slice(pos, pos + len);
      pos += len;
      if (s[pos] !== '"') throw new Error('Bad string end');
      pos++;
      if (s[pos] !== ';') throw new Error('Bad string ;');
      pos++;
      return out;
    }

    if (c === 'a' && s[pos + 1] === ':') {
      pos += 2;
      const colon = s.indexOf(':', pos);
      const count = parseInt(s.slice(pos, colon), 10);
      pos = colon + 1;
      if (s[pos] !== '{') throw new Error('Bad array');
      pos++;
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < count; j++) {
        const key = parseValue();
        const val = parseValue();
        obj[String(key)] = val;
      }
      if (s[pos] !== '}') throw new Error('Bad array }');
      pos++;
      return obj;
    }

    throw new Error(`Unknown token ${c} at ${pos}`);
  }

  const out = parseValue();
  return out;
}

/** PHP array object → ordered JS array when keys are 0..n-1 */
export function phpArrayValues(val: unknown): unknown[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  if (typeof val !== 'object') return [val];
  const o = val as Record<string, unknown>;
  const keys = Object.keys(o);
  const nums = keys.map((k) => parseInt(k, 10)).filter((k) => !isNaN(k));
  if (nums.length !== keys.length) return Object.values(o);
  nums.sort((a, b) => a - b);
  if (nums.length === 0) return [];
  const sequential = nums.every((n, i) => n === i);
  if (sequential) return nums.map((i) => o[String(i)]);
  return Object.values(o);
}

export function extractScalar(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  const arr = phpArrayValues(v);
  if (arr.length) {
    for (const x of arr) {
      const s = extractScalar(x);
      if (s) return s;
    }
  }
  return '';
}

/** Rows for installation grid: { title, quantity } */
export function normalizeInstallationItems(raw: unknown): { title: string; quantity: string }[] {
  if (raw == null || raw === '') return [];
  let data: unknown = raw;
  if (typeof raw === 'string' && /^[aNidsb]:/.test(raw.trim())) {
    try {
      data = phpUnserialize(raw.trim());
    } catch {
      return [];
    }
  }
  const rows = phpArrayValues(data);
  return rows.map((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      const o = row as Record<string, unknown>;
      if ('title' in o || 'quantity' in o) {
        return {
          title: String(o['title'] ?? ''),
          quantity: String(o['quantity'] ?? ''),
        };
      }
      const inner = phpArrayValues(o);
      if (inner.length >= 2) {
        return { title: extractScalar(inner[0]), quantity: extractScalar(inner[1]) };
      }
    }
    if (Array.isArray(row) && row.length >= 2) {
      return { title: String(row[0] ?? ''), quantity: String(row[1] ?? '') };
    }
    return { title: extractScalar(row), quantity: '' };
  });
}

export interface CivilItemView {
  title: string;
  content: { title: string; quantity: string }[];
}

export function normalizeCivilItems(raw: unknown): CivilItemView[] {
  if (raw == null || raw === '') return [];
  let data: unknown = raw;
  if (typeof raw === 'string' && /^[aNidsb]:/.test(raw.trim())) {
    try {
      data = phpUnserialize(raw.trim());
    } catch {
      return [];
    }
  }
  const groups = phpArrayValues(data);
  const out: CivilItemView[] = [];

  for (const g of groups) {
    if (g == null) continue;
    if (typeof g !== 'object' || Array.isArray(g)) {
      out.push({ title: extractScalar(g), content: [] });
      continue;
    }
    const o = g as Record<string, unknown>;
    const vals = phpArrayValues(o);
    if (vals.length === 0) {
      out.push({ title: '', content: [] });
      continue;
    }

    const isScalarWrapper = (x: unknown): boolean => {
      if (x == null || typeof x !== 'object' || Array.isArray(x)) return false;
      return phpArrayValues(x).length === 1;
    };

    /** PHP civil rows often serialize as three nested single-string arrays (label / qty / note). */
    if (vals.length === 3 && vals.every(isScalarWrapper)) {
      const a = extractScalar(vals[0]);
      const b = extractScalar(vals[1]);
      const c = extractScalar(vals[2]);
      out.push({
        title: a || 'Additional item',
        content: [{ title: b, quantity: c }],
      });
      continue;
    }

    const title = extractScalar(vals[0]) || 'Additional item';
    const content: { title: string; quantity: string }[] = [];

    for (let i = 1; i < vals.length; i++) {
      const row = vals[i];
      const normalized = normalizeInstallationItems(row);
      if (normalized.length) {
        content.push(...normalized);
      } else {
        const s = extractScalar(row);
        if (s) content.push({ title: s, quantity: '' });
      }
    }

    out.push({ title, content });
  }

  return out;
}
