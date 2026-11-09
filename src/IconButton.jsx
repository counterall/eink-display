export default function IconButton({ icon: Icon, label, title = label, pressed, disabled, onClick }) {
  return <button
    type="button"
    className="icon-button"
    title={title}
    aria-label={label}
    aria-pressed={pressed}
    disabled={disabled}
    onClick={onClick}
  ><Icon strokeWidth={1.8} aria-hidden="true" /></button>;
}
