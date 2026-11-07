export default function IconButton({ icon: Icon, label, title = label, pressed, onClick }) {
  return <button
    type="button"
    className="icon-button"
    title={title}
    aria-label={label}
    aria-pressed={pressed}
    onClick={onClick}
  ><Icon strokeWidth={1.8} aria-hidden="true" /></button>;
}
