import type { SelectHTMLAttributes } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField(props: SelectFieldProps) {
  return <select {...props} />;
}
