/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseContextSchema, EventSchema } from '@asus-aics/xhis-schema';
import { EventEmitter2 } from 'eventemitter2';
import * as fastq from 'fastq';
import type { queueAsPromised } from 'fastq';
import { nanoid } from 'nanoid';
import { get } from 'lodash';
import {
  MachineOptions,
  AnyEventObject,
  StateSchema,
  assign,
  createMachine,
  Interpreter,
  State,
  EventObject,
  StateMachine,
  MachineConfig,
  StateNodeConfig,
  BaseActionObject,
  BaseAction,
  BaseActions,
  GuardMeta,
  TransitionConfig
} from 'xstate';
import {
  MachineId,
  EngineConfig,
  StateEvent,
  SyncEvent,
  EngineRole,
  EngineEvent,
  ActionEvent,
  FinalEvent,
  MonitorParams,
  Timing,
  CondPair,
  CondOp,
  CondDestination
} from './env';

import { isArray, isObject } from './utils';
import {
  ChartConfig,
  ChartBaseActions,
  ChartBaseAction,
  ChartStateNodeConfig
} from './declaration';
export type BaseState = State<BaseContextSchema>;

type BaseStateSchema = StateSchema<BaseContextSchema>;
type BaseMachine = StateMachine<BaseContextSchema, BaseStateSchema, EventObject>;
type Task = {
  type: EngineEvent,
  event: SyncEvent,
};
interface MetaEvent {
  events: EventSchema[];
}

class BaseStateEngine extends EventEmitter2 {
  static MachineId = MachineId.BASE;
  config: EngineConfig<BaseContextSchema>;
  machineId = MachineId.BASE;
  machine: BaseMachine;
  syncId: string;
  role: EngineRole;
  state: BaseState;
  chart?: ChartConfig<BaseContextSchema, any, EventObject>;
  queue: queueAsPromised<Task>;
  unconfirmState?: string;

  constructor(config?: EngineConfig<BaseContextSchema>) {
    super({ maxListeners: 100 });

    this.config = this.initConfig(config);
    this.role = this.config.useRoleAtInit ? this.config.role : EngineRole.SOURCE_AND_SINK;
    this.chart = this.config.chart;
    this.syncId = this.createSyncId();
    this.machine = this.createMachine();
    this.state = this.machine.initialState;
    this.registerEventListener();

    this.queue = fastq.promise(this, this.sendEventWorker, 1);
  }

  initMachine() {
    this.machine = this.createMachine();
    this.state = this.machine.initialState;
  }

  setMachineConfig(config: Partial<MachineOptions<BaseContextSchema, EventObject>>): void {
    this.machine = this.machine.withConfig(config);
  }

  getMachineServices() {
    return {};
  }

  getMachineGuards() {
    return {
      hasPrevStateFlag(ctx: unknown, event: SyncEvent) {
        return event.guards?.prevState === true;
      },
      hasLogoutFlag(ctx: unknown, event: SyncEvent) {
        return event.guards?.logout === true;
      },
      hasReloadFlag(ctx: unknown, event: SyncEvent) {
        return event.guards?.reload === true;
      },
      hasEventFlag(ctx: unknown, event: SyncEvent, condMeta: GuardMeta<BaseContextSchema, AnyEventObject>) {
        const pair = condMeta.cond as unknown as CondPair;
        const target = get(event, pair.path);

        if (pair.op === CondOp.Equal) {
          return target === pair.value;
        }

        if (pair.op === CondOp.NotEqual) {
          return target !== pair.value;
        }

        return false;
      },
      checkDestination(ctx: unknown, event: SyncEvent, condMeta: GuardMeta<BaseContextSchema, AnyEventObject>) {
        const { destination } = condMeta.cond as unknown as CondDestination;
        return event.guards?.destination === destination;
      },
    };
  }

  getMachineActions() {
    return {
      resetConfirmState: this.resetConfirmState(),
      assignContext: this.assignContext(),
      assignMetaEvent: this.assignMetaEvent(),
      clearContext: this.clearContext(),
      clearEvents: this.clearActionEvents(),
      reload: this.assignActionEvent(ActionEvent.RELOAD),
      useConfigRole: this.assignActionEvent(ActionEvent.CHANGE_ROLE, this.config.role),
      useSelfRole: this.assignActionEvent(ActionEvent.CHANGE_ROLE, EngineRole.SOURCE_AND_SINK),
      maximizeWindow: this.assignActionEvent(ActionEvent.MAXIMIZE_WINDOW),
      minimizeWindow: this.assignActionEvent(ActionEvent.MINIMIZE_WINDOW),
      restoreWindow: this.assignActionEvent(ActionEvent.RESTORE_WINDOW),
      closeWindow: this.assignActionEvent(ActionEvent.CLOSE_WINDOW),
      assertion: () => {
        throw new Error('assertion actions error');
      },
    };
  }

