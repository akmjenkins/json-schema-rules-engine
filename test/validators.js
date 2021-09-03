import Ajv2019 from 'ajv/dist/2019';

export const createAjvValidator = (options) => {
  const ajv = new Ajv2019(options);
  return async (object, schema) => {
    const validate = ajv.compile(schema);
    const result = await validate(object);
    return { result, errors: validate.errors };
  };
};
