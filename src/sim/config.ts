/** Every balance number lives here — tuning is one file. Rates are per real-world hour. */
export const SIM = {
  TICK_STEP_MINUTES: 5,
  /** Away longer than this simulates as exactly this long — vacations never kill plants. */
  OFFLINE_CAP_HOURS: 36,

  WATER_DECAY_PER_HOUR: 2.0,
  NUTRITION_DECAY_PER_HOUR: 1.0,

  HEALTH_DECAY_DRY_PER_HOUR: 3.0,
  HEALTH_DECAY_THIRSTY_PER_HOUR: 1.0,
  HEALTH_REGEN_PER_HOUR: 2.5,
  /** Health never reaches 0 — a plant can always be nursed back. */
  HEALTH_MIN: 5,

  WATER_LOW: 20,
  WATER_REGEN_THRESHOLD: 40,
  WATER_OK_THRESHOLD: 30,

  WILT_BELOW: 15,
  RECOVER_AT: 40,

  BASE_XP_PER_HOUR: 10,
  /** Feeding is a growth bonus, never a survival requirement (photosynthesis!). */
  NUTRITION_XP_BONUS_MAX: 0.5,

  FEED_NUTRITION: 30,
  DIGEST_HOURS: 4,
  TRAP_USES: 3,
  TRAP_REGROW_HOURS: 24,

  NICKNAME_MAX_LENGTH: 20,
} as const
