import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { PDFService } from './pdfService';

export const ConversionService = {
  async imagesToPDF(files: File[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      let image;
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        continue;
      }
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    
    return await pdfDoc.save();
  },

  async wordToPDF(file: File): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    
    page.drawText("Converted from Word (Text Only Demo):", { x: 50, y: height - 50, size: 20 });
    page.drawText(html.replace(/<[^>]*>/g, '').slice(0, 1000), { x: 50, y: height - 100, size: 12 });
    
    return await pdfDoc.save();
  },

  async pdfToZip(images: string[], baseName: string): Promise<Blob> {
    const zip = new JSZip();
    images.forEach((dataUrl, index) => {
      const base64Data = dataUrl.split(',')[1];
      zip.file(`${baseName}_page_${index + 1}.png`, base64Data, { base64: true });
    });
    return await zip.generateAsync({ type: 'blob' });
  },

  async pdfToPPT(file: File): Promise<Blob> {
    const images = await PDFService.pdfToImages(file);
    const pptx = new PptxGenJS();
    
    images.forEach((imgData) => {
      const slide = pptx.addSlide();
      slide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
    });
    
    // @ts-ignore
    const buffer = await pptx.write('arraybuffer');
    return new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  },

  async pptToPDF(file: File): Promise<Uint8Array> {
    // Client-side PPT to PDF is extremely difficult.
    // We'll simulate it by creating a PDF that says "PPT to PDF Conversion Placeholder"
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    
    page.drawText(`PPT to PDF Conversion: ${file.name}`, { x: 50, y: height - 50, size: 20 });
    page.drawText("In a production environment, this would use a server-side renderer like LibreOffice.", { x: 50, y: height - 100, size: 12 });
    page.drawText("This placeholder represents the high-quality output you would receive.", { x: 50, y: height - 130, size: 12 });
    
    return await pdfDoc.save();
  },

  async getBlankSlideFromPPT(file: File): Promise<Blob> {
    // Simulating theme extraction by creating a new PPT with a "theme" layout
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_4x3';
    
    const slide = pptx.addSlide();
    slide.background = { color: 'F1F1F1' }; // Simulated theme background
    slide.addText("Theme-based Blank Slide", { x: 1, y: 1, w: '80%', h: 1, fontSize: 24, color: '363636' });
    
    // @ts-ignore
    const buffer = await pptx.write('arraybuffer');
    return new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  }
};
