import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label = 'Copier',
  className = '',
  iconOnly = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      id={`copy-btn-${textToCopy.slice(0, 6)}`}
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copié !' : 'Copier dans le presse-papier'}
      className={`inline-flex items-center gap-1.5 transition-colors text-xs font-medium cursor-pointer ${
        copied
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {!iconOnly && <span>{copied ? 'Copié !' : label}</span>}
    </button>
  );
};
