import { useState } from 'react';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { JsonResult } from '../ui/JsonResult';
import { copyTextToClipboard } from '../../utils/clipboard';

interface SummaryItem {
  label: string;
  value: string;
}

interface OperationResultCardProps {
  title: string;
  description?: string;
  result: unknown;
  emptyLabel: string;
  copyLabel?: string;
  copyValue?: string | null;
  summary?: SummaryItem[];
}

export function OperationResultCard({
  copyLabel = 'Copiar ID',
  copyValue,
  description,
  emptyLabel,
  result,
  summary,
  title,
}: OperationResultCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!copyValue) {
      return;
    }

    try {
      await copyTextToClipboard(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="operation-result-card">
      <div className="page-stack">
        <header className="panel-header">
          <div>
            <p className="section-label">Resultado</p>
            <h2>{title}</h2>
            {description ? <p className="page-description">{description}</p> : null}
          </div>

          {copyValue ? (
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              {copied ? 'Copiado' : copyLabel}
            </Button>
          ) : null}
        </header>

        {summary?.length ? (
          <dl className="result-summary">
            {summary.map((item) => (
              <div key={item.label} className="result-summary-item">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <JsonResult value={result} emptyLabel={emptyLabel} />
      </div>
    </Card>
  );
}
