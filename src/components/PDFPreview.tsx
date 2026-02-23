import React, { useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

interface PDFPreviewProps {
  file: File;
  className?: string;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ file, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    let isMounted = true;
    const renderPreview = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ 
          canvasContext: context, 
          viewport,
          // @ts-ignore
          canvas: canvas
        }).promise;
        if (isMounted) setLoading(false);
      } catch (error) {
        console.error('Error rendering PDF preview:', error);
        if (isMounted) setLoading(false);
      }
    };

    renderPreview();
    return () => { isMounted = false; };
  }, [file]);

  return (
    <div className={`relative bg-white/5 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-crystal-900/50 backdrop-blur-sm z-10">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full h-auto shadow-lg" />
    </div>
  );
};
