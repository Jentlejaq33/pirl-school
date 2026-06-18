// =====================================================================
// CONFIG.js — the single place to rebrand and to define what each tier unlocks.
// Per-school branding (logo/colours/name) is loaded from the `schools` row at
// runtime; this file defines defaults + the module map per subscription tier.
// =====================================================================

export const CONFIG = {
  product: {
    name: 'PIRL School System',
    company: 'PureTech Innovations & Research Ltd',
    supportEmail: 'support@pirl.uk',
  },
  // Fallback brand — overridden by the school's own colours/logo once loaded.
  brand: {
    primary: '#07111f',   // navy
    secondary: '#c9a227', // gold
    logoUrl: '',
  },
}

// Every module in the system, with the route used by the sidebar.
export const MODULES = {
  dashboard: { label: 'Dashboard',           path: '/' },
  students:  { label: 'Students',            path: '/students' },
  attendance:{ label: 'Attendance',          path: '/attendance' },
  results:   { label: 'Test & Exam Results', path: '/results' },
  reports:   { label: 'Terminal Reports',    path: '/reports' },
  fees:      { label: 'Fees & Payments',     path: '/fees' },
  sports:    { label: 'Sports',              path: '/sports' },
  comms:     { label: 'Messages',            path: '/comms' },
  settings:  { label: 'Settings',            path: '/settings' },
}

// What each subscription tier unlocks (mirrors the sales offer sheet).
export const FEATURES_BY_TIER = {
  starter:  ['dashboard','students','results','reports','fees','comms','settings'],
  standard: ['dashboard','students','attendance','results','reports','fees','comms','settings'],
  premium:  ['dashboard','students','attendance','results','reports','fees','sports','comms','settings'],
}

// Which roles may open which module.
export const MODULE_ROLES = {
  dashboard: ['school_admin','bursar','teacher','student','parent'],
  students:  ['school_admin','teacher','bursar'],
  attendance:['school_admin','teacher'],
  results:   ['school_admin','teacher','student','parent'],
  reports:   ['school_admin','teacher','student','parent'],
  fees:      ['school_admin','bursar','parent'],
  sports:    ['school_admin','teacher','student','parent'],
  comms:     ['school_admin','bursar','teacher'],
  settings:  ['school_admin'],
}

// Returns the modules a given school tier + user role should see.
export function visibleModules(tier, role) {
  const unlocked = FEATURES_BY_TIER[tier] || FEATURES_BY_TIER.starter
  return unlocked.filter((m) => (MODULE_ROLES[m] || []).includes(role))
}
