/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpdContextSchema, EventSchema, opdContextSchema, FormStatus, EncounterRuleAuditStatus } from '@asus-aics/xhis-schema';
import { createMachine, EventObject, State, StateMachine, StateSchema } from 'xstate';
import { MachineId, EngineConfig, ActionEvent, SyncEvent, MonitorTrigger, MonitorParams, CondOp, Timing } from './env';
import { ChartConfig } from './declaration';
import { BaseStateEngine } from './base';

export type OpdStateSchema = StateSchema<OpdContextSchema>;
export type OpdState = State<OpdContextSchema>;
export type OpdMachine = StateMachine<OpdContextSchema, OpdStateSchema, EventObject>;
export { OpdContextSchema, EventSchema };

class OpdStateEngine extends BaseStateEngine {
  static MachineId = MachineId.OPD;
  machineId = MachineId.OPD;
  machine: OpdMachine;
  state: OpdState;

  constructor(config?: EngineConfig<OpdContextSchema>) {
    super(config);
    this.machine = this.createMachine();
    this.state = this.machine.initialState;
  }

  defaultChart(): ChartConfig<OpdContextSchema, any, EventObject> {
    return {
      id: 'opdFlow',
      initial: 'begin',
      context: {},
      eachExit: ['clearEvents'],
      states: {
        begin: {
          entry: ['clearEvents'],
          on: {
            RESOLVE: 'launcher',
          },
        },
        launcher: {
          entry: [
            { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'launcher'] }
          ],
          on: {
            RESOLVE: 'preload',
            REJECT: 'launcher',
          },
        },
        preload: {
          entry: [{ func: 'assignActionEvent', args: [ActionEvent.SHOW_DIALOG, 'preload'] }],
          on: {
            RESOLVE: 'preLogin',
            REJECT: 'preload',
          },
        },
        preLogin: {
          always: [
            {
              target: 'bind',
              cond: 'hasValidJwt',
            },
            {
              target: 'login',
            }
          ],
        },
        login: {
          entry: [
            { func: 'resetConfirmState', args: [] },
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'login'] },
            { func: 'assignActionEvent', args: [ActionEvent.UPDATE_WINDOW_MINIMUM_SIZE, { scaleRatio: { width: 0.75, height: 0.8 } }] },
            { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] }
          ],
          on: {
            RESOLVE: 'bind',
            REJECT: 'login',
          },
        },
        bind: {
          entry: [
            { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'bind'] },
            {
              func: 'assignActionEvent',
              args: [
                ActionEvent.CALC_PERM,
                {
                  jwtPath: 'auth.jwt',
                  roleScope: 'medical/',
                  rolePath: 'user.roles',
                  permPath: 'user.permission',
                  computedPermPath: 'user.computedPermission',
                  ruleParams: {
                    contextKeys: ['encounterSyncId'],
                    req: {
                      triggers: [{
                        type: 9,
                        resultKey: '@opd.permission',
                      }],
                    },
                  },
                }
              ],
            }
          ],
          on: {
            RESOLVE: [
              {
                target: 'reload',
                cond: 'hasReloadFlag',
              },
              {
                target: 'patientList',
                actions: [
                  'maximizeWindow'
                ],
              }
            ],
            REJECT: [
              {
                target: 'logout',
                cond: 'hasLogoutFlag',
              },
              {
                target: 'bind',
              }
            ],
          },
        },
        reload: {
          entry: ['reload'],
          type: 'final',
        },
        patientList: {
          entry: [
            { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'patientList'] }
          ],
          on: {
            RESOLVE: {
              target: 'patientDetail',
            },
            REJECT: [
              {
                target: 'logout',
                cond: 'hasLogoutFlag',
              },
              {
                target: 'patientList',
              }
            ],
          },
        },
        patientDetail: {
          entry: [
            { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'patientDetail'] },
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PATIENT_FORM, { timing: Timing.Entry, page: 'patientDetail' }] }
          ],
          on: {
            RESOLVE: [
              {
                cond: 'hasPrevStateFlag',
                target: 'patientList',
              },
              {
                internal: true,
                cond: {
                  type: 'hasEventFlag',
                  contextCond: [{ path: ['data', 'encounter', 'patientForm'], op: CondOp.NotEqual, value: FormStatus.Completed }],
                },
                actions: [
                  { func: 'assignActionEvent', args: [ActionEvent.SHOW_PATIENT_FORM, { timing: Timing.Exit, page: 'patientDetail' }] }
                ],
              },
              {
                internal: true,
                cond: {
                  type: 'hasEventFlag',
                  contextCond: [{ path: ['data', 'encounter', 'encounterRuleAudit'], op: CondOp.NotEqual, value: EncounterRuleAuditStatus.Completed }],
                },
                actions: [
                  { func: 'assignActionEvent', args: [ActionEvent.RUN_AUDIT, { timing: Timing.Exit, page: 'patientDetail' }] }
                ],
              }
            ],
            REJECT: [
              {
                target: 'logout',
                cond: 'hasLogoutFlag',
              },
              {
                target: 'patientList',
              }
            ],
          },
        },
        logout: {
          entry: [
            'clearContext',
            { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'logout'] }
          ],
          type: 'final',
        },
      },
    };
  }

  getMachineGuards() {
    return Object.assign({
      hasValidJwt(context: OpdContextSchema) {
        return typeof context.auth?.jwt === 'string' && context.auth.jwt.length > 0;
      },
      hasValidRoom(context: OpdContextSchema) {
        return typeof context.encounter?.roomId === 'string' && context.encounter.roomId.length > 0;
      },
    }, super.getMachineGuards());
  }

  getMachineActions() {
    return Object.assign({
      updateUserAndAuth: this.assignEventProps<OpdContextSchema>(['user', 'auth']),
    }, super.getMachineActions());
  }

  createMachine(): OpdMachine {
    return createMachine<OpdContextSchema, SyncEvent>(
      this.transformChart<OpdContextSchema>(this.getChart()),
      {
        services: this.getMachineServices(),
        actions: this.getMachineActions(),
        guards: this.getMachineGuards(),
      }
    );
  }

  assignEventProps<OpdContextSchema>(props: (keyof OpdContextSchema)[]) {
    return super.assignEventProps<OpdContextSchema>(props);
  }

  getState(): OpdState {
    return this.state;
  }

  getContext(): OpdContextSchema {
    return this.state.context;
  }

  getSchema() {
    return opdContextSchema;
  }

  getMonitorParams(): MonitorParams[] {
    return [
      {
        /** monitor encounterSyncId & trigger ActionEvent.CALC_PERM */
        contextKeys: ['encounterSyncId', 'isCardInserted', 'encounter.encounterStatus'],
        trigger: MonitorTrigger.Action,
        actionConfig: {
          actionEvent: ActionEvent.CALC_PERM,
          data: {
            jwtPath: 'auth.jwt',
            roleScope: 'medical/',
            rolePath: 'user.roles',
            permPath: 'user.permission',
            computedPermPath: 'user.computedPermission',
            ruleParams: {
              contextKeys: ['encounterSyncId'],
              req: {
                triggers: [{
                  type: 9,
                  resultKey: '@opd.permission',
                }],
              },
            },
          },
        },
      }
    ];
  }
}

export { OpdStateEngine };
