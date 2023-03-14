/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventObject } from 'xstate';
import { OpdContextSchema, EncounterRuleAuditStatus, FormStatus } from '@asus-aics/xhis-schema';
import { ChartConfig } from '../../declaration';
import { ActionEvent, CondOp, Timing } from '../../env';

export function getChart(): ChartConfig<OpdContextSchema, any, EventObject> {
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
              target: 'mainMenu',
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
      mainMenu: {
        entry: [
          { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
          { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'mainMenu'] }
        ],
        on: {
          RESOLVE: [{
            target: 'registration',
            cond: {
              type: 'checkDestination',
              destination: 'registration',
            },
          }, {
            target: 'cashier',
            cond: {
              type: 'checkDestination',
              destination: 'cashier',
            },
          }, {
            target: 'patientList',
            cond: {
              type: 'checkDestination',
              destination: 'patientList',
            },
          }],
          REJECT: [
            {
              target: 'logout',
              cond: 'hasLogoutFlag',
            },
            {
              target: 'mainMenu',
            }
          ],
        },
      },
      registration: {
        entry: [
          { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
          { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'registration'] }
        ],
        on: {
          RESOLVE: [
            {
              target: 'mainMenu',
              cond: {
                type: 'checkDestination',
                destination: 'mainMenu',
              },
            }, {
              target: 'cashier',
              cond: {
                type: 'checkDestination',
                destination: 'cashier',
              },
            }],
          REJECT: [
            {
              target: 'logout',
              cond: 'hasLogoutFlag',
            },
            {
              target: 'registration',
            }
          ],
        },
      },
      cashier: {
        entry: [
          { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
          { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'cashier'] }
        ],
        on: {
          RESOLVE: [
            {
              target: 'mainMenu',
              cond: {
                type: 'checkDestination',
                destination: 'mainMenu',
              },
            }, {
              target: 'registration',
              cond: {
                type: 'checkDestination',
                destination: 'registration',
              },
            }],
          REJECT: [
            {
              target: 'logout',
              cond: 'hasLogoutFlag',
            },
            {
              target: 'cashier',
            }
          ],
        },
      },
      patientList: {
        entry: [
          { func: 'assignActionEvent', args: [ActionEvent.TELEMETRY_RESET_OPERATION_ID] },
          { func: 'assignActionEvent', args: [ActionEvent.SHOW_PAGE, 'patientList'] }
        ],
        on: {
          RESOLVE: [{
            target: 'mainMenu',
            cond: {
              type: 'checkDestination',
              destination: 'mainMenu',
            },
          }, {
            target: 'patientDetail',
          }],
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