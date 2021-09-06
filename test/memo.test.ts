import { memo, memoRecord } from '../src/memo';

describe('memo', () => {
  it('should memoize', () => {
    const subject = jest.fn();

    const memoed = memo(subject);
    memoed('a');
    expect(subject).toHaveBeenCalledWith('a');
    expect(subject).toHaveBeenCalledTimes(1);
    subject.mockClear();
    memoed('a');
    expect(subject).not.toHaveBeenCalled();
    memoed('b');
    expect(subject).toHaveBeenCalledWith('b');
    expect(subject).toHaveBeenCalledTimes(1);
  });

  it('should memoize a record', () => {
    const subject = jest.fn();
    const memoed = memoRecord({ subject });
    memoed.subject('a');
    expect(subject).toHaveBeenCalledWith('a');
    expect(subject).toHaveBeenCalledTimes(1);
    subject.mockClear();
    memoed.subject('a');
    expect(subject).not.toHaveBeenCalled();
    memoed.subject('b');
    expect(subject).toHaveBeenCalledWith('b');
    expect(subject).toHaveBeenCalledTimes(1);
  });
});
