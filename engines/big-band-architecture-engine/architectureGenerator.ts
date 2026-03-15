/**
 * Big Band Architecture Engine — Arrangement form generator
 */

import type {
  ArrangementArchitecture,
  ArrangementSection,
  ArchitectureParameters,
  ChordSegment,
} from './architectureTypes';
import { STANDARD_SWING, ELLINGTON_STYLE, BALLAD_FORM } from './architectureTemplates';

function getBaseTemplate(style: ArchitectureParameters['style']): ArrangementSection[] {
  switch (style) {
    case 'ellington_style':
      return ELLINGTON_STYLE.map((s) => ({ ...s }));
    case 'ballad_form':
      return BALLAD_FORM.map((s) => ({ ...s }));
    default:
      return STANDARD_SWING.map((s) => ({ ...s }));
  }
}

function scaleTemplateToBars(
  template: ArrangementSection[],
  targetBars: number
): ArrangementSection[] {
  const templateBars = template.reduce((sum, s) => sum + s.length, 0);
  const scale = targetBars / Math.max(templateBars, 1);
  let bar = 1;
  const result: ArrangementSection[] = [];
  for (let i = 0; i < template.length; i++) {
    const s = template[i];
    const isLast = i === template.length - 1;
    const len = isLast
      ? Math.max(2, targetBars - bar + 1)
      : Math.max(2, Math.round(s.length * scale));
    if (bar + len - 1 <= targetBars) {
      result.push({ ...s, startBar: bar, length: len });
      bar += len;
    } else if (isLast && bar <= targetBars) {
      result.push({ ...s, startBar: bar, length: targetBars - bar + 1 });
      break;
    }
  }
  return result;
}

export function generateArchitecture(
  progression: ChordSegment[],
  parameters: ArchitectureParameters = {}
): ArrangementArchitecture {
  const seed = parameters.seed ?? Date.now();
  const style = parameters.style ?? 'standard_swing';

  const totalBars = progression.reduce((sum, s) => sum + s.bars, 0);
  const baseTemplate = getBaseTemplate(style);
  const adjusted = scaleTemplateToBars(baseTemplate, totalBars);

  const id = `arch_${style}_${seed}`;
  const name = style === 'ellington_style' ? 'Ellington Style' : style === 'ballad_form' ? 'Ballad Form' : 'Standard Swing';

  return {
    id,
    name,
    sections: adjusted,
    totalBars,
    progressionTemplate: parameters.progressionTemplate ?? 'custom',
  };
}
