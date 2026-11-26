export default function IconButton({ icon: Icon, label, title = label, pressed, disabled, onClick, className }) {
  return <button
    type="button"
    className={className ? `icon-button ${className}` : 'icon-button'}
    title={title}
    aria-label={label}
    aria-pressed={pressed}
    disabled={disabled}
    onClick={onClick}
  ><Icon strokeWidth={1.8} aria-hidden="true" /></button>;
}
