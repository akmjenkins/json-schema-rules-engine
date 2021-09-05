export const createEvaluator =
  (validator, opts, emit, rule) =>
  (factMapId) =>
  async ([factName, { params, path, is }]) => {
    const onError = (params) => emit('error', { ...params, rule, factMapId });

    const fact = opts.facts[factName] || opts.context[factName];
    try {
      const value = await (typeof fact === 'function' ? fact(params) : fact);
      const resolved = path ? opts.resolver(value, path) : value;
      try {
        const result = await validator(resolved, is);
        return { factName, ...result, value, resolved };
      } catch (error) {
        onError({ type: 'FactEvaluationError', path, is, resolved });
      }
    } catch (error) {
      onError({ type: 'FactExecutionError', params });
    }

    return { factName, error: true };
  };
