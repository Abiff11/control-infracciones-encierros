export type TrustProxySetting = string | string[];

const UNSAFE_TRUST_PROXY_VALUES = new Set([
  'true',
  '*',
  '0.0.0.0/0',
  '::/0',
]);

function parseTrustProxyList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveTrustProxySetting(params: {
  nodeEnv: string;
  trustProxy?: string;
}): TrustProxySetting {
  const configuredProxies = parseTrustProxyList(params.trustProxy);

  if (configuredProxies.length === 0) {
    if (params.nodeEnv === 'production') {
      throw new Error(
        'TRUST_PROXY es obligatorio en produccion y debe declarar IPs/CIDR de proxies confiables.',
      );
    }

    return 'loopback';
  }

  for (const proxy of configuredProxies) {
    const normalized = proxy.toLowerCase();

    if (UNSAFE_TRUST_PROXY_VALUES.has(normalized)) {
      throw new Error(`TRUST_PROXY contiene un valor inseguro: ${proxy}`);
    }

    if (/^\d+$/.test(normalized)) {
      throw new Error(
        'TRUST_PROXY no puede configurarse por numero de saltos; usa IPs o subredes explicitas.',
      );
    }
  }

  return configuredProxies.length === 1
    ? configuredProxies[0]
    : configuredProxies;
}
