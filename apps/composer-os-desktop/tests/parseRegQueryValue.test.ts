import { describe, expect, it } from 'vitest';
import { parseRegQueryValue } from '../electron/winAnthropicEnv';

describe('parseRegQueryValue', () => {
  it('parses HKCU Environment style reg.exe output', () => {
    const stdout = `
HKEY_CURRENT_USER\\Environment
    ANTHROPIC_API_KEY    REG_SZ    sk-ant-api03-testkey
`;
    expect(parseRegQueryValue(stdout, 'ANTHROPIC_API_KEY')).toBe('sk-ant-api03-testkey');
  });

  it('returns undefined when value missing', () => {
    expect(parseRegQueryValue('no matching lines', 'ANTHROPIC_API_KEY')).toBeUndefined();
  });
});
