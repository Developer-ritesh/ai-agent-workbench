import React from 'react';
import { VmLifecycleState, AgentState } from '../types';

interface StatusBadgeProps {
  status: VmLifecycleState | AgentState;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'starting':
      case 'awaiting_approval':
        return 'status-starting';
      case 'error':
        return 'status-error';
      case 'stopped':
      case 'idle':
      case 'stopping':
      default:
        return 'status-stopped';
    }
  };

  return (
    <span className={`status-pill ${getBadgeClass()}`}>
      <span className="status-dot" />
      {label || status}
    </span>
  );
};
