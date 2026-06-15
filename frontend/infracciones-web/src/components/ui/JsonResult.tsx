interface JsonResultProps {
  value: unknown;
  emptyLabel: string;
}

export function JsonResult({ emptyLabel, value }: JsonResultProps) {
  return (
    <pre className="result-box">
      {value ? JSON.stringify(value, null, 2) : emptyLabel}
    </pre>
  );
}
