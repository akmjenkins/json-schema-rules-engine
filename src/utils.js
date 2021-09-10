export const patch = (o, w) => (typeof o === 'function' ? o(w) : o);

// inlined from property-expr
const SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g;
const CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/; // utility to dynamically destructure arrays

const parts = (path) =>
  path.match(SPLIT_REGEX).map((p) => p.replace(CLEAN_QUOTES_REGEX, '$2'));

export const get = (obj, path) =>
  parts(path).reduce((acc, part) => (!acc ? acc : acc[part]), obj);

export const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((k) => a[k] === b[k]);
};
