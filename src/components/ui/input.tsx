import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors placeholder:text-muted-foreground",
          className
        )}
        style={{
          background: "var(--input)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
        onFocus={e => (e.currentTarget.style.borderColor = "rgba(232,168,64,0.6)")}
        onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
