import { ReactNode } from "react";

interface AppContainerProps {
  children: ReactNode;
}

export function AppContainer({ children }: AppContainerProps) {
  return (
    <div className="px-4 pt-safe-top">
      {children}
    </div>
  );
}

