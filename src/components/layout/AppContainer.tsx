import { ReactNode } from "react";

interface AppContainerProps {
  children: ReactNode;
}

export function AppContainer({ children }: AppContainerProps) {
  return <div>{children}</div>;
}

