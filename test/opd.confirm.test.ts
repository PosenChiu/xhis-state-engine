import {
  OpdStateEngine,
  EngineRole,
  StateEvent,
  EngineConfig,
  EngineEvent
} from '../src/index';
import { OpdContextSchema } from '@asus-aics/xhis-schema';


describe('test opd state engine with confirm state enabled', () => {
  const config: EngineConfig<OpdContextSchema> = {
    syncId: 'test-id',
    role: EngineRole.SOURCE_AND_SINK,
    needConfirmState: true,
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

  it('test confirm state', async () => {
    engine.state = engine.machine.initialState;

    engine.sendTransitionEvent({
      machineId: engine.machineId,
      type: StateEvent.RESOLVE,
      data: 1,
    });
    expect(engine.getSyncState()).toEqual('launcher');
    expect(engine.unconfirmState).toEqual('launcher');
    expect(engine.queue.length()).toEqual(0);

    engine.sendTransitionEvent({
      machineId: engine.machineId,
      type: StateEvent.RESOLVE,
      data: 2,
    });
    expect(engine.queue.length()).toEqual(1);
    engine.confirmState('launcher');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(engine.queue.length()).toEqual(0);
    expect(engine.unconfirmState).toEqual('preload');
    engine.confirmState('preload');

    engine.sendTransitionEvent({
      machineId: engine.machineId,
      type: StateEvent.SELF,
      data: 3,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(engine.queue.length()).toEqual(0);
    expect(engine.unconfirmState).toEqual(undefined);
  });

  it('test confirm state with mismatch', () => {
    const spyResume = jest.spyOn(engine.queue, 'resume').mockImplementation();
    const spyEmit = jest.spyOn(engine, 'emit');

    engine.config.needConfirmState = true;
    engine.unconfirmState = undefined;
    engine.confirmState(engine.getSyncState());
    expect(spyResume).toBeCalled();

    engine.confirmState('newState');
    expect(spyEmit).toBeCalledWith(EngineEvent.STATE_MISMATCH, engine.unconfirmState, 'newState');

  });

  it('test resetQueue', () => {
    engine.resetQueue();

    expect(engine.queue.length()).toEqual(0);
    expect(engine.unconfirmState).toEqual(undefined);
  });
});
