// CO-01.2, CO-02.1, CO-02.5
const str = { type: 'string' };
export const results = ['pass', 'fail', 'inconclusive'];

export const baseSchema = {
  type: 'object',
  required: ['id', 'type', 'title'],
  properties: {
    id: str, type: str, title: str, text: str,
    uses: { type: 'array', items: str },
    links: { type: 'array', items: { type: 'object', required: ['type', 'target'], properties: { type: str, target: str, result: { enum: results } }, additionalProperties: false,
      if: { required: ['result'] }, then: { properties: { type: { const: 'executes' } } } } },
    // CO-02.7
    parameters: { type: 'array', items: { type: 'object', properties: { name: str, value: { type: ['number', 'null'] }, unit: str, state: str } } },
  },
};

// CO-02.5, CO-02.8
export interface TypeDef { base?: string; prefix?: string; folder?: string; fields?: Record<string, object>; required?: string[] }
export const builtinTypes: Record<string, TypeDef> = {
  requirement: { prefix: 'REQ-', folder: 'requirements' },
  'test-case': { prefix: 'TC-', folder: 'tests', fields: { procedure: str } },
  'test-run': { prefix: 'RUN-', folder: 'runs', fields: { date: str } },
  part: { prefix: 'PRT-', fields: { part_number: str, material: str, mass_kg: { type: 'number' } } },
  assembly: { prefix: 'ASM-', fields: { part_number: str } },
};

// CO-02.2, CO-02.6
export const linkRules: Record<string, [string[], string[]]> = {
  satisfies: [['*'], ['requirement']],
  implements: [['*'], ['requirement']],
  verifies: [['test-case'], ['requirement']],
  executes: [['test-run'], ['test-case']],
  tests: [['test-run'], ['*']],
  'derives-from': [['*'], ['*']],
};
// CO-02.2: message, empty if allowed
export const disallowed = (source: string, type: string, target: string) =>
  [source, target].every((t, i) => (linkRules[type]?.[i] ?? []).some((a) => a === '*' || a === t)) ? '' : [source, type, target].join(' ');
