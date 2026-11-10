import { brandIcon } from '../lib/brand';

const columns = ['Component', 'Product Name', 'Price', 'Regular Price'];

export function PcBuildPrint({ name, contact, url, rows, totals }) {
  return <article className="builder-print">
    <header className="builder-print-header">
      <img src={brandIcon} width="52" height="52" alt="" />
      <div>
        <h1>{name}</h1>
        <p>PC Builder</p>
        {contact && <p>{contact}</p>}
        <p>{url}</p>
      </div>
    </header>
    <table>
      <colgroup><col /><col /><col /><col /></colgroup>
      <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{rows.map(({ id, cells }) => <tr key={id}>
        <th scope="row">{cells[0]}</th>
        {cells.slice(1).map((cell, index) => <td key={columns[index + 1]}>{cell}</td>)}
      </tr>)}</tbody>
      <tfoot><tr><th colSpan={2} scope="row">Total</th><td>{totals[0]}</td><td>{totals[1]}</td></tr></tfoot>
    </table>
  </article>;
}

export async function downloadBuildImage({ name, contact, url, rows, totals }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  const margin = 48;
  const tableTop = 180;
  const rowHeight = 43;
  const widths = [340, 460, 172, 172];
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  canvas.height = tableTop + (rows.length + 2) * rowHeight + margin;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const logo = new Image();
  logo.src = brandIcon;
  try {
    await logo.decode();
    ctx.drawImage(logo, margin, 45, 88, 88);
  } catch { /* The store name still identifies the export. */ }

  ctx.fillStyle = '#b73820';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(name, 158, 70, canvas.width - 158 - margin);
  ctx.fillStyle = '#18243a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PC Builder', 158, 101);
  ctx.font = '20px sans-serif';
  if (contact) ctx.fillText(contact, 158, 126, canvas.width - 158 - margin);
  ctx.fillText(url, 158, contact ? 151 : 128, canvas.width - 158 - margin);

  function drawRow(cells, index, emphasized, mergeLabel = false) {
    const y = tableTop + index * rowHeight;
    const sizes = mergeLabel ? [widths[0] + widths[1], ...widths.slice(2)] : widths;
    if (emphasized) {
      ctx.fillStyle = '#f7f3f1';
      ctx.fillRect(margin, y, tableWidth, rowHeight);
    }
    ctx.strokeStyle = '#737984';
    ctx.fillStyle = '#18243a';
    ctx.font = `${emphasized ? 'bold ' : ''}20px sans-serif`;
    let x = margin;
    cells.forEach((cell, column) => {
      const width = sizes[column];
      const numeric = column >= sizes.length - 2 || mergeLabel;
      ctx.strokeRect(x, y, width, rowHeight);
      ctx.textAlign = numeric ? 'right' : 'left';
      ctx.fillText(cell, numeric ? x + width - 12 : x + 12, y + 28, width - 24);
      x += width;
    });
  }
  drawRow(columns, 0, true);
  rows.forEach(({ cells }, index) => drawRow(cells, index + 1, false));
  drawRow(['Total', ...totals], rows.length + 1, true, true);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'geargrid-pc-build.png';
  link.click();
}
