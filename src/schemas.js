const evaluator = {
  type: 'object',
  properties: {
    params: { type: 'object' },
    path: { type: 'string' },
    is: { type: 'object' },
  },
  required: ['is'],
};

const action = {
  type: 'object',
  properties: { type: { type: 'string' }, params: {} },
  required: ['type'],
};

const factMap = {
  type: 'object',
  properties: { id: { type: 'string' } },
  patternProperties: { '.': evaluator },
};
const actions = { type: 'array', items: action };
const when = { type: 'array', items: factMap };
const then = { type: 'object', properties: { when, actions } };
const otherwise = then;
const always = then;

const condition = {
  type: 'object',
  properties: { when, then, otherwise, always },
  required: ['when'],
};

export const ruleSchema = {
  type: 'object',
  patternProperties: { '.': condition },
};
