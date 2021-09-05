import Ajv2019 from 'ajv/dist/2019';

export const createAjvValidator = () => {
  const ajv = new Ajv2019();
  return async (object, schema) => {
    const validate = ajv.compile(schema);
    const result = validate(object);
    return { result, errors: validate.errors };
  };
};
