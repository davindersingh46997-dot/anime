type StatusIndicatorProps = {
  status: string;
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <div className="status-indicator" aria-live="polite">
      <span className="status-dot" />
      <span>{status}</span>
    </div>
  );
}