  resetConfirmState() {
    return () => {
      this.setNeedConfirmState(false);
      this.resetQueue();
    };
  }

  defaultChart(): ChartConfig<BaseContextSchema, any, EventObject> {
    return {
      id: 'base',
      initial: 'init',
      context: {},
      states: {
        init: {
          entry: ['assertion'],
          exit: ['assertion'],
          on: {
            RESOLVE: 'ready',
          },
        },
        ready: {
          type: 'final',
        },
      },
    };
  }

  setChart(input: any) {
    this.chart = input;
  }

  getConfigChart(): any {
    return this.chart;
  }

  getChart(): ChartConfig<BaseContextSchema, any, EventObject> {
    return this.chart || this.defaultChart();
  }

  transformChart<TContext extends BaseContextSchema, TStateSchema extends StateSchema<TContext> = StateSchema<TContext>, TEvent extends EventObject = EventObject>(input: any): MachineConfig<TContext, TStateSchema, TEvent> {
    // avoid input reference bug
    const chart = { ...JSON.parse(JSON.stringify(input)) } as ChartConfig<TContext, StateSchema, TEvent>;
    if (chart.states) {
      Object.values<ChartStateNodeConfig<TContext, TStateSchema, TEvent>>(chart.states).forEach((value) => {
        const stateNode = value as StateNodeConfig<TContext, TStateSchema, TEvent>;

        stateNode.entry = this.transformActions(chart.eachEntry, value.entry);
        stateNode.exit = this.transformActions(chart.eachExit, value.exit);

        if (stateNode.on) {
          this.transformStateOnEvent(value, chart);
          Object.assign(stateNode.on, {
            SELF: { internal: true, actions: ['assignContext'] },
          });
        }
      });
    }

    delete chart.eachEntry;
    delete chart.eachExit;

    return chart as MachineConfig<TContext, TStateSchema, TEvent>;
  }

  transformActions<TContext, TEvent extends EventObject>(each: ChartBaseActions | undefined, actions: ChartBaseActions | undefined) {
    const all: ChartBaseAction[] = [];
    const result: BaseActions<TContext, TEvent, BaseActionObject> = [];

    [each, actions].forEach((item) => {
      if (!item) {
        return;
      }

      if (Array.isArray(item)) {
        all.push(...item);
      } else {
        all.push(item);
      }
    });

    all.forEach((item: any) => {
      if (item && typeof item.func === 'string') {
        const func = (this as any)[item.func];
        if (typeof func !== 'function') {
          return;
        }

        result.push(func.apply(this, item.args) as BaseAction<TContext, TEvent, BaseActionObject>);
      } else {
        result.push(item as BaseAction<TContext, TEvent, BaseActionObject>);
      }
    });

    return result;
  }

  transformStateOnEvent<TContext extends BaseContextSchema, TStateSchema extends StateSchema<TContext> = StateSchema<TContext>, TEvent extends EventObject = EventObject>(stateNode: ChartStateNodeConfig<TContext, TStateSchema, TEvent, BaseActionObject>, chart: ChartConfig<TContext, StateSchema<any>, TEvent, BaseActionObject>) {
    if (!stateNode.on) {
      return;
    }

    Object.values(stateNode.on).forEach((data) => {
      if (!data || typeof data === 'string') {
        return;
      }

      if (Array.isArray(data)){
        data.forEach((item) => {
          const target = item as TransitionConfig<TContext, TEvent>;
          if (!item || typeof item === 'string') {
            return;
          }

          if ('actions' in item) {
            target.actions = this.transformActions([], item.actions);
          }
        });
      } else if ('actions' in data) {
        const target = data as TransitionConfig<TContext, TEvent>;
        target.actions = this.transformActions(chart.eachEntry, data.actions);
      }
    });
  }

