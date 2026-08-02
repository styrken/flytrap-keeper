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

  HAND_FEED_NUTRITION: 20,
  DIGEST_HOURS: 4,
  TRAP_USES: 3,
  TRAP_REGROW_HOURS: 24,
  /** Snapping at a beetle: no food, and the trap digests twice as long. */
  BEETLE_DIGEST_FACTOR: 2,

  WEATHER_PERIOD_HOURS: 3,
  RAIN_FILL_PER_HOUR: 12,
  BARREL_CAP: 100,
  BARREL_INITIAL: 60,
  WATER_COST: 25,
  /** The limescale lesson: tap water always works but chips a little health. */
  TAP_WATER_HEALTH_PENALTY: 8,

  ACHIEVEMENT_DEWDROPS: 10,
  GREEN_THUMB_DAYS: 7,

  NICKNAME_MAX_LENGTH: 20,
} as const
