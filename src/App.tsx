import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  FileStack, 
  Scissors, 
  RotateCw, 
  Layers, 
  Zap, 
  Download,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Type,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileUploader } from './components/FileUploader';
import { ToolCard } from './components/ToolCard';
import { PDFPreview } from './components/PDFPreview';
import { PDFService } from './services/pdfService';
import { ConversionService } from './services/conversionService';
import { cn, formatBytes, getFileExtension } from './lib/utils';
import JSZip from 'jszip';

type ToolType = 
  | 'merge' 
  | 'split' 
  | 'compress' 
  | 'rotate' 
  | 'watermark' 
  | 'pdf-to-img' 
  | 'img-to-pdf' 
  | 'word-to-pdf'
  | 'pdf-to-ppt'
  | 'ppt-to-pdf'
  | 'ppt-blank-slide'
  | 'none';

interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
  progress: number;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [splitRange, setSplitRange] = useState<string>("1-2");
  const [splitMode, setSplitMode] = useState<'range' | 'pages' | 'parts'>('range');
  const [pagesPerFile, setPagesPerFile] = useState<number>(1);
  const [partsCount, setPartsCount] = useState<number>(2);
  const [watermarkText, setWatermarkText] = useState<string>("CRYSTAL DOC");
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>({
    status: 'idle',
    message: '',
    progress: 0
  });
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setResultUrl(null);
  };

  const reset = () => {
    setActiveTool('none');
    setFiles([]);
    setResultUrl(null);
    setProcessing({ status: 'idle', message: '', progress: 0 });
  };

  const moveFile = (idx: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newFiles.length) return;
    [newFiles[idx], newFiles[targetIdx]] = [newFiles[targetIdx], newFiles[idx]];
    setFiles(newFiles);
  };

  const runTool = async () => {
    if (files.length === 0) return;

    setProcessing({ status: 'processing', message: 'Initializing...', progress: 10 });
    
    try {
      let result: Uint8Array | Blob | null = null;
      let name = '';

      switch (activeTool) {
        case 'merge':
          setProcessing({ status: 'processing', message: 'Merging PDFs...', progress: 40 });
          result = await PDFService.mergePDFs(files);
          name = 'merged_document.pdf';
          break;
        
        case 'split':
          setProcessing({ status: 'processing', message: 'Splitting PDF...', progress: 40 });
          let splitResults: Uint8Array[] = [];
          if (splitMode === 'range') {
            splitResults = await PDFService.splitPDF(files[0], splitRange);
          } else if (splitMode === 'pages') {
            splitResults = await PDFService.splitByPageCount(files[0], pagesPerFile);
          } else {
            splitResults = await PDFService.splitIntoParts(files[0], partsCount);
          }
          
          if (splitResults.length > 1) {
            // If multiple files, zip them
            const zip = new JSZip();
            splitResults.forEach((data, i) => {
              zip.file(`split_part_${i + 1}.pdf`, data);
            });
            result = await zip.generateAsync({ type: 'blob' });
            name = 'split_documents.zip';
          } else {
            result = splitResults[0];
            name = 'split_document.pdf';
          }
          break;

        case 'compress':
          setProcessing({ status: 'processing', message: 'Compressing PDF...', progress: 40 });
          result = await PDFService.compressPDF(files[0]);
          name = 'compressed_document.pdf';
          break;

        case 'rotate':
          setProcessing({ status: 'processing', message: 'Rotating pages...', progress: 40 });
          result = await PDFService.rotatePDF(files[0], 90);
          name = 'rotated_document.pdf';
          break;

        case 'watermark':
          setProcessing({ status: 'processing', message: 'Adding watermark...', progress: 40 });
          result = await PDFService.addWatermark(files[0], watermarkText);
          name = 'watermarked_document.pdf';
          break;

        case 'pdf-to-img':
          setProcessing({ status: 'processing', message: 'Converting PDF to images...', progress: 40 });
          const images = await PDFService.pdfToImages(files[0]);
          result = await ConversionService.pdfToZip(images, files[0].name.split('.')[0]);
          name = `${files[0].name.split('.')[0]}_images.zip`;
          break;

        case 'img-to-pdf':
          setProcessing({ status: 'processing', message: 'Converting images to PDF...', progress: 40 });
          result = await ConversionService.imagesToPDF(files);
          name = 'converted_images.pdf';
          break;

        case 'word-to-pdf':
          setProcessing({ status: 'processing', message: 'Converting Word to PDF...', progress: 40 });
          result = await ConversionService.wordToPDF(files[0]);
          name = 'converted_word.pdf';
          break;

        case 'pdf-to-ppt':
          setProcessing({ status: 'processing', message: 'Converting PDF to PPT...', progress: 40 });
          result = await ConversionService.pdfToPPT(files[0]);
          name = 'converted_document.pptx';
          break;

        case 'ppt-to-pdf':
          setProcessing({ status: 'processing', message: 'Converting PPT to PDF...', progress: 40 });
          result = await ConversionService.pptToPDF(files[0]);
          name = 'converted_document.pdf';
          break;

        case 'ppt-blank-slide':
          setProcessing({ status: 'processing', message: 'Extracting blank slide...', progress: 40 });
          result = await ConversionService.getBlankSlideFromPPT(files[0]);
          name = 'blank_slide_theme.pptx';
          break;
      }

      if (result) {
        setProcessing({ status: 'processing', message: 'Finalizing...', progress: 90 });
        const blob = result instanceof Blob ? result : new Blob([result], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultName(name);
        setProcessing({ status: 'success', message: 'Task completed successfully!', progress: 100 });
      }
    } catch (error) {
      console.error(error);
      setProcessing({ status: 'error', message: 'An error occurred during processing.', progress: 0 });
    }
  };

  const tools = [
    { id: 'merge', title: 'Merge PDF', description: 'Combine multiple PDFs into one single document.', icon: FileStack, color: 'blue' },
    { id: 'split', title: 'Split PDF', description: 'Extract pages or split a PDF into multiple files.', icon: Scissors, color: 'purple' },
    { id: 'compress', title: 'Compress PDF', description: 'Reduce file size while maintaining quality.', icon: Zap, color: 'emerald' },
    { id: 'rotate', title: 'Rotate PDF', description: 'Rotate pages to correct orientation.', icon: RotateCw, color: 'pink' },
    { id: 'pdf-to-img', title: 'PDF to Image', description: 'Convert PDF pages into high-quality images.', icon: ImageIcon, color: 'blue' },
    { id: 'img-to-pdf', title: 'Image to PDF', description: 'Convert JPG, PNG, WEBP images to PDF.', icon: FileUp, color: 'purple' },
    { id: 'word-to-pdf', title: 'Word to PDF', description: 'Convert Word documents to PDF format.', icon: FileText, color: 'emerald' },
    { id: 'pdf-to-ppt', title: 'PDF to PPT', description: 'Convert PDF pages to PowerPoint slides.', icon: FileStack, color: 'blue' },
    { id: 'ppt-to-pdf', title: 'PPT to PDF', description: 'Convert PowerPoint presentations to PDF.', icon: FileText, color: 'purple' },
    { id: 'ppt-blank-slide', title: 'PPT Theme Slide', description: 'Get a blank slide based on the PPT theme.', icon: Layers, color: 'emerald' },
    { id: 'watermark', title: 'Watermark', description: 'Add text watermarks to your PDF pages.', icon: Type, color: 'pink' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="glass-panel sticky top-4 mx-4 z-50 px-6 py-4 flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-display font-bold crystal-text">CrystalDoc</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-crystal-400">
          <a href="#" className="hover:text-white transition-colors">Converter</a>
          <a href="#" className="hover:text-white transition-colors">PDF Tools</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">API</a>
        </div>

        <button className="liquid-button text-sm">
          Get Started
        </button>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {activeTool === 'none' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <motion.h1 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-5xl md:text-7xl font-display font-bold tracking-tight"
                >
                  Universal <span className="crystal-text">Document</span> Intelligence
                </motion.h1>
                <p className="text-xl text-crystal-400">
                  The futuristic platform to convert, edit, and manage your documents with liquid-smooth precision.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    {...tool}
                    onClick={() => setActiveTool(tool.id as ToolType)}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tool-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <button 
                onClick={reset}
                className="flex items-center gap-2 text-crystal-400 hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
              </button>

              <div className="glass-panel p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                    tools.find(t => t.id === activeTool)?.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                    tools.find(t => t.id === activeTool)?.color === 'purple' ? 'from-purple-500 to-indigo-500' :
                    tools.find(t => t.id === activeTool)?.color === 'emerald' ? 'from-emerald-500 to-teal-500' :
                    'from-pink-500 to-rose-500'
                  )}>
                    {React.createElement(tools.find(t => t.id === activeTool)?.icon || FileText, { className: "w-6 h-6 text-white" })}
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold">{tools.find(t => t.id === activeTool)?.title}</h2>
                    <p className="text-crystal-400">{tools.find(t => t.id === activeTool)?.description}</p>
                  </div>
                </div>

                {files.length === 0 ? (
                  <FileUploader 
                    onFilesSelected={handleFilesSelected}
                    multiple={activeTool === 'merge' || activeTool === 'img-to-pdf'}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      {activeTool === 'split' && (
                        <div className="glass-card p-6 space-y-6">
                          <div className="flex gap-4 p-1 bg-white/5 rounded-xl">
                            {(['range', 'pages', 'parts'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setSplitMode(mode)}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                  splitMode === mode ? "bg-accent-primary text-white shadow-lg" : "text-crystal-400 hover:text-white"
                                )}
                              >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                              </button>
                            ))}
                          </div>

                          {splitMode === 'range' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-crystal-400">Page Range (e.g., 1-3, 5)</label>
                              <input 
                                type="text" 
                                value={splitRange}
                                onChange={(e) => setSplitRange(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                              />
                            </div>
                          )}

                          {splitMode === 'pages' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-crystal-400">Pages per PDF</label>
                              <input 
                                type="number" 
                                min="1"
                                value={pagesPerFile}
                                onChange={(e) => setPagesPerFile(parseInt(e.target.value) || 1)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                              />
                            </div>
                          )}

                          {splitMode === 'parts' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-crystal-400">Number of Parts</label>
                              <input 
                                type="number" 
                                min="2"
                                value={partsCount}
                                onChange={(e) => setPartsCount(parseInt(e.target.value) || 2)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {activeTool === 'watermark' && (
                        <div className="glass-card p-4 space-y-2">
                          <label className="text-sm font-medium text-crystal-400">Watermark Text</label>
                          <input 
                            type="text" 
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent-primary transition-colors"
                          />
                        </div>
                      )}
                      {files.map((file, idx) => (
                        <div key={idx} className="glass-card p-4 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-accent-primary" />
                              </div>
                              <div>
                                <p className="font-medium truncate max-w-[200px] md:max-w-md">{file.name}</p>
                                <p className="text-xs text-crystal-400">{formatBytes(file.size)} • {getFileExtension(file.name).toUpperCase()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {activeTool === 'merge' && (
                                <div className="flex flex-col gap-1 mr-2">
                                  <button 
                                    onClick={() => moveFile(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-crystal-400"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => moveFile(idx, 'down')}
                                    disabled={idx === files.length - 1}
                                    className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-crystal-400"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-crystal-400 hover:text-rose-500"
                              >
                                <AlertCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          {getFileExtension(file.name) === 'pdf' && (
                            <PDFPreview file={file} className="h-40" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                      {processing.status === 'idle' && (
                        <button 
                          onClick={runTool}
                          className="liquid-button w-full md:w-auto px-12 py-4 text-lg"
                        >
                          Process Files
                        </button>
                      )}

                      {processing.status === 'processing' && (
                        <div className="w-full space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                              {processing.message}
                            </span>
                            <span>{processing.progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                              initial={{ width: 0 }}
                              animate={{ width: `${processing.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {processing.status === 'success' && resultUrl && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full flex flex-col items-center gap-6"
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold">Ready for Download</h3>
                            <p className="text-crystal-400">Your file has been processed and is ready.</p>
                          </div>
                          
                          <a 
                            href={resultUrl} 
                            download={resultName}
                            className="liquid-button flex items-center gap-2 px-12 py-4 text-lg"
                          >
                            <Download className="w-5 h-5" />
                            Download {resultName}
                          </a>

                          <button 
                            onClick={reset}
                            className="text-sm text-crystal-400 hover:text-white transition-colors"
                          >
                            Process another file
                          </button>
                        </motion.div>
                      )}

                      {processing.status === 'error' && (
                        <div className="flex flex-col items-center gap-4 text-rose-500">
                          <AlertCircle className="w-12 h-12" />
                          <p>{processing.message}</p>
                          <button onClick={() => setProcessing({ status: 'idle', message: '', progress: 0 })} className="text-sm underline">Try again</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-white/5 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-accent-primary" />
              <span className="text-lg font-display font-bold">CrystalDoc</span>
            </div>
            <p className="text-sm text-crystal-400">
              The next generation of document processing. Secure, fast, and beautiful.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Tools</h4>
            <ul className="text-sm text-crystal-400 space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Merge PDF</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Split PDF</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Compress PDF</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Convert PDF</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="text-sm text-crystal-400 space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Connect</h4>
            <ul className="text-sm text-crystal-400 space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-crystal-500">
          © 2026 CrystalDoc. All rights reserved. Built with precision.
        </div>
      </footer>
    </div>
  );
}