  createMachine(): BaseMachine {
    return createMachine<BaseContextSchema, SyncEvent>(
      this.transformChart<BaseContextSchema>(this.getChart()),
      {
        services: this.getMachineServices(),
        actions: this.getMachineActions(),
        guards: this.getMachineGuards(),
      }
    );
  }

  initConfig(config?: EngineConfig<BaseContextSchema>) {
    return Object.assign(
      {
        role: EngineRole.SOURCE,
        syncId: MachineId.Undefined,
        needConfirmState: false,
      },
      config
    );
  }

  hasRole(role: EngineRole) {
    return (this.role & role) === role;
  }

  isSourceRole() {
    return this.role === EngineRole.SOURCE;
  }

  isSinkRole() {
    return this.role === EngineRole.SINK;
  }

  clearContext() {
    return assign<BaseContextSchema>((ctx) => {
      const result: Record<string, undefined> = {};

      Object.keys(ctx).forEach((key) => {
        result[key] = undefined;
      });

      return result;
    });
  }

  clearActionEvents() {
    return assign<BaseContextSchema>({
      action: (ctx) => {
        return {
          ...ctx.action,
          events: [],
        };
      },
    });
  }

  assignMetaEvent() {
    return assign<BaseContextSchema>({
      action: (ctx, event, actionMeta) => {
        const events = ctx.action?.events || [];
        const { state } = actionMeta;

        if (state?.meta) {
          Object.values(state.meta).forEach((metaValue) => {
            const metaEvents: EventSchema[] = (metaValue as MetaEvent).events;

            if (Array.isArray(metaEvents)) {
              events.push(...metaEvents);
            }
          });
        }

        return {
          ...ctx.action,
          events,
        };
      },
    });
  }

  assignContext() {
    return assign<BaseContextSchema, AnyEventObject>((ctx, event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = event.context || {};

      return obj;
    });
  }

