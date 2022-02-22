export const isFactMapValid = (results) =>
  Object.values(results).every(({ result }) => result);

export const isWhenValid = (results) => results.some(isFactMapValid);
