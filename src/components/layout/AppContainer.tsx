import { ReactNode } from "react";
interface AppContainerProps {
  children: ReactNode;
}
export function AppContainer({
  children
}: AppContainerProps) {
  return <div className="pt-safe-top px-[10px] mx-0 py-0 mt-[10px]">
      {children}
    </div>;
}