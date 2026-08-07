import type { InputHTMLAttributes, PropsWithChildren } from "react";

interface FieldProps extends PropsWithChildren {
  label: string;
  htmlFor: string;
  className?: string;
}

export function Field({ children, className, htmlFor, label }: FieldProps) {
  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function CheckboxInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="checkbox" />;
}
