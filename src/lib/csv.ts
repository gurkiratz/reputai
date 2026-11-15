/**
 * Builds a CSV string. Cells that start with = + - @ get a leading quote so a
 * spreadsheet does not run them as formulas (CSV injection from review text).
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let v = cell === null || cell === undefined ? "" : String(cell);
          if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
          return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
        })
        .join(","),
    )
    .join("\r\n");
}
