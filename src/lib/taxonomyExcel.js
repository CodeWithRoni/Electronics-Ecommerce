const columns = {
  group: ['Category Name'],
  category: ['Subcategory Name', 'Parent Category'],
  brand: ['Brand Name'],
};

const titles = { group: 'Categories', category: 'Subcategories', brand: 'Brands' };

export async function downloadTaxonomy(kind, rows, demo = false) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const header = columns[kind].map((value) => ({ value, fontWeight: 'bold', color: '#FFFFFF', backgroundColor: '#243B61' }));
  const data = rows.map(({ name, group_name }) => (kind === 'category' ? [name, group_name] : [name]).map((value) => ({ value, type: String })));
  await writeExcelFile([header, ...data], {
    sheet: titles[kind], columns: header.map(() => ({ width: 32 })), stickyRowsCount: 1,
  }).toFile(`geargrid-${titles[kind].toLowerCase()}${demo ? '-demo' : ''}.xlsx`);
}

function cellText(value) {
  return typeof value === 'string' || Number.isFinite(value) ? String(value).trim() : '';
}

export async function readTaxonomy(kind, file, groups) {
  if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024) {
    throw new Error('Choose an .xlsx workbook up to 2 MB.');
  }

  const { readSheet } = await import('read-excel-file/browser');
  let sheet;
  try { sheet = await readSheet(file); }
  catch { throw new Error('This workbook could not be read. Download a demo and try again.'); }
  const expected = columns[kind];
  const [header = [], ...body] = sheet;
  if (expected.some((name, index) => cellText(header[index]).toLowerCase() !== name.toLowerCase())
    || header.slice(expected.length).some((value) => value !== null && value !== '')) {
    throw new Error(`Use these Excel column headings in order: ${expected.join(', ')}.`);
  }

  const parents = new Set(groups.map(({ name }) => name));
  const rows = body.flatMap((cells, index) => {
    if (cells.every((value) => value === null || value === '')) return [];
    const [name, group_name] = cells.map(cellText);
    if (!name || name.length > 100) throw new Error(`Row ${index + 2}: Enter a name of 1–100 characters.`);
    if (kind === 'category' && !parents.has(group_name)) {
      throw new Error(`Row ${index + 2}: Enter the exact name of an existing parent category.`);
    }
    if (cells.slice(expected.length).some((value) => value !== null && value !== '')) {
      throw new Error(`Row ${index + 2}: Remove values from extra columns.`);
    }
    return [kind === 'category' ? { name, group_name } : { name }];
  });
  if (rows.length < 1 || rows.length > 500) throw new Error('Import between 1 and 500 rows at a time.');
  return rows;
}
