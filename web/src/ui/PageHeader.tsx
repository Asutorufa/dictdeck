import { PropsWithChildren, ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: PropsWithChildren<{
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}>) {
  return (
    <header className="app-page-header">
      <div className="app-page-header-copy">
        {title && <h1 className="app-page-title">{title}</h1>}
        {subtitle && <p className="app-page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="app-page-header-actions">{actions}</div>}
    </header>
  );
}