  assignEventProps<T>(props: (keyof T)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {};

    props.forEach((key) => {
      obj[key] = (ctx: T, event: AnyEventObject) => event.data?.[key] || ctx[key];
    });

    return assign<T>(obj);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignActionEvent(name: string, value?: any) {
    return assign<BaseContextSchema>({
      action: (ctx) => {
        const events = ctx.action?.events || [];
        let data;

        if (typeof value === 'object') {
          data = value;
        } else {
          data = { value };
        }

        events.push({
          name,
          data,
        });

        return {
          ...ctx.action,
          events,
        };
      },
    });
  }

  resolveState(state: BaseState): void {
    this.state = this.machine.resolveState(State.create(state));
  }

  transitionState(event: SyncEvent): void {
    const state = this.machine.transition(this.state, event);

    if (Array.isArray(state.actions)) {
      for (const action of state.actions) {
        if (typeof action.exec === 'function') {
          action.exec(state.context, state.event, {
            action,
            state,
            _event: state._event,
          });
        }
      }
    }

    this.state = state;
  }

  async handleEngineAck(state: BaseState, event: SyncEvent):Promise<void> {
    if (!this.hasRole(EngineRole.SINK)) {
      return;
    }

    if (this.role === EngineRole.SINK) {
      this.resolveState(state);
    }

    if (event.type !== StateEvent.SELF) {
      await this.emitAction(event);
    }

    this.emit(EngineEvent.ACKED, event);
  }

  async handleEngineSync(event: SyncEvent): Promise<void> {
    const eventName = this.isSourceRole() ? EngineEvent.ACK : EngineEvent.SELF_ACK;
    const currentState = this.getSyncState();

    if (!this.hasRole(EngineRole.SOURCE)) {
      return;
    }

    if (event.stateType) {
      event.type = event.stateType;
    }

    if (event.syncState === currentState) {
      this.transitionState(event);
    }

    if (this.config.needConfirmState) {
      if (currentState !== this.getSyncState()) {
        this.unconfirmState = this.getSyncState();
      } else {
        this.unconfirmState = undefined;
      }
    }

    await this.emitAsync(EngineEvent.SYNCED, event);

    this.emit(eventName, this.state, event);
  }

  registerEventListener(): void {
    this.on(EngineEvent.SELF_ACK, this.handleEngineAck.bind(this));
    this.on(EngineEvent.SELF_SYNC, this.handleEngineSync.bind(this));
    this.on(ActionEvent.CHANGE_ROLE, (data) => {
      this.role = data.value as EngineRole;
    });
  }

  register(service: Interpreter<unknown>): void {
    service.onTransition(this.transitionListener.bind(this));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transitionListener(state: State<any>, event: FinalEvent): void {
    if (!state.done || !this.hasRole(EngineRole.SINK)) {
      return;
    }

    this.sendTransitionEvent({
      type: event.stateType || StateEvent.RESOLVE,
      machineId: this.machineId,
      data: event.data,
      context: state.context,
    });
  }

  sendTransitionEvent(event: SyncEvent): void {
    const eventName = this.isSinkRole() ? EngineEvent.SYNC : EngineEvent.SELF_SYNC;
    const syncEvent: SyncEvent = Object.assign(
      {
        machineId: this.getMachineId(),
        syncId: this.getSyncId(),
        syncState: this.getSyncState(),
        preSyncState: this.getPreSyncState(),
      },
      event
    );

    if (event.type === StateEvent.SELF) {
      // self transition doesn't change `syncState` and must be handled immediately
      this.emit(eventName, syncEvent);
    } else {
      this.queue.push({
        type: eventName,
        event: syncEvent,
      });
    }
  }

  setNeedConfirmState(need: boolean) {
    this.config.needConfirmState = need;
  }

  confirmState(syncState: string) {
    if (!this.config.needConfirmState) {
      return;
    }

    if (!this.unconfirmState && this.getSyncState() === syncState) {
      this.queue.resume();
      return;
    }

    if (this.unconfirmState === syncState) {
      this.unconfirmState = undefined;
      this.queue.resume();
    } else {
      this.emit(EngineEvent.STATE_MISMATCH, this.unconfirmState, syncState);
    }
  }

  resetQueue() {
    this.queue.killAndDrain();
    this.unconfirmState = undefined;
    this.queue.resume();
  }

  async sendEventWorker(task: Task): Promise<void> {
    if (!this.config.needConfirmState) {
      this.emit(task.type, task.event);
      return;
    }

    this.queue.pause();

    if (this.unconfirmState) {
      // has unconfirmed state already
      this.queue.unshift(task);
    } else {
      this.emit(task.type, task.event);
    }
  }

  async emitAction(event: SyncEvent, onlyAlways = false) {
    const events = this.state?.context.action?.events;

    if (!Array.isArray(events)) {
      return;
    }

    for (const { name, data } of events) {
      if (!onlyAlways || data.timing === Timing.Always) {
        await this.emitAsync(name, data, event);
      }
    }
  }

  getState(): BaseState {
    return this.state;
  }

  getContext(): BaseContextSchema {
    return this.getState().context;
  }

  getMachineId(): MachineId {
    return this.machineId;
  }

  getSyncId(): string {
    return this.syncId;
  }

  setSyncId(syncId: string): void {
    this.syncId = syncId;
  }

  static createSyncId(event?: SyncEvent) {
    if (event?.forceSyncId === true && typeof event?.syncId === 'string') {
      return event.syncId;
    }
  }

  static ensureSyncId(event?: SyncEvent) {
    return this.createSyncId(event) || `${this.MachineId}-${nanoid()}`;
  }

  createSyncId(event?: SyncEvent) {
    return (this.constructor as typeof BaseStateEngine).ensureSyncId(event);
  }

  getSyncState(): string {
    return this.getStateValue(this.state);
  }

  getPreSyncState(): string {
    const preState = this.state.history || this.machine.initialState;
    return this.getStateValue(preState);
  }

  private getStateValue(state: any): string {
    return typeof state.value === 'string' ? state.value : Object.keys(state.value).join('|');
  }
  
  getSchema() {
    return {} as const;
  }

  fillStore(root: Record<string, any>, schema: any = this.getSchema()): void {
    ['optionalProperties', 'properties'].forEach((key) => {
      const props: any = schema[key];

      if (!props) {
        return;
      }

      Object.keys(props).forEach((name) => {
        const prop = props[name];

        if (!prop) {
          return;
        }

        if (prop.elements && !isArray(root[name])) {
          root[name] = [];
        } else if (prop.optionalProperties || prop.properties) {
          if (!isObject(root[name])) {
            root[name] = {};
          }
          this.fillStore(root[name], prop);
        } else if (prop.values && !isObject(root[name])) {
          root[name] = {};
        }
      });
    });
  }

  getBoxKeys(): string[] {
    return [];
  }

  getMonitorParams(): MonitorParams[] {
    return [];
  }
}

export { BaseStateEngine };
