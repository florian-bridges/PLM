// CO-02.1, CO-02.5: built-in item type schemas (JSON Schema 2020-12).
const str = { type: 'string' };

export const baseSchema = {
  type: 'object',
  required: ['id', 'type', 'title'],
  properties: {
    id: str, type: str, title: str, text: str,
    children: { type: 'array', items: str },
    external_ids: { type: 'object', additionalProperties: str },
  },
};

export const builtinTypes: Record<string, object> = {
  requirement: {},
  specification: {},
  part: { properties: { part_number: str, material: str, mass_kg: { type: 'number' } } },
  assembly: { properties: { part_number: str } },
  'test-case': { properties: { procedure: str } },
};

// CO-02.2, CO-02.6: allowed link types as [source types, target types]; '*' allows any type.
export const linkRules: Record<string, [string[], string[]]> = {
  satisfies: [['*'], ['requirement']],
  implements: [['*'], ['requirement']],
  verifies: [['test-case'], ['requirement']],
};
