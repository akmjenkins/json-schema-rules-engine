type AnyFunc = (...args: any[]) => unknown;

export function memo<T = AnyFunc>(
  func: T,
  equalityCheck?: <T>(a: T, b: T) => boolean,
): T;

export function memoRecord<T = Record<string, AnyFunc>>(
  map: T,
  equalityCheck?: <S>(a: S, b: S) => boolean,
): T;
