import { createContext } from "react";

export type ToastContextType = {
  showToast: (msg: string) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined
);
