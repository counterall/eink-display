export default function IconButton({ icon: Icon, label, onClick, busy = false }) {
  return <button
    type="button"
    className="icon-button"
    title={label}
    aria-label={label}
    aria-busy={busy || undefined}
    disabled={busy}
    onClick={onClick}
  ><Icon strokeWidth={1.8} aria-hidden="true" /></button>;
}
