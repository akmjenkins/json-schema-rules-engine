import fetch from 'node-fetch';
import createRulesEngine from '../src';
import { createAjvValidator } from './validators';
import * as facts from './facts';
import * as fixtures from './fixtures';
import * as rules from './rules';

jest.mock('node-fetch', () => require('fetch-mock-jest').sandbox());

describe('engine', () => {
  fetch.mock(/\/weather/, fixtures.weather);
  fetch.mock(/\/onecall/, fixtures.forecast);

  let engine;

  beforeEach(() => {
    engine = createRulesEngine({ validator: createAjvValidator() });
  });

  it('should execute a rule', async () => {
    await engine.run({
      minimumWarmDays: 4,
      minimumWarmTemp: 20,
      units: 'metric',
      apiKey: 'XXX',
      query: 'Halifax',
    });
  });

  it('should log debug messages', () => {});

  it('should log error messages', () => {});

  it('should update rules (patch)', () => {});

  it('should update rules (fn)', () => {});

  it('should update facts (patch)', () => {});

  it('should update facts (fn)', () => {});

  it('should update actions (patch)', () => {});

  it('should update actions (fn)', () => {});

  it('should accept a validator', () => {});
});
