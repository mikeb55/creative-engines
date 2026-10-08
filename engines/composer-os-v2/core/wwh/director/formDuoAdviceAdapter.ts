/**
 * V7.3A does not consult form/duo advice and does not call the pentatonic engine.
 * Cuts come from the source index: ties, repeats, and endings.
 */

export interface FormDuoAdvice {
  consulted: false;
  reason: string;
}

export function readFormDuoAdvice(): FormDuoAdvice {
  return {
    consulted: false,
    reason:
      'V7.3A binds cuts from tie, repeat, and ending evidence in the V7.2 source index. Advisory form analysis is not authority.',
  };
}
