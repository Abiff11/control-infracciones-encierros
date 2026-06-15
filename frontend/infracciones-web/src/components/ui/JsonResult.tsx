import type { ReactNode } from 'react';

interface JsonResultProps {
  value: unknown;
  emptyLabel: string;
}

function formatKey(key: string): string {
  return key
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function renderValue(value: unknown, emptyLabel: string, depth = 0): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="result-empty">{emptyLabel}</span>;
  }

  if (isPrimitive(value)) {
    return <span className="result-text">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="result-empty">{emptyLabel}</span>;
    }

    return (
      <ul className={depth === 0 ? 'result-list' : 'result-list result-list-nested'}>
        {value.map((item, index) => (
          <li key={index} className="result-list-item">
            {renderValue(item, emptyLabel, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="result-empty">{emptyLabel}</span>;
    }

    return (
      <dl className={depth === 0 ? 'result-kv' : 'result-kv result-kv-nested'}>
        {entries.map(([key, entryValue]) => (
          <div key={key} className="result-kv-item">
            <dt>{formatKey(key)}</dt>
            <dd>{renderValue(entryValue, emptyLabel, depth + 1)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="result-text">{String(value)}</span>;
}

export function JsonResult({ emptyLabel, value }: JsonResultProps) {
  return <div className="result-box">{renderValue(value, emptyLabel)}</div>;
}
