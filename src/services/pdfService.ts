import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
// In a real app, you'd point this to a CDN or a local file.
// For this environment, we'll try to use the bundled worker if possible or a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const PDFService = {
  async mergePDFs(files: File[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  },

  async splitPDF(file: File, range: string): Promise<Uint8Array[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const results: Uint8Array[] = [];
    
    const pagesToExtract = this.parseRange(range, pdf.getPageCount());
    
    for (const pageNum of pagesToExtract) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
      newPdf.addPage(copiedPage);
      results.push(await newPdf.save());
    }
    
    return results;
  },

  async splitByPageCount(file: File, pagesPerFile: number): Promise<Uint8Array[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();
    const results: Uint8Array[] = [];

    for (let i = 0; i < totalPages; i += pagesPerFile) {
      const newPdf = await PDFDocument.create();
      const end = Math.min(i + pagesPerFile, totalPages);
      const indices = Array.from({ length: end - i }, (_, k) => i + k);
      const copiedPages = await newPdf.copyPages(pdf, indices);
      copiedPages.forEach(page => newPdf.addPage(page));
      results.push(await newPdf.save());
    }

    return results;
  },

  async splitIntoParts(file: File, partsCount: number): Promise<Uint8Array[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();
    const pagesPerPart = Math.ceil(totalPages / partsCount);
    return this.splitByPageCount(file, pagesPerPart);
  },

  async rotatePDF(file: File, degreesCount: number): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pages = pdf.getPages();
    pages.forEach(page => {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + degreesCount) % 360));
    });
    return await pdf.save();
  },

  async compressPDF(file: File): Promise<Uint8Array> {
    // pdf-lib doesn't have native "compression" in terms of re-encoding images,
    // but saving with object stream compression helps.
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return await pdf.save({ useObjectStreams: true });
  },

  async addWatermark(file: File, text: string): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pages = pdf.getPages();
    
    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 4,
        y: height / 2,
        size: 50,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.3,
        rotate: { angle: 45, type: 'degrees' as any }
      });
    });
    
    return await pdf.save();
  },

  async pdfToImages(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const images: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ 
        canvasContext: context, 
        viewport,
        // @ts-ignore - Some versions of types require canvas element
        canvas: canvas
      }).promise;
      images.push(canvas.toDataURL('image/png'));
    }

    return images;
  },

  parseRange(range: string, max: number): number[] {
    const pages = new Set<number>();
    const parts = range.split(',').map(p => p.trim());
    
    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = Math.max(1, start); i <= Math.min(max, end); i++) {
          pages.add(i);
        }
      } else {
        const num = Number(part);
        if (num >= 1 && num <= max) pages.add(num);
      }
    });
    
    return Array.from(pages).sort((a, b) => a - b);
  }
};
