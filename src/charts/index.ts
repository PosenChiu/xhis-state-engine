import { getChart as getOpdChart } from './xhislite/opd';
import { getChart as getEncounterChart } from './xhislite/encounter';
import { getChart as getLocalEncounterChart } from './xhislite/localEncounter';

export const charts = {
  xhislite: {
    getOpdChart,
    getEncounterChart,
    getLocalEncounterChart,
  },
} as const;