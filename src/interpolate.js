export const interpolate = (subject = '', params = {}, match, resolver) => {
  let shouldReplaceFull, found;

  const replaced = subject.replace(match, (full, matched) => {
    shouldReplaceFull = full === subject;
    found = resolver(params, matched);
    return shouldReplaceFull ? '' : found;
  });

  return shouldReplaceFull ? found : replaced;
};

export const interpolateDeep = (o, params, matcher, resolver) => {
  if (!o || typeof o === 'number' || typeof o === 'boolean') return o;

  if (typeof o === 'string') return interpolate(o, params, matcher, resolver);

  if (Array.isArray(o))
    return o.map((t) => interpolateDeep(t, params, matcher, resolver));

  return Object.entries(o).reduce(
    (acc, [k, v]) => ({
      ...acc,
      [k]: interpolateDeep(v, params, matcher, resolver),
    }),
    {},
  );
};
