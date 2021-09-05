import { createRulesEngine, RulesEngine } from '../src';
import { createAjvValidator } from './validators';

describe('rules engine', () => {
  let engine: RulesEngine;
  let log: jest.Mock;
  let call: jest.Mock;

  beforeEach(() => {
    log = jest.fn();
    call = jest.fn();
    engine = createRulesEngine({
      validator: createAjvValidator(),
      actions: { log, call },
    });
  });

  it('should execute a rule', async () => {
    const rules = {
      salutation: {
        when: [{ firstName: { is: { type: 'string', pattern: '^J' } } }],
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
      },
    };
    engine.setRules(rules);
    await engine.run({ firstName: 'John' });
    expect(log).toHaveBeenCalledWith({ message: 'Hi friend!' });
    log.mockClear();
    await engine.run({ firstName: 'Bill' });
    expect(log).not.toHaveBeenCalled();
  });

  it('should access a property via path', async () => {
    const rules = {
      salutation: {
        when: [
          {
            user: { path: 'firstName', is: { type: 'string', pattern: '^J' } },
          },
        ],
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
      },
    };
    engine.setRules(rules);
    await engine.run({ user: { firstName: 'John' } });
    expect(log).toHaveBeenCalledWith({ message: 'Hi friend!' });
    log.mockClear();
    await engine.run({ user: { firstName: 'Bill' } });
    expect(log).not.toHaveBeenCalled();
  });

  it('should execute a rule asynchronously', async () => {
    const lookupUser = jest.fn(async () => ({ firstName: 'John' }));
    const rules = {
      salutation: {
        when: [
          {
            lookupUser: {
              is: {
                type: 'object',
                properties: { firstName: { type: 'string', pattern: '^J' } },
              },
            },
          },
        ],
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
      },
    };
    engine.setFacts({ lookupUser });
    engine.setRules(rules);
    await engine.run();
    expect(lookupUser).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith({ message: 'Hi friend!' });
  });
});
