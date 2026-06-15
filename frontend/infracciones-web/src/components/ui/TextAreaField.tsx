import type { TextareaHTMLAttributes } from 'react';

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField(props: TextAreaFieldProps) {
  return <textarea {...props} />;
}
