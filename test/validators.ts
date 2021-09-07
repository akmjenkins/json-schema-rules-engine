import Ajv2019 from 'ajv/dist/2019';

export const createAjvValidator = () => {
  const ajv = new Ajv2019();
  return async (object: any, schema: any) => {
    const validate = ajv.compile(schema);
    return { result: validate(object) };
  };
};
