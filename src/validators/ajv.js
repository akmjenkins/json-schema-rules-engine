import Ajv from 'ajv';

export const createAjvValidator = (options) => {
  const ajv = new Ajv(options);
  return async (object, schema) => {
    const validate = ajv.compile(schema);
    const result = await validate(object);
    return { result, errors: validate.errors };
  };
};
