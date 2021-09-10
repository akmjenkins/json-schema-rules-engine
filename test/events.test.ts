import createRulesEngine, { RulesEngine } from '../src';
import { createAjvValidator } from './validators';

describe('events', () => {
  let engine: RulesEngine;
  let log: jest.Mock;
  let call: jest.Mock;

  beforeEach(() => {
    log = jest.fn();
    call = jest.fn();
    engine = createRulesEngine(createAjvValidator(), {
      actions: { log, call },
    });
  });

  it('should unsubscribe', async () => {
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
    const subscriber = jest.fn();
    const unsub = engine.on('debug', subscriber);
    await engine.run({ firstName: 'John' });
    expect(subscriber).toHaveBeenCalled();
    unsub();
    subscriber.mockClear();
    await engine.run({ firstName: 'John' });
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should subscribe to debug events', async () => {
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
    const subscriber = jest.fn();
    const context = { firstName: 'John' };
    engine.on('debug', subscriber);
    await engine.run(context);

    expect(subscriber).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'STARTING_RULE',
        rule: 'salutation',
        interpolated: rules.salutation.when,
        context,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'STARTING_FACT_MAP',
        rule: 'salutation',
        mapId: 'myFacts',
        factMap: rules.salutation.when.myFacts,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'STARTING_FACT',
        rule: 'salutation',
        mapId: 'myFacts',
        factName: 'firstName',
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        type: 'EXECUTED_FACT',
        rule: 'salutation',
        mapId: 'myFacts',
        path: undefined,
        factName: 'firstName',
        value: context.firstName,
        resolved: context.firstName,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        type: 'EVALUATED_FACT',
        rule: 'salutation',
        mapId: 'myFacts',
        path: undefined,
        factName: 'firstName',
        value: 'John',
        resolved: 'John',
        is: { type: 'string', pattern: '^J' },
        result: { result: true },
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        type: 'FINISHED_FACT_MAP',
        rule: 'salutation',
        mapId: 'myFacts',
        results: {
          firstName: { result: true, value: 'John', resolved: 'John' },
        },
        passed: true,
        error: false,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        type: 'FINISHED_RULE',
        rule: 'salutation',
        interpolated: rules.salutation.when,
        context,
        result: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
          results: {
            myFacts: expect.objectContaining({
              firstName: {
                result: true,
                value: 'John',
                resolved: 'John',
              },
            }),
          },
        },
      }),
    );
  });

  it('should emit a non-blocking ActionExecutionError if an action throws an error', async () => {
    const rules = {
      salutation: {
        when: {
          myFacts: { firstName: { is: { type: 'string', pattern: '^J' } } },
        },
        then: {
          actions: [
            { type: 'log', params: { message: 'Hi friend!' } },
            { type: 'call', params: { message: 'called anyway' } },
          ],
        },
      },
    };
    engine.setRules(rules);
    const error = new Error('nad');
    log.mockImplementationOnce(() => {
      throw error;
    });
    const spy = jest.fn();
    engine.on('error', spy);
    await engine.run({ firstName: 'John' });
    expect(spy).toHaveBeenCalledWith({
      type: 'ActionExecutionError',
      action: 'log',
      params: { message: 'Hi friend!' },
      rule: 'salutation',
      error,
    });
    expect(call).toHaveBeenCalledWith({ message: 'called anyway' });
  });

  it('should emit a non-blocking ActionExecutionError if an action has not been supplied', async () => {
    const rules = {
      salutation: {
        when: {
          myFacts: { firstName: { is: { type: 'string', pattern: '^J' } } },
        },
        then: {
          actions: [
            { type: 'nonAction', params: { message: 'Hi friend!' } },
            { type: 'call', params: { message: 'called anyway' } },
          ],
        },
      },
    };
    engine.setRules(rules);
    const spy = jest.fn();
    engine.on('error', spy);
    await engine.run({ firstName: 'John' });
    expect(spy).toHaveBeenCalledWith({
      type: 'ActionExecutionError',
      action: 'nonAction',
      params: { message: 'Hi friend!' },
      rule: 'salutation',
      error: expect.objectContaining({
        message: 'No action found for nonAction',
      }),
    });
    expect(call).toHaveBeenCalledWith({ message: 'called anyway' });
  });

  it('should emit a FactExecutionError and continue', async () => {
    const error = new Error('bad');
    const context = {
      fromContext: {
        firstName: 'fred',
      },
      myFact: jest.fn(() => {
        throw error;
      }),
    };

    engine.setRules({
      salutation: {
        when: [
          {
            myFact: {
              params: '{{fromContext}}',
              is: { type: 'string', pattern: '^J' },
            },
          },
          {
            fromContext: {
              path: 'firstName',
              is: { type: 'string', const: 'fred' },
            },
          },
        ],
        then: {
          actions: [{ type: 'call', params: { message: 'called anyway' } }],
        },
      },
    });
    const spy = jest.fn();
    engine.on('error', spy);
    await engine.run(context);
    expect(spy).toHaveBeenCalledWith({
      type: 'FactExecutionError',
      factName: 'myFact',
      mapId: 0,
      params: context.fromContext,
      rule: 'salutation',
      error,
    });
    expect(call).toHaveBeenCalledWith({ message: 'called anyway' });
  });

  it('should emit a FactExecutionError not call any actions', async () => {
    const context = {
      fromContext: {
        firstName: 'fred',
      },
      myFact: jest.fn(() => {
        throw new Error('bad');
      }),
    };

    const spy = jest.fn();
    engine.on('error', spy);
    engine.setRules({
      salutation: {
        when: [
          {
            myFact: {
              params: '{{fromContext}}',
              is: { type: 'string', pattern: '^J' },
            },
          },
        ],
        then: {
          actions: [{ type: 'call', params: { message: 'called then' } }],
        },
        otherwise: {
          actions: [{ type: 'call', params: { message: 'called otherwise' } }],
        },
      },
    });
    await engine.run(context);
    const error = new Error('bad');
    expect(spy).toHaveBeenCalledWith({
      type: 'FactExecutionError',
      factName: 'myFact',
      mapId: 0,
      params: context.fromContext,
      rule: 'salutation',
      error,
    });
    expect(call).not.toHaveBeenCalled();
  });

  it('should emit a FactEvaluationError', async () => {
    const error = new Error('bad');
    const thisEngine = createRulesEngine((subject, schema) => {
      throw error;
    });
    const rules = {
      salutation: {
        when: {
          myFacts: {
            user: { path: 'firstName', is: { type: 'string', pattern: '^J' } },
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
    thisEngine.setRules(rules);
    const spy = jest.fn();
    const context = { user: { firstName: 'John' } };
    thisEngine.on('error', spy);
    await thisEngine.run(context);
    expect(spy).toHaveBeenCalledWith({
      type: 'FactEvaluationError',
      error,
      mapId: 'myFacts',
      rule: 'salutation',
      factName: 'user',
      path: 'firstName',
      is: { type: 'string', pattern: '^J' },
      resolved: 'John',
      value: { firstName: 'John' },
    });
  });
});
