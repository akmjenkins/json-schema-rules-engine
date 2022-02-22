const key = '__SUBJECT__';
export const createAjvValidator = (ajv) => (subject, schema, context) =>
  ajv.validate(
    { type: 'object', properties: { [key]: schema }, required: [key] },
    { ...context, [key]: subject },
  );
