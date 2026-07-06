import './Placeholder.css';

interface PlaceholderProps {
  title: string;
  description: string;
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="placeholder-icon">🚧</div>
      <p className="placeholder-note">This feature is coming soon!</p>
    </div>
  );
}
