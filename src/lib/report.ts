import { jsPDF } from 'jspdf';
import type { Experiment } from '../types';
import { fmtDate, fmtMs } from './format';

export interface ReportSection { heading: string; body: string[] }
export interface ReportData {
  title: string;
  author: string;
  date: string;
  sections: ReportSection[];
  experiments: Experiment[];
}

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  // Neutralize spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function experimentsToCsv(list: Experiment[]): string {
  const header = ['Experiment', 'Date', 'Module', 'Algorithm / Workload', 'Input Size (tasks)', 'Simulated CPU Time (ms)', 'Simulated GPU Time (ms)', 'Performance Ratio', 'Status'];
  const rows = list.map((e) => [e.name, new Date(e.date).toISOString(), e.module, e.algorithm, e.inputSize, e.cpuTimeMs.toFixed(3), e.gpuTimeMs.toFixed(3), e.ratio.toFixed(2), e.status]);
  const note = ['# Educational Simulation — values are modeled, not a real GPU benchmark'];
  return '\uFEFF' + [note, header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** jsPDF's built-in fonts are Latin-1 only; map common Unicode to safe equivalents. */
function pdfSafe(t: string): string {
  return t
    .replace(/[\u2014\u2013]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2265/g, '>=').replace(/\u2264/g, '<=').replace(/\u00D7/g, 'x').replace(/\u2026/g, '...')
    .replace(/\u00B5/g, 'u').replace(/[^\x00-\xFF]/g, '?');
}

export function generatePdf(input: ReportData): jsPDF {
  const data: ReportData = {
    ...input,
    title: pdfSafe(input.title), author: pdfSafe(input.author), date: pdfSafe(input.date),
    sections: input.sections.map((s) => ({ heading: pdfSafe(s.heading), body: s.body.map(pdfSafe) })),
  };
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };

  // Title band
  doc.setFillColor(10, 14, 23);
  doc.rect(0, 0, W, 110, 'F');
  doc.setTextColor(34, 211, 238);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(data.title, M, 52, { maxWidth: W - 2 * M });
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 225);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.author}  |  ${data.date}`, M, 78);
  doc.setTextColor(167, 139, 250);
  doc.text('Educational Simulation - Not a Real GPU Benchmark', M, 94);
  y = 140;
  doc.setTextColor(20, 24, 32);

  for (const s of data.sections) {
    ensure(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(8, 145, 178);
    doc.text(s.heading, M, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 35, 45);
    for (const p of s.body) {
      const lines = doc.splitTextToSize(p, W - 2 * M) as string[];
      for (const line of lines) { ensure(15); doc.text(line, M, y); y += 14; }
      y += 4;
    }
    y += 8;
  }

  if (data.experiments.length) {
    ensure(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(8, 145, 178);
    doc.text('Appendix - Experiment Results', M, y);
    y += 18;
    const cols = [{ h: 'Experiment', w: 150 }, { h: 'Date', w: 95 }, { h: 'Tasks', w: 55 }, { h: 'CPU (sim)', w: 65 }, { h: 'GPU (sim)', w: 65 }, { h: 'Ratio', w: 50 }];
    const drawHeader = () => {
      doc.setFillColor(230, 240, 245);
      doc.rect(M, y - 11, W - 2 * M, 16, 'F');
      doc.setFontSize(9);
      doc.setTextColor(20, 24, 32);
      let x = M + 4;
      for (const c of cols) { doc.text(c.h, x, y); x += c.w; }
      y += 16;
      doc.setFont('helvetica', 'normal');
    };
    drawHeader();
    for (const e of data.experiments) {
      if (y + 14 > H - M) { doc.addPage(); y = M; doc.setFont('helvetica', 'bold'); drawHeader(); }
      const cells = [e.name.slice(0, 32), fmtDate(e.date), e.inputSize.toLocaleString(), fmtMs(e.cpuTimeMs), fmtMs(e.gpuTimeMs), `${e.ratio.toFixed(2)}x`].map(pdfSafe);
      let x = M + 4;
      cells.forEach((c, i) => { doc.text(c, x, y); x += cols[i].w; });
      y += 14;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(`GPU-Based Password Security Lab - Page ${i} of ${pages}`, M, H - 24);
  }
  return doc;
}
