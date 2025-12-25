import { ReactNode } from "react";

interface AppContainerProps {
  children: ReactNode;
}

export function AppContainer({ children }: AppContainerProps) {
  return (
    <div className="px-4 pt-14 pb-safe-bottom max-w-[430px] mx-auto w-full">
      {children}
    </div>
  );
}

