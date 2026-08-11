import { resolveTrustProxySetting } from './trusted-proxy.util';

describe('resolveTrustProxySetting', () => {
  it('confia solo en loopback por defecto fuera de produccion', () => {
    expect(
      resolveTrustProxySetting({
        nodeEnv: 'development',
      }),
    ).toBe('loopback');
  });

  it('exige configuracion explicita en produccion', () => {
    expect(() =>
      resolveTrustProxySetting({
        nodeEnv: 'production',
      }),
    ).toThrow('TRUST_PROXY es obligatorio en produccion');
  });

  it('acepta IPs y CIDR explicitos', () => {
    expect(
      resolveTrustProxySetting({
        nodeEnv: 'production',
        trustProxy: '172.20.0.10, 172.20.0.0/24',
      }),
    ).toEqual(['172.20.0.10', '172.20.0.0/24']);
  });

  it.each(['true', '*', '0.0.0.0/0', '::/0'])('%s se rechaza por ser demasiado amplio', (value) => {
    expect(() =>
      resolveTrustProxySetting({
        nodeEnv: 'production',
        trustProxy: value,
      }),
    ).toThrow('TRUST_PROXY contiene un valor inseguro');
  });

  it('rechaza configuracion basada solamente en numero de saltos', () => {
    expect(() =>
      resolveTrustProxySetting({
        nodeEnv: 'production',
        trustProxy: '1',
      }),
    ).toThrow('TRUST_PROXY no puede configurarse por numero de saltos');
  });
});
