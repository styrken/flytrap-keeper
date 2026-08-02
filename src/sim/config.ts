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

  /** Tropical species (misting). */
  HUMIDITY_DECAY_PER_HOUR: 3,
  /** Glass holds the moisture: humidity drains at half pace in the greenhouse. */
  GREENHOUSE_HUMIDITY_FACTOR: 0.5,
  HUMIDITY_LOW: 25,
  HUMIDITY_OK: 40,
  HUMIDITY_HEALTH_DECAY_PER_HOUR: 0.6,

  /** Sticky species quietly feed themselves a little. */
  PASSIVE_CATCH_PER_HOUR: 0.8,
  PASSIVE_CATCH_CAP: 40,

  /** Hand-feeding non-snapper species (tweezers and dried flies). */
  FEED_PLANT_NUTRITION: 15,
  FEED_PLANT_COOLDOWN_HOURS: 6,

  /** Phase 5: seasons, dormancy, flowering, hard mode. */
  WINTER_SKIP_HEALTH_DECAY_PER_HOUR: 0.4,
  FLOWER_XP: 2600,
  BLOOM_HOURS: 120,
  BLOOM_HEALTH_COST_TOTAL: 15,
  BLOOM_REWARD_DEWDROPS: 60,
  CUT_REWARD_DEWDROPS: 8,
  HARD_MODE_DEATH_HOURS: 72,

  /** Petting: always a wiggle, a dewdrop at most once per cooldown. */
  PET_COOLDOWN_HOURS: 1,
  PET_DEWDROPS: 1,

  /** Weeds sprout in pots on a lazy cycle — pulling them pays. */
  WEED_FIRST_HOURS: 2,
  WEED_RESPAWN_HOURS: 6,
  WEED_DEWDROPS: 2,

  /** The first care action of each (UTC) day pays a check-in bonus. */
  DAILY_CARE_DEWDROPS: 5,

  /** Minigames: a perfect pour when watering, golden drops while it rains. */
  POUR_PERFECT_DEWDROPS: 2,
  RAINDROP_DEWDROPS: 1,
  RAINDROP_COOLDOWN_SECONDS: 8,

  /** Daily quests: three per day, paid on completion, bonus for the full set. */
  QUEST_DEWDROPS: 5,
  QUEST_ALL_BONUS: 10,

  NICKNAME_MAX_LENGTH: 20,
} as const
