import React, { useEffect, useState } from 'react';
import { cancelAll, getQueueDepth, onDeferredEvent } from '../../engine/deferredEngine.js';

export function DeferredQueueIndicator() {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const refresh = () => setDepth(getQueueDepth());
    refresh();
    const offQ = onDeferredEvent('deferred:queued', refresh);
    const offC = onDeferredEvent('deferred:complete', refresh);
    const onWinQ = () => refresh();
    const onWinC = () => refresh();
    window.addEventListener('deferred:queued', onWinQ);
    window.addEventListener('deferred:complete', onWinC);
    return () => {
      offQ();
      offC();
      window.removeEventListener('deferred:queued', onWinQ);
      window.removeEventListener('deferred:complete', onWinC);
    };
  }, []);

  if (depth <= 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        padding: '0.35rem 0.5rem',
        borderRadius: 6,
        background: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        fontSize: '0.85rem',
      }}
      role="status"
    >
      <span>⏳ {depth} queued</span>
      <button type="button" className="secondary" onClick={() => cancelAll()}>
        Cancel queue
      </button>
    </div>
  );
}
