import { ReactNode } from "react";

interface AppContainerProps {
  children: ReactNode;
}

export function AppContainer({ children }: AppContainerProps) {
  return (
    <div className="px-5 pt-12 pb-20 max-w-[390px] mx-auto w-full min-h-screen">
      {children}
    </div>
  );
}

