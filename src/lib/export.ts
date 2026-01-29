export type CsvColumn = {
  key: string;
  header: string;
  transform?: (row: any) => any;
};

export function arrayToCsv(data: any[], cols: CsvColumn[]) {
  const headers = cols.map((c) => c.header);
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = c.transform ? c.transform(row) : row[c.key];
        if (val === null || val === undefined) return "";
        // Escape quotes by doubling
        const s = String(val);
        if (s.includes("\n") || s.includes(",") || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csvString: string) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
