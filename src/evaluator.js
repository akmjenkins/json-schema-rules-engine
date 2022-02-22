import defaultResolver from './resolver';

export const createEvaluator = (validator, factName, config, options) => {
  if (!validator) throw new Error('A validator is required');
  if (!factName) throw new Error('You must supply a fact name');

  const resolver = (options && options.resolver) || defaultResolver;

  return async (context) => {
    const subject = context[factName];
    const value =
      typeof subject === 'function'
        ? await subject(context, config.params)
        : subject;

    const resolved = resolver(value, config.path);
    return {
      result: validator(resolved, config.is, context),
      value,
      resolved,
    };
  };
};
