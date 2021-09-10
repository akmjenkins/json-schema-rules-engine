type UnaryFunction = (arg: any) => MaybePromise<unknown>;

export type Facts = Record<string, UnaryFunction>;
export type Actions = Record<string, UnaryFunction>;
export type Rules = Record<string, Rule>;
export type Rule = {
  when: FactMap[] | NamedFactMap;
  then?: RuleActions | Rule | (Rule & RuleActions);
  otherwise?: RuleActions | Rule | (Rule & RuleActions);
};

type MaybePromise<T> = T | Promise<T>;

type Action = {
  type: string;
  params?: unknown;
};

type RuleActions = {
  actions: Action[];
};

interface NamedFactMap {
  [named: string]: FactMap;
}

interface FactMap {
  [fact: string]: Evaluator;
}

export type Evaluator = {
  params?: unknown;
  path?: string;
  is: Record<string, any>;
};

interface ValidatorResult {
  result: boolean;
}

type Validator = (subject: any, schema: any) => MaybePromise<ValidatorResult>;

export type Unsubscribe = () => void;

type Options = {
  facts?: Facts;
  actions?: Actions;
  rules?: Rules;
  pattern?: RegExp;
  memoizer?: <T>(a: T, b: T) => boolean;
  resolver?: (subject: any, path: string) => any;
};

export type JobConstruct = EngineOptions & {
  rules: Rules;
  facts: Facts;
  actions: Actions;
  context: Context;
};

type StartingRuleEvent = {
  type: 'STARTING_RULE';
  rule: string;
  interpolated: FactMap[] | NamedFactMap;
  context: Context;
};

type FinishedRuleEvent = {
  type: 'FINISHED_RULE';
  rule: string;
  interpolated: FactMap[] | NamedFactMap;
  context: Context;
  result: RuleResult;
};

type StartingFactMapEvent = {
  type: 'STARTING_FACT_MAP';
  rule: string;
  mapId: string | number;
  factMap: FactMap;
};

type FinishedFactMapEvent = {
  type: 'FINISHED_FACT_MAP';
  rule: string;
  mapId: string | number;
  results: FactMapResult;
  passed: boolean;
  error: boolean;
};

type StartingFactEvent = {
  type: 'STARTING_FACT';
  rule: string;
  mapId: string | number;
  factName: string;
};

type ExecutedFactEvent = {
  type: 'EXECUTED_FACT';
  rule: string;
  mapId: string | number;
  factName: string;
  params?: any;
  path?: string;
  value: any;
  resolved: any;
};

type EvaluatedFactEvent = {
  type: 'EVALUATED_FACT';
  rule: string;
  mapId: string | number;
  factName: string;
  value: any;
  resolved: any;
  is: Record<string, any>;
  result: ValidatorResult;
};

type RuleParseError = {
  type: 'RuleParsingError';
  rule: string;
  error: Error;
};

type FactEvaluationError = {
  type: 'FactEvaluationError';
  rule: string;
  mapId: string | number;
  factName: string;
  error: Error;
  context: Context;
  factName: string;
  value: any;
  resolved: any;
  path?: string;
  is: Record<string, any>;
};

type FactExecutionError = {
  type: 'FactExecutionError';
  rule: string;
  mapId: string | number;
  factName: string;
  error: Error;
  context: Context;
  factName: string;
  params?: Record<string, any>;
};

type ActionExecutionError = {
  type: 'ActionExecutionError';
  rule: string;
  action: string;
  params?: Record<string, any>;
  error: Error;
};

type FactMapResult = {
  [key: string]: {
    result: boolean;
    value: any;
    resolved: any;
  };
};

type RuleResult = {
  actions?: Record<string, Action[]>;
  results?: Record<string, Record<string, FactMapResult>>;
};

type EngineResults = Record<string, RuleResult>;

export type DebugEvent =
  | StartingFactMapEvent
  | StartingFactEvent
  | ExecutedFactEvent
  | EvaluatedFactEvent
  | StartingRuleEvent
  | FinishedRuleEvent;
export type ErrorEvent =
  | FactEvaluationError
  | FactExecutionError
  | ActionExecutionError;
export type StartEvent = {
  context: Context;
  facts: Facts;
  rules: Rules;
  actions: Actions;
};
export type CompleteEvent = {
  context: Context;
  results: EngineResults;
};

export type DebugSubscriber = (event: DebugEvent) => void;
export type ErrorSubscriber = (event: ErrorEvent) => void;
export type StartSubscriber = (event: StartEvent) => void;

export type EventType = 'debug' | 'start' | 'complete' | 'error';

export type EventMap = {
  debug: DebugSubscriber;
  error: ErrorSubscriber;
};

export type CompleteSubscriber = (event: CompleteEvent) => void;

type Subscriber =
  | DebugSubscriber
  | ErrorSubscriber
  | StartSubscriber
  | CompleteSubscriber;

export type Context = Record<string, any>;

type PatchFunction<T> = (o: T) => T;

type Patch<T> = PatchFunction<T> | Partial<T>;

export interface RulesEngine {
  setRules(rules: Patch<Rules>): void;
  setActions(actions: Patch<Actions>): void;
  setFacts(facts: Patch<Facts>): void;
  run(context?: Context): Promise<EngineResults>;
  on(event: 'debug', subscriber: DebugSubscriber): Unsubscribe;
  on(event: 'start', subscriber: StartSubscriber): Unsubscribe;
  on(event: 'complete', subscriber: CompleteSubscriber): Unsubscribe;
  on(event: 'error', subscriber: ErrorSubscriber): Unsubscribe;
}

export default function createRulesEngine(
  validator: Validator,
  options?: Options,
): RulesEngine;
