/* eslint-disable @typescript-eslint/no-explicit-any */
import { State } from 'xstate';
import {
  MachineId,
  ActionEvent,
  OpdStateEngine,
  EngineRole,
  EngineEvent,
  FinalEvent,
  StateEvent,
  SyncEvent,
  EngineConfig
} from '../src/index';
import { CondOp } from '../src/env';
import { OpdContextSchema } from '@asus-aics/xhis-schema';

describe('test opd state engine', () => {
  const config: EngineConfig<OpdContextSchema> = {
    syncId: 'test-id',
    role: EngineRole.SOURCE,
  };
  const engine = new OpdStateEngine(config);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('test instance and properties', () => {
    expect(engine).toBeDefined();
    expect(engine).toEqual(
      expect.objectContaining({
        config: expect.any(Object),
        state: expect.any(Object),
        machine: expect.any(Object),
      })
    );
  });

  it('test state machine guards', () => {
    const { guards } = engine.machine.options;

    expect(guards.hasLogoutFlag({ encounter: { roomId: 'abc' } }, { type: 'test', guards: { logout: true } } as any, {} as any)).toBeTruthy();

    expect(guards.hasValidJwt({}, { type: 'test' }, {} as any)).toBeFalsy();
    expect(guards.hasValidJwt({ auth: { jwt: '', token: '' } }, { type: 'test' }, {} as any)).toBeFalsy();
    expect(guards.hasValidJwt({ auth: { jwt: 'a', token: 'b' } }, { type: 'test' }, {} as any)).toBeTruthy();

    expect(guards.hasValidRoom({}, { type: 'test' }, {} as any)).toBeFalsy();
    expect(guards.hasValidRoom({ encounter: { roomId: '' } }, { type: 'test' }, {} as any)).toBeFalsy();
    expect(guards.hasValidRoom({ encounter: { roomId: 'abc' } }, { type: 'test' }, {} as any)).toBeTruthy();

    expect(guards.hasReloadFlag({ encounter: { roomId: 'abc' } }, { type: 'test', guards: {} } as any, {} as any)).toBeFalsy();

    expect(guards.hasEventFlag(
      {},
      { type: 'test', guards: {}, data: { test: 'value' } } as any,
      { cond: { path: ['data', 'test'], op: CondOp.Equal, value: 'no' } } as any
    )).toBeFalsy();

    expect(guards.hasEventFlag(
      {},
      { type: 'test', guards: {}, data: { test: 'value' } } as any,
      { cond: { path: ['data', 'test'], op: CondOp.Equal, value: 'value' } } as any
    )).toBeTruthy();

    expect(guards.hasEventFlag(
      {},
      { type: 'test', guards: {}, data: { test: 'value' } } as any,
      { cond: { path: ['data', 'test'], op: 'noSuchOp', value: 'value' } } as any
    )).toBeFalsy();

    expect(guards.checkDestination(
      {},
      { type: 'test', guards: { destination: 'path-false' } } as any,
      { cond: { destination: 'path' } } as any
    )).toBeFalsy();

    expect(guards.checkDestination(
      {},
      { type: 'test', guards: { destination: 'path' } } as any,
      { cond: { destination: 'path' } } as any
    )).toBeTruthy();
  });

  it('test assignActionEvent', () => {
    const result = engine.assignActionEvent('testEvent', 'login');

    expect(result).toStrictEqual({ type: 'xstate.assign', assignment: { action: expect.any(Function) } });

    const action = (result.assignment as any).action;
    const result2 = action({}, { type: 'test' }, {});

    expect(result2).toStrictEqual({ events: [{ name: 'testEvent', data: { value: 'login' } }] });
  });

  it('test clearActionEvents', () => {
    const result = engine.clearActionEvents();
    const fakeEvents = [{ name: 'test1', data: 123 }];

    expect(result).toStrictEqual({ type: 'xstate.assign', assignment: { action: expect.any(Function) } });

    const action = (result.assignment as any).action;
    const result2 = action({
      action: {
        events: fakeEvents,
      },
    });

    expect(result2).toStrictEqual({ events: [] });
  });

  it('test clearContext', () => {
    const result = engine.clearContext();
    const fakeCtx = { a: 1, b: 2 };

    expect(result).toStrictEqual({ type: 'xstate.assign', assignment: expect.any(Function) });

    const action = (result as any).assignment;
    const result2 = action(fakeCtx);

    expect(result2).toStrictEqual({ a: undefined, b: undefined });
  });

  it('test registerEventListener', () => {
    const spyOn = jest.spyOn(engine, 'on');

    engine.registerEventListener();
    expect(spyOn).toBeCalledWith(EngineEvent.SELF_SYNC, expect.any(Function));
    expect(spyOn).toHaveBeenCalledWith(EngineEvent.SELF_ACK, expect.any(Function));
    expect(spyOn).toHaveBeenCalledWith(ActionEvent.CHANGE_ROLE, expect.any(Function));
  });

  it('test handleEngineAck', () => {
    const fakeState = State.from({}, {});
    const spyAction = jest.spyOn(engine, 'emitAction');

    engine.role = EngineRole.SINK;
    engine.handleEngineAck(fakeState, { type: StateEvent.RESOLVE });

    expect(spyAction).toBeCalledWith(expect.anything());
  });

  it('test transitionListener', () => {
    const fakeState = Object.assign({}, engine.machine.initialState);
    const fakeEvent: FinalEvent = { type: 'final' };
    const stubSend = jest.spyOn(engine, 'sendTransitionEvent').mockImplementation();

    engine.transitionListener(fakeState, fakeEvent);
    expect(stubSend).not.toBeCalled();

    engine.role = EngineRole.SINK;
    fakeState.done = true;
    engine.transitionListener(fakeState, fakeEvent);
    expect(stubSend).toBeCalledWith({
      type: StateEvent.RESOLVE,
      machineId: engine.machineId,
      data: undefined,
      context: {
        action: {
          events: [],
        },
      },
    });
  });

  it('test handleAction', async () => {
    const fakeState = Object.assign({}, engine.machine.initialState);
    const fakeEvent: SyncEvent = { type: StateEvent.RESOLVE };
    const spyEmit = jest.spyOn(engine, 'emitAsync');

    engine.state = fakeState;
    delete fakeState.context.action;
    await engine.emitAction(fakeEvent);
    expect(spyEmit).not.toBeCalled();

    fakeState.context.action = { events: [{ name: 'ev1', data: {} }, { name: 'ev2', data: {} }] };
    await engine.emitAction(fakeEvent);
    expect(spyEmit).toBeCalledTimes(2);
  });

  it('test getContext', () => {
    expect(engine.getContext()).toStrictEqual(engine.state.context);
  });

  it('test default getMachineId, getSyncState', () => {
    const defaultEngine = new OpdStateEngine();
    expect(defaultEngine.getMachineId()).toStrictEqual('opd');

    defaultEngine.machineId = MachineId.IPD;
    expect(defaultEngine.getMachineId()).toStrictEqual('ipd');

    expect(defaultEngine.getSyncState()).toStrictEqual('begin');


    defaultEngine.state.context = {};
    expect(defaultEngine.getSyncState()).toStrictEqual('begin');
  });

  it('test handleEngineSync', async () => {
    const spyTrans = jest.spyOn(engine, 'transitionState').mockImplementation();
    const sendEvent: SyncEvent = {
      machineId: MachineId.OPD,
      syncState: engine.getSyncState(),
      type: 'RESOLVE',
      context: {},
    };

    engine.role = EngineRole.SOURCE_AND_SINK;
    await engine.handleEngineSync(sendEvent);
    expect(spyTrans).toBeCalled();
  });

  it('test machine', async () => {
    const spyEmit = jest.spyOn(engine, 'emitAsync');

    engine.config.role = EngineRole.SOURCE;
    engine.role = EngineRole.SOURCE_AND_SINK;
    engine.state = engine.machine.initialState;

    while (engine.state.value !== 'patientList') {
      engine.transitionState({
        machineId: engine.machineId,
        type: StateEvent.RESOLVE,
      });

      const resetTelemetryStates = ['launcher', 'login', 'bind', 'patientList', 'patientDetail'];
      if (resetTelemetryStates.includes(engine.state.value as string)) {
        const hasReset = engine.state.context.action?.events.some((item) => item.name === 'actionTelemetryResetOperationId');
        expect(hasReset).toBeTruthy();
      }

      engine.state.context.action?.events.forEach((event) => {
        if ([ActionEvent.SHOW_PAGE, ActionEvent.SHOW_DIALOG].includes(event.name as ActionEvent)) {
          expect(event.data?.value).toStrictEqual(engine.state.value);
        }
      });

      await engine.emitAction({ type: StateEvent.RESOLVE });
    }

    const maxWin = engine.state.context.action?.events.some((item) => item.name === 'actionMaximizeWindow');

    expect(maxWin).toBeTruthy();
    expect(engine.role).toStrictEqual(EngineRole.SOURCE_AND_SINK);
    expect(engine.state.value).toEqual('patientList');
    expect(spyEmit).toBeCalledWith(ActionEvent.UPDATE_WINDOW_MINIMUM_SIZE, { scaleRatio: { width: 0.75, height: 0.8 } }, expect.anything());
  });

  it('test fillStore', () => {
    const fakeStore = {};

    engine.fillStore(fakeStore);

    expect(fakeStore).toStrictEqual({
      action: { events: [] },
      auth: {},
      encounterSyncIdMap: {},
      encounter: {},
      user: {
        permission: {
          actions: [],
          notActions: [],
        },
        computedPermission: {
          actions: [],
          notActions: [],
        },
        roles: [],
      },
    });
  });

  it('test initMachine', () => {
    const spyCreate = jest.spyOn(engine, 'createMachine');
    engine.initMachine();
    expect(spyCreate).toBeCalled();
  });

  it('test setChart', () => {
    engine.setChart({ a: 1 });
    expect(engine.getConfigChart()).toStrictEqual(engine.chart);
  });

  it('test fillStore', () => {
    const fakeStore: any = {};
    const expectedStore = {
      action: { events: [] },
      auth: {},
      encounterSyncIdMap: {},
      encounter: {},
      user: {
        computedPermission: { actions: [], notActions: [] },
        permission: { actions: [], notActions: [] },
        roles: [],
      },
    };

    engine.fillStore(fakeStore);
    expect(fakeStore).toStrictEqual(expectedStore);

    fakeStore.encounter = null;
    fakeStore.user.roles = 123;
    fakeStore.user.permission = {};
    engine.fillStore(fakeStore);
    expect(fakeStore).toStrictEqual(expectedStore);
  });

  it('test box keys', () => {
    expect(engine.getBoxKeys()).toStrictEqual([]);
  });

  it('test resetConfirmState', () => {
    const restStub = jest.spyOn(engine, 'resetQueue');

    engine.resetConfirmState()();

    expect(engine.config.needConfirmState).toEqual(false);
    expect(restStub).toBeCalled();
  });
});
