/**
 * npx tsx engines/composer-os-v2/scripts/wwhLiquidResponse.ts <source> <startBar> <endBar> <seed> [--pair <vaultId> | --res <triad> --ten <triad>]
 */
import { buildLiquidResponse } from '../core/wwh/wwhOperatorLiquidResponse';

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function positional(): string[] {
  const out: string[] = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const item = process.argv[index]!;
    if (item.startsWith('--')) {
      index += 1;
      continue;
    }
    out.push(item);
  }
  return out;
}

const [file, startBarText, endBarText, seedArg] = positional();
if (!file || !startBarText || !endBarText || !seedArg) {
  console.error(
    'usage: npx tsx engines/composer-os-v2/scripts/wwhLiquidResponse.ts <source> <startBar> <endBar> <seed> [--pair <vaultId> | --res <triad> --ten <triad>]'
  );
  process.exit(1);
}

const result = buildLiquidResponse({
  source: file,
  startBar: Number(startBarText),
  endBar: Number(endBarText),
  seed: Number(seedArg),
  pairId: arg('--pair'),
  resolution: arg('--res'),
  tension: arg('--ten'),
  open: true,
});

if (result.status === 'no-space') {
  console.log('NO SPACE');
  process.exit(0);
}
if (result.status === 'no-vault-pair') {
  console.error(result.message);
  process.exit(2);
}
console.log(result.message);
for (const slot of result.slots) {
  for (const rejection of slot.rejections) console.log(`REJECT ${rejection}`);
}
console.log(result.output);
console.log(`source ${result.sourceShaBefore} ${result.sourceShaAfter}`);
