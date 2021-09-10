import _ from 'lodash';
import { get } from 'jsonpointer';
import createRulesEngine, { RulesEngine } from '../src';
import { createAjvValidator } from './validators';

describe('rules engine', () => {
  const validator = jest.fn(createAjvValidator());
  let engine: RulesEngine;
  let log: jest.Mock;
  let call: jest.Mock;

  beforeEach(() => {
    log = jest.fn();
    call = jest.fn();
    engine = createRulesEngine(validator, { actions: { log, call } });
  });

  it('should execute a rule', async () => {
    const rules = {
      salutation: {
        when: [
          {
            firstName: { is: { type: 'string', pattern: '^J' } },
          },
        ],
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
        otherwise: {
          actions: [{ type: 'call', params: { message: 'Who are you?' } }],
        },
      },
    };
    engine.setRules(rules);
    await engine.run({ firstName: 'John' });
    expect(log).toHaveBeenCalledWith({ message: 'Hi friend!' });
    log.mockClear();
    await engine.run({ firstName: 'Bill' });
    expect(log).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledWith({ message: 'Who are you?' });
  });

  it('should execute a rule using a named fact map', async () => {
    const rules = {
      salutation: {
        when: {
          myFacts: {
            firstName: { is: { type: 'string', pattern: '^J' } },
          },
        },
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
        otherwise: {
          actions: [{ type: 'call', params: { message: 'Who are you?' } }],
        },
      },
    };
    engine.setRules(rules);
    await engine.run({ firstName: 'John' });
    expect(log).toHaveBeenCalledWith({ message: 'Hi friend!' });
    log.mockClear();
    await engine.run({ firstName: 'Bill' });
    expect(log).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledWith({ message: 'Who are you?' });
  });

  it('should process nested rules', async () => {
    const rules = {
      salutation: {
        when: [
          {
            firstName: { is: { type: 'string', pattern: '^A' } },
          },
        ],
        then: {
          when: [
            {
              lastName: { is: { type: 'string', pattern: '^J' } },
            },
          ],
          then: {
            actions: [
              {
                type: 'log',
                params: { message: 'You have the same initials as me!' },
              },
            ],
          },
          otherwise: {
            actions: [{ type: 'log', params: { message: 'Hi' } }],
          },
        },
      },
    };
    engine.setRules(rules);
    await engine.run({ firstName: 'Andrew' });
    expect(log).toHaveBeenCalledWith({ message: 'Hi' });
    log.mockClear();
    await engine.run({ firstName: 'Andrew', lastName: 'Jackson' });
    expect(log).toHaveBeenCalledWith({
      message: 'You have the same initials as me!',
    });
  });

  it('should memoize facts', async () => {
    const facts = { f1: jest.fn() };
    engine.setFacts(facts);
    engine.setRules({
      rule1: {
        when: [
          { f1: { params: { a: 1 }, is: {} } },
          { f1: { params: { a: 1 }, is: {} } },
          { f1: { params: { a: 2 }, is: {} } },
        ],
      },
    });
    await engine.run();
    expect(facts.f1).toHaveBeenCalledTimes(2);
    expect(facts.f1).toHaveBeenCalledWith({ a: 1 });
    expect(facts.f1).toHaveBeenCalledWith({ a: 2 });
  });

  it('should deep equal memoize facts', async () => {
    const facts = { f1: jest.fn() };
    const rules = {
      rule1: {
        when: [
          { f1: { params: { a: [1, 1] }, is: {} } },
          { f1: { params: { a: [1, 1] }, is: {} } },
          { f1: { params: { a: [1, 2] }, is: {} } },
        ],
      },
    };

    const memEngine = createRulesEngine(createAjvValidator(), {
      memoizer: _.isEqual,
      facts,
      rules,
    });

    const regularEngine = createRulesEngine(createAjvValidator(), {
      facts,
      rules,
    });

    await regularEngine.run();
    expect(facts.f1).toHaveBeenCalledTimes(3);
    expect(facts.f1).toHaveBeenCalledWith({ a: [1, 1] });
    expect(facts.f1).toHaveBeenCalledWith({ a: [1, 1] });
    expect(facts.f1).toHaveBeenCalledWith({ a: [1, 2] });

    facts.f1.mockClear();

    await memEngine.run();
    expect(facts.f1).toHaveBeenCalledTimes(2);
    expect(facts.f1).toHaveBeenCalledWith({ a: [1, 1] });
    expect(facts.f1).toHaveBeenCalledWith({ a: [1, 2] });
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

  it('should use a custom resolver', async () => {
    const thisEngine = createRulesEngine(validator, { resolver: get });
    const rules = {
      salutation: {
        when: [
          {
            user: { path: '/firstName', is: { type: 'string', pattern: '^J' } },
          },
        ],
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
      },
    };
    thisEngine.setRules(rules);
    thisEngine.setActions({ log });
    await thisEngine.run({ user: { firstName: 'John' } });
    expect(log).toHaveBeenCalledWith({ message: 'Hi friend!' });
    log.mockClear();
    await thisEngine.run({ user: { firstName: 'Bill' } });
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

  it('should interpolate results', async () => {
    const rules = {
      salutation: {
        when: [
          {
            user: { path: 'firstName', is: { type: 'string', pattern: '^F' } },
          },
        ],
        then: {
          actions: [
            {
              type: 'log',
              params: {
                value: '{{results[0].user.value}}',
                resolved: '{{results[0].user.resolved}}',
                message: 'Hi {{results[0].user.resolved}}!',
              },
            },
          ],
        },
      },
    };

    const user = {
      firstName: 'Freddie',
      lastName: 'Mercury',
    };
    engine.setRules(rules);
    await engine.run({ user });
    expect(log).toHaveBeenCalledWith({
      value: user,
      resolved: user.firstName,
      message: `Hi ${user.firstName}!`,
    });
  });

  it('should interpolate results with a named fact map', async () => {
    const rules = {
      salutation: {
        when: {
          checkName: {
            user: { path: 'firstName', is: { type: 'string', pattern: '^F' } },
          },
        },
        then: {
          actions: [
            {
              type: 'log',
              params: {
                value: '{{results.checkName.user.value}}',
                resolved: '{{results.checkName.user.resolved}}',
                message: 'Hi {{results.checkName.user.resolved}}!',
              },
            },
          ],
        },
      },
    };

    const user = {
      firstName: 'Freddie',
      lastName: 'Mercury',
    };
    engine.setRules(rules);
    await engine.run({ user });
    expect(log).toHaveBeenCalledWith({
      value: user,
      resolved: user.firstName,
      message: `Hi ${user.firstName}!`,
    });
  });

  it('should interpolate using a custom pattern', async () => {
    const thisEngine = createRulesEngine(validator, { pattern: /\$(.+?)\$/g });
    const rules = {
      salutation: {
        when: [
          {
            user: { path: 'firstName', is: { type: 'string', pattern: '^F' } },
          },
        ],
        then: {
          actions: [
            {
              type: 'log',
              params: {
                value: '$results[0].user.value$',
                resolved: '$results[0].user.resolved$',
                message: 'Hi $results[0].user.resolved$!',
              },
            },
          ],
        },
      },
    };

    const user = {
      firstName: 'Freddie',
      lastName: 'Mercury',
    };
    thisEngine.setRules(rules);
    thisEngine.setActions({ log });
    await thisEngine.run({ user });
    expect(log).toHaveBeenCalledWith({
      value: user,
      resolved: user.firstName,
      message: `Hi ${user.firstName}!`,
    });
  });

  it('should interpolate using a custom resolver', async () => {
    const thisEngine = createRulesEngine(validator, { resolver: get });
    const rules = {
      salutation: {
        when: [
          {
            user: { path: '/firstName', is: { type: 'string', pattern: '^F' } },
          },
        ],
        then: {
          actions: [
            {
              type: 'log',
              params: {
                value: '{{/results/0/user/value}}',
                resolved: '{{/results/0/user/resolved}}',
                message: 'Hi {{/results/0/user/resolved}}!',
              },
            },
          ],
        },
      },
    };

    const user = {
      firstName: 'Freddie',
      lastName: 'Mercury',
    };
    thisEngine.setRules(rules);
    thisEngine.setActions({ log });
    await thisEngine.run({ user });
    expect(log).toHaveBeenCalledWith({
      value: user,
      resolved: user.firstName,
      message: `Hi ${user.firstName}!`,
    });
  });
});
