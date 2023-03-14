/* eslint-disable @typescript-eslint/no-explicit-any */
import { encounterContextSchema, EncounterContextSchema, EventSchema } from '@asus-aics/xhis-schema';
import { createMachine, EventObject, MachineConfig, State, StateMachine, StateSchema } from 'xstate';
import { MachineId, ActionEvent, EngineConfig, MonitorParams, MonitorTrigger, PresetKey, SyncEvent, Timing } from './env';
import { ChartConfig } from './declaration';
import { BaseStateEngine } from './base';
import { isArray } from 'lodash';

export type EncounterStateSchema = StateSchema<EncounterContextSchema>;
export type EncounterState = State<EncounterContextSchema>;
export type EncounterMachine = StateMachine<EncounterContextSchema, EncounterStateSchema, EventObject>;
export { EncounterContextSchema, EventSchema };

class EncounterStateEngine extends BaseStateEngine {
  static MachineId = MachineId.ENCOUNTER;
  machineId = MachineId.ENCOUNTER;
  machine: EncounterMachine;
  state: EncounterState;

  constructor(config?: EngineConfig<EncounterContextSchema>) {
    super(config);
    this.machine = this.createMachine();
    this.state = this.machine.initialState;
  }

  defaultChart(): ChartConfig<EncounterContextSchema, any, EventObject> {
    return {
      id: 'encounterFlow',
      initial: 'editor',
      context: {},
      meta: {
        soapTemplate: ['subjective', 'objective', 'assessment', 'plan'],
      },
      states: {
        editor: {
          initial: 'idle',
          type: 'parallel',
          entry: [
            {
              func: 'assignActionEvent',
              args: [
                ActionEvent.FETCH_DATA,
                {
                  contextKeys: ['patientId'],
                  api: 'patientContext',
                  data: {},
                  applyContextPath: ['patientContext'],
                  timing: Timing.Always,
                }
              ],
            },
            {
              func: 'assignActionEvent',
              args: [
                ActionEvent.FETCH_DATA,
                {
                  contextKeys: ['patientId'],
                  presetKeys: [PresetKey.DOCTOR_ID],
                  api: 'patientMemo',
                  data: {},
                  applyContextPath: ['memo', 'private', PresetKey.DOCTOR_ID],
                  timing: Timing.Always,
                }
              ],
            }
          ],
          states: {
            soapEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_SOAP: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
            icdEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_ICD: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
            orderEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_ORDER: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
            drugEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_DRUG: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
            vitalSignEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_VITAL_SIGN: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
            },
            idForm: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_ID_FORM: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
            memoPersonEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_MEMO_PERSON: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
            memoGlobalEditor: {
              initial: 'init',
              states: {
                init: {
                  on: {
                    UPDATE_MEMO_GLOBAL: { internal: true, actions: ['assignContext'] },
                  },
                },
              },
              tags: ['editor'],
            },
          },
          on: {
            RESOLVE: 'finish',
          },
        },
        finish: {
          type: 'final',
        },
      },
    };
  }

  generateTemplate (soap: string[] | unknown) {
    if (!isArray(soap)) {
      return soap;
    }

    return soap.map((name) => {
      return {
        'type': 'aicstemplate',
        'attrs': {
          'key': name.charAt(0).toUpperCase(),
          'name': name,
        },
        'content': [{
          'type': 'paragraph',
        }],
      };
    });
  }

  getSoapContent(soapTemplate: string[] | unknown) {
    return {
      'type': 'aicsdoc',
      'content': this.generateTemplate(soapTemplate),
    };
  }

  transformChart<TContext extends EncounterContextSchema, TStateSchema extends StateSchema<TContext> = StateSchema<TContext>, TEvent extends EventObject = EventObject>(input: any): MachineConfig<TContext, TStateSchema, TEvent> {
    const chart = super.transformChart(input);
    if (chart?.meta?.soapTemplate) {
      chart.meta.soapTemplate = this.getSoapContent(chart.meta.soapTemplate);
    }
    return chart as MachineConfig<TContext, TStateSchema, TEvent>;
  }

  createMachine(): EncounterMachine {
    return createMachine<EncounterContextSchema, SyncEvent>(
      this.transformChart<EncounterContextSchema>(this.getChart()),
      {
        services: this.getMachineServices(),
        actions: this.getMachineActions(),
        guards: this.getMachineGuards(),
      }
    );
  }

  assignEventProps<EncounterContextSchema>(props: (keyof EncounterContextSchema)[]) {
    return super.assignEventProps<EncounterContextSchema>(props);
  }

  static createSyncId(event?: SyncEvent): string | undefined {
    let syncId = BaseStateEngine.createSyncId(event);

    if (!syncId && typeof event?.data?.stateJSON?.context.encounterId === 'string') {
      syncId = `${MachineId.ENCOUNTER}-${event.data.stateJSON.context.encounterId}`;
    }

    return syncId;
  }

  getEncounterId() {
    return this.state.context.encounterId;
  }

  createSyncId(event?: SyncEvent) {
    return EncounterStateEngine.createSyncId(event) || super.createSyncId(event);
  }

  getState(): EncounterState {
    return this.state;
  }

  getContext(): EncounterContextSchema {
    return this.state.context;
  }

  getSchema() {
    return encounterContextSchema;
  }

  getBoxKeys(): string[] {
    return ['icdList'];
  }

  getMonitorParams(): MonitorParams[] {
    return [
      {
        /** used for drug safety */
        contextKeys: [
          'deptId',
          'patientGender',
          'patientBirthDate',
          'icdList',
          'soap.subjectiveText',
          'soap.objectiveText',
          'soap.assessmentText',
          'soap.planText'
        ],
        trigger: MonitorTrigger.Publish,
        publishConfig: {
          appendSyncId: true,
          appendSingleAwareUserId: true,
        },
      }, {
        contextKeys: [ 'memo' ],
        trigger: MonitorTrigger.SyncContext,
        syncContextConfig: {
          ignoreSelfSyncId: true,
          filterContextKeys: ['patientId'],
          SyncContextBase: 'memo',
        },
      }
    ];
  }

  getSoapTemplate() {
    return this.machine.config.meta?.soapTemplate || {};
  }
}

export { EncounterStateEngine };
