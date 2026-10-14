import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (code: string) => void;
  onCancel?: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onCancel }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'p2p-qr-reader-view';

  useEffect(() => {
    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    const startScanner = async () => {
      setIsStarting(true);
      setErrorMsg(null);

      try {
        scannerInstance = new Html5Qrcode(containerId);
        scannerRef.current = scannerInstance;

        await scannerInstance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isMounted) return;

            // Parse pair param
            let extractedCode = decodedText.trim();
            if (extractedCode.includes('pair=')) {
              try {
                const url = new URL(extractedCode);
                const p = url.searchParams.get('pair');
                if (p) extractedCode = p;
              } catch {
                // Regex fallback
                const match = extractedCode.match(/pair=([A-Za-z0-9\-]+)/);
                if (match && match[1]) extractedCode = match[1];
              }
            }

            // Stop scanner
            if (scannerRef.current) {
              scannerRef.current
                .stop()
                .then(() => {
                  onScanSuccess(extractedCode);
                })
                .catch(() => {
                  onScanSuccess(extractedCode);
                });
            } else {
              onScanSuccess(extractedCode);
            }
          },
          () => {
            // Frame miss
          }
        );

        if (isMounted) setIsStarting(false);
      } catch (err: any) {
        if (!isMounted) return;
        setIsStarting(false);
        setErrorMsg(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access in your browser.'
            : 'Could not access camera. You can also enter the pairing code manually.'
        );
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full aspect-square max-w-[280px] bg-black rounded-2xl overflow-hidden border border-stone-200 dark:border-neutral-800 shadow-inner flex items-center justify-center">
        {/* HTML5 QR Code Mount Element */}
        <div id={containerId} className="w-full h-full" />

        {/* Viewfinder Overlay */}
        {!errorMsg && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="w-44 h-44 border-2 border-amber-400 rounded-xl relative shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
            </div>
          </div>
        )}

        {/* Starting indicator */}
        {isStarting && !errorMsg && (
          <div className="absolute inset-0 bg-stone-900/80 flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
            <Camera className="w-6 h-6 text-amber-400 animate-pulse" />
            <span className="text-xs font-mono text-stone-300">Activating camera...</span>
          </div>
        )}

        {/* Error message view */}
        {errorMsg && (
          <div className="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center text-white gap-2.5 p-4 text-center">
            <AlertCircle className="w-7 h-7 text-rose-400" />
            <span className="text-xs text-stone-300 leading-relaxed max-w-[220px]">
              {errorMsg}
            </span>
            {onCancel && (
              <button
                onClick={onCancel}
                className="mt-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors"
              >
                Use Code Instead
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-neutral-400 font-mono text-center">
        Point camera at the QR code displayed on the other device
      </p>
    </div>
  );
};
