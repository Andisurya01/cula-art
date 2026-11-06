/**
 * Kembaran tabel sebuah grafik: nilai tetap bisa dibaca tanpa hover dan oleh pembaca layar.
 * `visuallyHidden` = hanya untuk pembaca layar (grafik mini yang sudah menampilkan angkanya).
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
  visuallyHidden = false,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  visuallyHidden?: boolean;
}) {
  const table = (
    <table className="w-full text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          {columns.map((column, index) => (
            <th key={column} scope="col" className={index === 0 ? "py-1 pr-2 font-medium" : "py-1 pl-2 text-right font-medium"}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b last:border-0">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className={cellIndex === 0 ? "py-1 pr-2" : "py-1 pl-2 text-right tabular-nums"}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (visuallyHidden) return <div className="sr-only">{table}</div>;

  return (
    <details className="mt-2 text-xs">
      <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">Lihat tabel</summary>
      <div className="mt-2">{table}</div>
    </details>
  );
}
