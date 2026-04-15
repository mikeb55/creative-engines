export function scoreBizziVertical(
  pc1: number,
  pc2: number,
  pcBass: number,
  keyRoot: number
): number {
  const norm = (pc: number) => (pc - keyRoot + 12) % 12;
  const d1 = norm(pc1);
  const d2 = norm(pc2);
  const db = norm(pcBass);
  const iv12 = (d1 - d2 + 12) % 12;
  const iv1b = (d1 - db + 12) % 12;
  const iv2b = (d2 - db + 12) % 12;

  if ([1, 11].includes(iv12)) return 0;
  if ([1, 11].includes(iv1b)) return 0;
  if ([1, 11].includes(iv2b)) return 0;
  if (d1 === d2) return 0;
  if (iv2b === 6) {
    const consonant = [3, 4, 7, 8, 9];
    if (!consonant.includes(iv1b) &&
        !consonant.includes(iv12)) return 0;
  }

  let score = 0.5;
  const thirds  = [3, 4, 8, 9];
  const perfect = [5, 7];
  if (thirds.includes(iv12))  score += 0.2;
  if (thirds.includes(iv2b))  score += 0.2;
  if (perfect.includes(iv12)) score += 0.05;
  if (perfect.includes(iv2b)) score += 0.05;
  return Math.min(score, 1.0);
}

export function scoreTymoczkoHorizontal(
  prev1: number, curr1: number,
  prev2: number, curr2: number,
  prevB: number, currB: number
): number {
  const total = Math.abs(curr1 - prev1) +
                Math.abs(curr2 - prev2) +
                Math.abs(currB - prevB);
  if (total === 0)  return 1.0;
  if (total <= 3)   return 0.9;
  if (total <= 6)   return 0.7;
  if (total <= 11)  return 0.4;
  return 0.1;
}

export function scoreSpeciesLitePenalties(
  prev1: number, curr1: number,
  prev2: number, curr2: number,
  prevB: number, currB: number
): number {
  let penalty = 0;
  const iv = (a: number, b: number) =>
    Math.abs(a - b) % 12;

  // Parallel 5ths
  if (iv(prev1,prev2)===7 && iv(curr1,curr2)===7) penalty+=0.4;
  if (iv(prev1,prevB)===7 && iv(curr1,currB)===7) penalty+=0.4;
  if (iv(prev2,prevB)===7 && iv(curr2,currB)===7) penalty+=0.4;

  // Parallel octaves
  if (iv(prev1,prev2)===0 && iv(curr1,curr2)===0) penalty+=0.5;
  if (iv(prev1,prevB)===0 && iv(curr1,currB)===0) penalty+=0.5;
  if (iv(prev2,prevB)===0 && iv(curr2,currB)===0) penalty+=0.5;

  // Lockstep — all three voices same direction
  const dir1 = Math.sign(curr1 - prev1);
  const dir2 = Math.sign(curr2 - prev2);
  const dirB = Math.sign(currB - prevB);
  if (dir1 !== 0 && dir1===dir2 && dir2===dirB) penalty+=0.2;

  return Math.max(0, 1.0 - penalty);
}

export function scoreThreeVoices(params: {
  pc1: number;
  pc2: number;
  pcBass: number;
  keyRoot: number;
  prevMidi1?: number;
  prevMidi2?: number;
  prevMidiBass?: number;
  currMidi1?: number;
  currMidi2?: number;
  currMidiBass?: number;
  wBizzi?: number;
  wTymoczko?: number;
  wSpecies?: number;
}): number {
  const {
    pc1, pc2, pcBass, keyRoot,
    prevMidi1, prevMidi2, prevMidiBass,
    currMidi1, currMidi2, currMidiBass,
    wBizzi = 0.4,
    wTymoczko = 0.35,
    wSpecies = 0.25,
  } = params;

  const bizzi = scoreBizziVertical(
    pc1, pc2, pcBass, keyRoot);

  const hasHorizontal =
    prevMidi1 !== undefined &&
    prevMidi2 !== undefined &&
    prevMidiBass !== undefined &&
    currMidi1 !== undefined &&
    currMidi2 !== undefined &&
    currMidiBass !== undefined;

  if (!hasHorizontal) return bizzi;

  const tymo = scoreTymoczkoHorizontal(
    prevMidi1!, currMidi1!,
    prevMidi2!, currMidi2!,
    prevMidiBass!, currMidiBass!
  );
  const species = scoreSpeciesLitePenalties(
    prevMidi1!, currMidi1!,
    prevMidi2!, currMidi2!,
    prevMidiBass!, currMidiBass!
  );

  return (bizzi * wBizzi) +
         (tymo * wTymoczko) +
         (species * wSpecies);
}
