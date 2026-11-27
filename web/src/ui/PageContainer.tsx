import { PropsWithChildren } from "react";

export function PageContainer({
  children,
  className,
}: PropsWithChildren<{
  className?: string;
  size?: "3xl" | "4xl" | "7xl";
}>) {
  return (
    <div className={`app-page-container ${className || ""}`}>{children}</div>
  );
}
