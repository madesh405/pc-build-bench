const CATEGORIES = new Set(['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case']);
const HEADERS = ['id', 'category', 'name', 'brand', 'price', 'power', 'specs_json', 'source_url', 'price_checked_at'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  row.push(field.replace(/\r$/, ''));
  if (row.some(v => v.trim())) rows.push(row);
  if (quoted) throw new Error('The CSV contains an unclosed quote.');
  return rows;
}

export function parseComponentCsv(text) {
  const rows = parseRows(text);
  if (rows.length < 2) throw new Error('The CSV must contain a header and at least one component row.');
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const required = ['category', 'name', 'brand', 'price', 'specs_json'];
  const missing = required.filter(h => !headers.includes(h));
  if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(', ')}.`);
  const at = key => headers.indexOf(key);
  const result = [];
  const errors = [];
  rows.slice(1).forEach((cells, offset) => {
    const line = offset + 2;
    const get = key => at(key) < 0 ? '' : String(cells[at(key)] ?? '').trim();
    try {
      const category = get('category');
      const name = get('name');
      const brand = get('brand');
      const price = Number(get('price'));
      if (!CATEGORIES.has(category)) throw new Error('category must be CPU, Motherboard, RAM, GPU, Storage, PSU, or Case');
      if (!name || !brand) throw new Error('name and brand are required');
      if (!Number.isFinite(price) || price < 0) throw new Error('price must be a non-negative number in INR');
      let specs;
      try { specs = JSON.parse(get('specs_json') || '{}'); }
      catch { throw new Error('specs_json must be valid JSON'); }
      if (!specs || Array.isArray(specs) || typeof specs !== 'object') throw new Error('specs_json must be a JSON object');
      const slug = `${category}-${name}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      result.push({
        id: get('id') || slug,
        category,
        name,
        brand,
        price,
        power: Number(get('power')) || 0,
        specs,
        sourceUrl: get('source_url'),
        priceCheckedAt: get('price_checked_at') || ''
      });
    } catch (error) {
      errors.push(`Row ${line}: ${error.message}`);
    }
  });
  if (errors.length) throw new Error(`CSV validation failed:\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? `\n…and ${errors.length - 12} more error(s)` : ''}`);
  if (!result.length) throw new Error('No component rows found.');
  const keys = new Set();
  for (const item of result) {
    const key = item.id.toLowerCase();
    if (keys.has(key)) throw new Error(`Duplicate component id in CSV: ${item.id}`);
    keys.add(key);
  }
  return result;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function componentsToCsv(items) {
  const lines = [HEADERS.join(',')];
  for (const item of items) {
    lines.push([
      item.id,
      item.category,
      item.name,
      item.brand,
      item.price,
      item.power || 0,
      JSON.stringify(item.specs || {}),
      item.sourceUrl || item.source_url || '',
      item.priceCheckedAt || item.price_checked_at || ''
    ].map(csvCell).join(','));
  }
  return lines.join('\r\n');
}

export function downloadComponentCsv(items, filename = 'pc-build-bench-components.csv') {
  const blob = new Blob([componentsToCsv(items)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadComponentTemplate() {
  const sample = [{
    id: 'cpu-example-001', category: 'CPU', name: 'Example CPU Model', brand: 'Example Brand', price: 15999, power: 65,
    specs: { socket: 'AM5', cores: 6, threads: 12, boostClock: '5.0 GHz', tdp: '65 W', performanceScore: 70 },
    sourceUrl: 'https://manufacturer.example/product', priceCheckedAt: '2026-10-01'
  }];
  downloadComponentCsv(sample, 'pc-build-bench-component-template.csv');
}
