export const createEvaluator =
  (validator, opts, emit, rule) =>
  (mapId) =>
  async ([factName, { params, path, is }]) => {
    emit('debug', { type: 'STARTING_FACT', rule, mapId, factName });
    const onError = (params) =>
      emit('error', { ...params, factName, rule, mapId });

    const fact = opts.facts[factName] || opts.context[factName];
    try {
      const value = await (typeof fact === 'function' ? fact(params) : fact);
      const resolved = path ? opts.resolver(value, path) : value;
      emit('debug', {
        type: 'EXECUTED_FACT',
        rule,
        mapId,
        path,
        factName,
        value,
        resolved,
      });
      try {
        const result = await validator(resolved, is);
        emit('debug', {
          type: 'EVALUATED_FACT',
          rule,
          mapId,
          path,
          factName,
          value,
          resolved,
          is,
          result,
        });
        return { factName, ...result, value, resolved };
      } catch (error) {
        onError({ type: 'FactEvaluationError', path, is, resolved });
      }
    } catch (error) {
      onError({ type: 'FactExecutionError', params });
    }

    return { factName, error: true };
  };
