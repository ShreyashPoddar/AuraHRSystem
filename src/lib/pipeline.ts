/**
 * AuraHR Enterprise Pipeline — Stage Definitions & State Machine
 *
 * This module owns the canonical 12-stage internal stage enum plus all
 * helper utilities (validation, colour tokens, macro groupings) so that
 * both the frontend and backend API routes share a single source of truth.
 *
 * Keka HR integration injection points are declared in @/lib/keka.ts.
 */

// ── 1. Canonical Stage Enum ───────────────────────────────────────

export const PIPELINE_STAGES = [
  'Imported',
  'Under AI Screening',
  'Shortlisted',
  'Screening Scheduled',
  'Screening Cleared',
  'Assessment Invited',
  'Assessment In Progress',
  'Assessment Completed',
  'Assessment Cleared',
  'Rejected',
  'On Hold',
  'Hired / Offer stage',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

// ── 2. Stage Metadata ─────────────────────────────────────────────

export interface StageMetadata {
  /** Human-readable short label used in dropdowns / tooltips. */
  label: string;
  /** Which macro board column this stage belongs to. */
  macroGroup: MacroGroup;
  /**
   * Tailwind class string for badge colour.
   * Format: "bg-X/15 text-X border-X/30"
   */
  badgeClass: string;
  /** Dot colour for live indicator. */
  dotClass: string;
  /**
   * Keka sync expectation as described in the product spec.
   * Used for admin tooltips.
   */
  kekaNote: string;
  /** Whether this is a terminal stage (no further automated transition). */
  terminal: boolean;
}

export type MacroGroup =
  | 'Applied'
  | 'Screening'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'On Hold';

export const STAGE_META: Record<PipelineStage, StageMetadata> = {
  'Imported': {
    label: 'Imported',
    macroGroup: 'Applied',
    badgeClass: 'bg-slate-500/15 text-slate-600 border-slate-300/50',
    dotClass: 'bg-slate-400',
    kekaNote: 'Internal-only or mapped note',
    terminal: false,
  },
  'Under AI Screening': {
    label: 'AI Screening',
    macroGroup: 'Applied',
    badgeClass: 'bg-violet-500/15 text-violet-700 border-violet-300/50',
    dotClass: 'bg-violet-400 animate-pulse',
    kekaNote: 'Optional custom stage/comment',
    terminal: false,
  },
  'Shortlisted': {
    label: 'Shortlisted',
    macroGroup: 'Screening',
    badgeClass: 'bg-blue-500/15 text-blue-700 border-blue-300/50',
    dotClass: 'bg-blue-500',
    kekaNote: 'Update stage in Keka',
    terminal: false,
  },
  'Screening Scheduled': {
    label: 'Screening Scheduled',
    macroGroup: 'Screening',
    badgeClass: 'bg-sky-500/15 text-sky-700 border-sky-300/50',
    dotClass: 'bg-sky-400',
    kekaNote: 'Update stage/activity in Keka',
    terminal: false,
  },
  'Screening Cleared': {
    label: 'Screening Cleared',
    macroGroup: 'Screening',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 border-cyan-300/50',
    dotClass: 'bg-cyan-500',
    kekaNote: 'Update stage in Keka',
    terminal: false,
  },
  'Assessment Invited': {
    label: 'Assessment Invited',
    macroGroup: 'Assessment',
    badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-300/50',
    dotClass: 'bg-amber-400',
    kekaNote: 'Update stage/activity in Keka',
    terminal: false,
  },
  'Assessment In Progress': {
    label: 'In Progress',
    macroGroup: 'Assessment',
    badgeClass: 'bg-orange-500/15 text-orange-700 border-orange-300/50',
    dotClass: 'bg-orange-400 animate-pulse',
    kekaNote: 'Optional update',
    terminal: false,
  },
  'Assessment Completed': {
    label: 'Test Submitted',
    macroGroup: 'Assessment',
    badgeClass: 'bg-teal-500/15 text-teal-700 border-teal-300/50',
    dotClass: 'bg-teal-500',
    kekaNote: 'Update stage/activity in Keka',
    terminal: false,
  },
  'Assessment Cleared': {
    label: 'Assessment Cleared',
    macroGroup: 'Assessment',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-300/50',
    dotClass: 'bg-emerald-500',
    kekaNote: 'Update stage in Keka',
    terminal: false,
  },
  'Rejected': {
    label: 'Rejected',
    macroGroup: 'Rejected',
    badgeClass: 'bg-red-500/15 text-red-700 border-red-300/50',
    dotClass: 'bg-red-500',
    kekaNote: 'Update stage and reason',
    terminal: true,
  },
  'On Hold': {
    label: 'On Hold',
    macroGroup: 'On Hold',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 border-zinc-300/50',
    dotClass: 'bg-zinc-400',
    kekaNote: 'Update stage/note',
    terminal: false,
  },
  'Hired / Offer stage': {
    label: 'Hired / Offer',
    macroGroup: 'Offer',
    badgeClass: 'bg-gold/15 text-gold border-gold/30',
    dotClass: 'bg-gold',
    kekaNote: 'Update final stage',
    terminal: true,
  },
};

// ── 3. Macro Groups (board columns) ──────────────────────────────

/** Ordered macro pipeline columns shown on the board. */
export const MACRO_PIPELINE: MacroGroup[] = [
  'Applied',
  'Screening',
  'Assessment',
  'Interview',
  'Offer',
];

/** Stages that map into each macro column (used for board filtering). */
export const MACRO_TO_STAGES: Record<MacroGroup, PipelineStage[]> = {
  Applied:    ['Imported', 'Under AI Screening'],
  Screening:  ['Shortlisted', 'Screening Scheduled', 'Screening Cleared'],
  Assessment: ['Assessment Invited', 'Assessment In Progress', 'Assessment Completed', 'Assessment Cleared'],
  Interview:  [],   // Populated from Moodle Interview stage externally
  Offer:      ['Hired / Offer stage'],
  Rejected:   ['Rejected'],
  'On Hold':  ['On Hold'],
};

/** Returns the macro group label for a given micro stage. */
export function getMacroGroup(stage: string): MacroGroup {
  const meta = STAGE_META[stage as PipelineStage];
  return meta?.macroGroup ?? 'Applied';
}

// ── 4. Manual "Move Stage" Dropdown Options ───────────────────────
/**
 * Returns the list of stages that should appear in the admin
 * "Move Stage" dropdown for a given current stage.
 *
 * Rules:
 *  - `Rejected` and `On Hold` are ALWAYS available (lateral exits).
 *  - During early automated stages (Imported / Under AI Screening) the
 *    admin cannot manually advance the candidate — the AI gate owns those.
 *  - After AI gate stages, admin can manually move to Screening/Assessment/Interview/Offer.
 *  - Assessment micro-stages (In Progress / Completed) are owned by Moodle events;
 *    admin can still override via On Hold or Rejected.
 */
export const OVERRIDE_STAGES: PipelineStage[] = ['Rejected', 'On Hold'];

export function getManualMoveOptions(currentStage: string): PipelineStage[] {
  const overrides = OVERRIDE_STAGES;

  const automatedStages: PipelineStage[] = ['Imported', 'Under AI Screening'];
  if (automatedStages.includes(currentStage as PipelineStage)) {
    // AI is in control — only allow override exits
    return overrides;
  }

  const moodleOwnedStages: PipelineStage[] = [
    'Assessment In Progress',
    'Assessment Completed',
  ];
  if (moodleOwnedStages.includes(currentStage as PipelineStage)) {
    // Moodle owns transitions; admin can only force-exit
    return overrides;
  }

  // All other stages — expose a curated set of forward options
  const forwardOptions: PipelineStage[] = [
    'Shortlisted',
    'Screening Scheduled',
    'Screening Cleared',
    'Assessment Invited',
    'Assessment Cleared',
    'Hired / Offer stage',
  ];

  // Remove current stage from the list
  const candidates = forwardOptions.filter(s => s !== currentStage);
  // Merge with overrides (deduplicated)
  return [...candidates, ...overrides.filter(o => o !== currentStage)];
}

export function isOverrideOption(stage: string): boolean {
  return OVERRIDE_STAGES.includes(stage as PipelineStage);
}

// ── 5. Validation ─────────────────────────────────────────────────

export function isValidStage(stage: string): stage is PipelineStage {
  return PIPELINE_STAGES.includes(stage as PipelineStage);
}

// ── 6. AI Evaluation Gate Logic ───────────────────────────────────

/**
 * Given a JD match score, a threshold, and margin percentage,
 * returns the next pipeline stage the candidate should transition to.
 *
 * @param score       - The AI-computed JD match score (0–100)
 * @param threshold   - The passing threshold (e.g. 70)
 * @param marginPct   - The margin below threshold for "On Hold" (default 10)
 */
export function evaluateAIScreeningResult(
  score: number,
  threshold: number,
  marginPct = 10,
): PipelineStage {
  if (score >= threshold) return 'Shortlisted';
  if (score >= threshold - marginPct) return 'On Hold';
  return 'Rejected';
}

// ── 7. Moodle Assessment Event Map ────────────────────────────────

/**
 * Moodle-event → next stage mapping.
 * Used by the Moodle webhook route to resolve the appropriate stage transition.
 */
export const MOODLE_EVENT_TO_STAGE: Record<string, PipelineStage> = {
  quiz_started:   'Assessment In Progress',
  quiz_submitted: 'Assessment Completed',
  quiz_passed:    'Assessment Cleared',
  quiz_failed:    'Rejected',
};

// ── 8. Legacy Stage Compat (Moodle side uses lowercase) ───────────

/**
 * Maps Moodle's lowercase stage strings to the new 12-stage enum.
 * Used during API reads to normalise legacy data.
 */
export const MOODLE_STAGE_MAP: Record<string, PipelineStage> = {
  applied:   'Imported',
  screened:  'Shortlisted',
  academia:  'Assessment Invited',
  interview: 'Screening Cleared',   // closest match
  offer:     'Hired / Offer stage',
  selected:  'Hired / Offer stage',
  rejected:  'Rejected',
};

/**
 * Normalise any legacy stage string to the canonical PipelineStage.
 * Falls back to 'Imported' for unknown values.
 */
export function normaliseLegacyStage(stage: string): PipelineStage {
  // Already a valid new-style stage
  if (isValidStage(stage)) return stage;
  // Legacy lowercase mapping
  return MOODLE_STAGE_MAP[stage.toLowerCase()] ?? 'Imported';
}

export function getStageLabel(stage: string): string {
  const normalised = normaliseLegacyStage(stage);
  return STAGE_META[normalised]?.label ?? stage;
}

export function getStageBadgeClass(stage: string): string {
  const normalised = normaliseLegacyStage(stage);
  return STAGE_META[normalised]?.badgeClass ?? 'bg-slate-500/15 text-slate-600 border-slate-300/50';
}
