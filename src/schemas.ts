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
  },
};

export const builtinTypes: Record<string, object> = {
  requirement: {},
  part: { properties: { part_number: str, material: str, mass_kg: { type: 'number' } } },
  assembly: { properties: { part_number: str } },
  'test-case': { properties: { procedure: str } },
  'test-run': { properties: { date: str } },
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
export const allows = (types: string[], candidate: string) => types.includes('*') || types.includes(candidate);
