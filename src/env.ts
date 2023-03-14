/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventObject } from 'xstate';
import { ChartConfig } from './declaration';

export enum MachineId {
  Undefined = 'undefined',
  BASE = 'base',
  OPD = 'opd',
  IPD = 'ipd',
  ENCOUNTER = 'encounter',
  LOCAL_ENCOUNTER = 'localEncounter'
}

export type EngineConfig<TContext> = {
  /** Sync ID for state machine instance, it should be doctor ID or unique string */
  syncId?: string,
  role: EngineRole,
  useRoleAtInit?: boolean,
  chart?: ChartConfig<TContext>,
  needConfirmState?: boolean,
};


export enum DataChangeNameSpace {
  OpdAppointment = 'opdAppointment',
  Report = 'report'
}

/**
 * an event used to exchange information between widget and manager state chart
 *
 * @export
 * @interface FinalEvent
 * @extends {EventObject}
 */
export interface FinalEvent extends EventObject {
  /**
   * guard flags for conditional judgement
   */
  guards?: GuardFlags;
  /**
   * the information need to be exhcanged
   */
  data?: any,
  /**
   * trigger of the information
   *
   * @type {keyof typeof StateEvent}
   * @memberof FinalEvent
   */
  stateType?: keyof typeof StateEvent;
}

export interface SyncEvent extends FinalEvent {
  /** partial context which will be used to overwrite state context */
  context?: Record<string, unknown>;
  /** state chart ID (type), like 'opd', 'encounter', ... */
  machineId?: MachineId,
  /** sync id for state chart instance, it could be unique id or shared id depends on purpose */
  syncId?: string,
  /** should use sync id in event or not */
  forceSyncId?: boolean,
  /** sync state. It is used to check state is synchronized among instances */
  syncState?: string,
  /**client side previous state,server will only handel currentState equal to syncstate or preSyncState */
  preSyncState?: string,
  /** sequence string for xstate and ydoc */
  docSeq?: string;
  /** chart for state machine update */
  chart?: any;
  /** preset data */
  preset?: Record<string, any>;
}

export enum EngineRole {
  NONE = 0,
  SOURCE = 1 << 0,
  SINK = 1 << 1,
  SOURCE_AND_SINK = EngineRole.SOURCE | EngineRole.SINK
}

export enum EngineEvent {
  SELF_SYNC = 'engineSelfSync',
  SELF_ACK = 'engineSelfAck',
  SYNC = 'engineSync',
  ACK = 'engineAck',
  SYNCED = 'engineSynced',
  ACKED = 'engineAcked',
  SWITCH = 'engineSwitch',
  RESTORE = 'engineRestore',
  STATE_MISMATCH = 'engineStateMismatch'
}

export enum ActionEvent {
  RELOAD = 'actionReload',
  SHOW_PAGE = 'actionShowPage',
  SHOW_DIALOG = 'actionShowDialog',
  HIDE_DIALOG = 'actionHideDialog',
  SHOW_PATIENT_FORM = 'actionShowPatientForm',
  CHANGE_ROLE = 'actionChangeRole',
  MAXIMIZE_WINDOW = 'actionMaximizeWindow',
  MINIMIZE_WINDOW = 'actionMinimizeWindow',
  RESTORE_WINDOW = 'actionRestoreWindow',
  CLOSE_WINDOW = 'actionCloseWindow',
  RUN_AUDIT = 'actionRunAudit',
  CALC_PERM = 'actionCalcPerm',
  FETCH_DATA = 'actionFetchData',
  UPDATE_WINDOW_MINIMUM_SIZE = 'actionUpdateWindowMinimumSize',
  SET_ZOOM_FACTOR = 'actionSetZoomFacor',
  TELEMETRY_RESET_OPERATION_ID = 'actionTelemetryResetOperationId'
}

export enum PresetKey {
  USER_ID = 'userId',
  DOCTOR_ID = 'doctorId'
}

export enum Timing {
  Init = 'init',
  Always = 'always',
  Entry = 'entry',
  Exit = 'exit'
}

export interface BaseActionParams {
  /** keys will be picked from context */
  contextKeys: string[];
  /** keys will be pricked from preset */
  presetKeys?: string[];
  /** extra data for api */
  data?: Record<string, unknown>;
  /** timing, default is init */
  timing?: Timing;
}

export interface FetchDataParams extends BaseActionParams {
  /** engine api */
  api: string;
  /** data will be stored at context path */
  applyContextPath: string[];
}

export enum MonitorTrigger {
  None,
  Publish,
  Action,
  SyncContext
}

export interface MonitorParams extends BaseActionParams {
  /**
   * trigger type when monitored context keys changed
   */
  trigger: MonitorTrigger;
  /**
   * action config for trigger
   */
  actionConfig?: {
    actionEvent: ActionEvent,
    data: RuleActionParams | PermActionParams;
  };
  publishConfig?: {
    appendSyncId: boolean;
    appendSingleAwareUserId: boolean;
  };
  syncContextConfig?: {
    ignoreSelfSyncId: boolean;
    filterContextKeys: string[],
    SyncContextBase: string;
  };
}

