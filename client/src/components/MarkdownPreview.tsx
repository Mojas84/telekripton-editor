import { useMemo } from 'react';
import { Streamdown } from 'streamdown';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Live preview komponenta pro markdown obsah
 * Konvertuje markdown na HTML a zobrazuje ho v reálném čase
 */
export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  // Memoizuj obsah aby se preview neaktualizoval zbytečně
  const memoizedContent = useMemo(() => content, [content]);

  if (!memoizedContent.trim()) {
    return (
      <div className={`text-yellow-200/40 text-sm p-4 ${className}`}>
        Obsah se bude zobrazovat zde...
      </div>
    );
  }

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <Streamdown>{memoizedContent}</Streamdown>
    </div>
  );
}
