import React from 'react';
import { useVrbProfile } from '../context/VrbProfileContext';

export function VrbStatusIndicator({ onNavigate }) {
  const { enabled, presetLabel } = useVrbProfile();

  return (
    <button
      type="button"
      className="secondary"
      onClick={onNavigate}
      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
      title="Open ECM VRB panel (Structure tab)"
    >
      {enabled && presetLabel ? `VRB: ${presetLabel}` : 'VRB off'}
    </button>
  );
}
