import type { ReactNode } from 'react';
import './GradientHeader.css';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children?: ReactNode;
}

export function GradientHeader({ title, subtitle, rightSlot, children }: GradientHeaderProps) {
  return (
    <header className="gradient-header">
      <div className="gradient-header__topline">
        <div className="gradient-header__copy">
          <p className="gradient-header__kicker">AeroSpec Home</p>
          <h1>{title}</h1>
          {subtitle && <p className="gradient-header__subtitle">{subtitle}</p>}
        </div>
        {rightSlot && <div className="gradient-header__right">{rightSlot}</div>}
      </div>
      {children && <div className="gradient-header__content">{children}</div>}
    </header>
  );
}
