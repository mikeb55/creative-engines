import { useCallback, useState } from 'react';
import './SaveNoticeRow.css';

export type SaveNoticePayload = {
  message: string;
  /** Clipboard payload; defaults to `message`. */
  copyText?: string;
  variant?: 'success' | 'error';
};

type Props = SaveNoticePayload & {
  className?: string;
};

export function SaveNoticeRow(props: Props) {
  const { message, copyText, variant = 'success', className } = props;
  const toCopy = copyText ?? message;
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }, [toCopy]);

  const rootClass = ['saveNoticeRow', `saveNoticeRow--${variant}`, className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <p className="saveNoticeRow__text" role="status">
        {message}
      </p>
      <button
        type="button"
        className="saveNoticeRow__dots"
        aria-label={copied ? 'Copied' : 'Copy'}
        title={copied ? 'Copied' : 'Copy'}
        onClick={() => void onCopy()}
      >
        {copied ? '✓' : '···'}
      </button>
    </div>
  );
}