/** Params for ActionEvent.RUN_RULE */
export interface RuleActionParams extends BaseActionParams {
  /** post body for rule runner api request */
  req: {
    triggers: [{
      type: number,
      resultKey: string,
    }];
  };
}

/** Params for ActionEvent.CALC_PERM */
export interface PermActionParams {
  /** path to get jwt */
  jwtPath: string;
  /** original role scope from iam */
  roleScope: string;
  /** path to set role */
  rolePath: string;
  /** path to set permission */
  permPath: string;
  /** path to set computed permission */
  computedPermPath: string;
  /** rule api data */
  ruleParams: RuleActionParams;
}

export enum WaitEvent {
  PAGE_MOUNTED = 'waitForpageMounted'
}

export enum StateEvent {
  RESOLVE = 'RESOLVE',
  SELF = 'SELF',
  REJECT = 'REJECT'
}

export enum SocketEvent {
  Init = 'init',
  Send = 'send',
  Fetch = 'fetch',
  Error = 'error',
  Leave = 'leave',
  SaveDraft = 'save-draft',
  CompleteEncounter = 'complete-encounter',
  AbandonCurrentEdit = 'abandon-current-edit',
  SaveCatastrophicData = 'save-catastrophic-data',
  SaveDraftInBatch = 'save-draft-in-batch',
  SaveDraftProgress = 'save-draft-progress',
  Notify = 'notify',
  STATE_MISMATCH = 'engineStateMismatch',
  EncounterRecordFirstTimeEdit = 'encounterRecordFirstTimeEdit',
  ClearEncounter = 'clear-encounter'
}

export enum YDocRoot {
  Context = 'context',
  Soap = 'soap'
}

export enum YDocEvent {
  Context = 'ydocContext',
  Soap = 'ydocSoap'
}

export interface GuardFlags {
  reload?: boolean;
  logout?: boolean;
  prevState?: boolean;
  [key: string]: boolean | string | number | undefined;
}

export type ContextPath = Array<string>;

export enum CondOp {
  Equal = 'equal',
  NotEqual = 'notEqual'
}

export interface CondPair {
  path: ContextPath,
  op: CondOp,
  value: any;
}

export interface CondDestination {
  destination: string,
}

export enum NotifyType {
  // filter
  None = 'none',
  User = 'user',
  Patient = 'patient',
  // message
  Encounter = 'encounter',
  Announcement = 'announcement',
  Report = 'report',
  DataChange = 'dataChange',
  Action = 'action'
}

export enum NotifyAction {
  ClearEncounter = 'clear-encounter',
  HandleAiServiceHealth = 'handle-ai-service-health'
}


export interface NoneNotifyFilter {
  type: NotifyType.None;
}

export interface UserNotifyFilter {
  type: NotifyType.User;
  userId: string;
}

export interface PatientNotifyFilter {
  type: NotifyType.Patient;
  patientId?: string;
  encounterId?: string;
  roomId?: string;
  practitionerId?: string;
}

export interface EncounterNotifyMessage {
  type: NotifyType.Encounter;
  syncId: string;
  patientId: string;
  encounterId: string;
  roomId: string;
  practitionerId: string;
}

export interface UserNotifyMessage extends UserInfo {
  type: NotifyType.User;
  syncId: string;
}

export interface AnnouncementNotifyMessage {
  type: NotifyType.Announcement;
  content: any;
}

export interface DataChangeNotifyMessage {
  type: NotifyType.DataChange; 
  namespace: DataChangeNameSpace; //The namespace (collection or eventBuilder name) affected by the event.
  changes: Record<string, unknown>[]; // we will use change to monitor different collections, so we put Record here instead detailed define it
}

// Notify FE to do something, eg, show alert
export interface ActionNotifyMessage {
  type: NotifyType.Action;
  action: NotifyAction;
  data: Record<string, unknown>;
}

export enum ReportCategory {
  lab = 'laboratoryResult',
  image = 'imagingReport'
}

export interface BaseReport {
  reportId: string;
  patientId: string;
  reportStatus: string;
  requestDateTime: Date;
  category: ReportCategory;
}

export interface LabReport extends BaseReport{
  category: ReportCategory.lab
}

export interface ImageReport extends BaseReport{
  category: ReportCategory.image
  chargeCode: string; // use charge code to clarify ekg/non-ekg
}

export interface ReportNotifyMessage {
  type: NotifyType.Report;
  reports?: (LabReport | ImageReport)[];
  customDefined?: any;
}

export declare interface UserInfo {
  userId: string;
  userEnName: string;
  userChName: string;
  tenantId?: string;
  tenantName?: string;
  subjectId?: string;
}

export interface NotifySource {
  type: string,
  info: UserInfo | Record<string, unknown>;
}

export interface NotifyEvent {
  filter: NoneNotifyFilter | UserNotifyFilter | PatientNotifyFilter;
  message: UserNotifyMessage | EncounterNotifyMessage | AnnouncementNotifyMessage | ReportNotifyMessage | DataChangeNotifyMessage | ActionNotifyMessage;
}
