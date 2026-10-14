import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2 } from 'lucide-react';

interface QRDisplayProps {
  code: string;
  size?: number;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({ code, size = 180 }) => {
  const [copied, setCopied] = useState(false);

  // Pairing URL
  const pairingPayload = typeof window !== 'undefined'
    ? `${window.location.origin}?pair=${code}`
    : code;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      {/* QR code */}
      <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-200 dark:border-neutral-700">
        <QRCodeSVG
          value={pairingPayload}
          size={size}
          level="M"
          includeMargin={false}
          className="rounded-lg"
        />
      </div>

      {/* Code display */}
      <div className="mt-3 flex items-center gap-2">
        <div className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 font-mono text-base font-bold tracking-widest text-stone-900 dark:text-white select-all">
          {code}
        </div>
        <button
          onClick={handleCopy}
          aria-label="Copy pairing code"
          className="h-9 px-3 rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-stone-50 dark:hover:bg-neutral-800 text-stone-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
