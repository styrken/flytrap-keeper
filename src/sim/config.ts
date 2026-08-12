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
  DIGEST_HOURS: 3.5,
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
  /** After a stalk is cut or blooms out, the plant rests this long before the next one. */
  FLOWER_REST_HOURS: 168,
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

  /** Minigames: a perfect pour when watering, golden drops while it rains.
   * Every drop pays — the repeat window only swallows tap-bursts on one
   * drop (drops are never legitimately closer than the spawn gap). */
  POUR_PERFECT_DEWDROPS: 2,
  RAINDROP_DEWDROPS: 1,
  RAINDROP_REPEAT_SECONDS: 4,

  /** Daily quests: three per day, paid on completion, bonus for the full set. */
  QUEST_DEWDROPS: 5,
  QUEST_ALL_BONUS: 10,
  /** Weekly quests: two per week (Mondays, UTC), chunkier goals and pay. */
  QUEST_WEEK_DEWDROPS: 15,
  QUEST_WEEK_ALL_BONUS: 20,

  /** Night life: wish on a shooting star (every star grants its wish; the
   * repeat window only folds a tap-burst on one star into a single wish),
   * fireflies on some summer nights. */
  STAR_WISH_DEWDROPS: 3,
  STAR_WISH_REPEAT_SECONDS: 10,
  FIREFLY_NIGHT_CHANCE: 0.45,

  /** Pets: zero needs by design — company, not chores. Every rescue pays;
   * the cooldown only paces how fast the jar-adoption count climbs. */
  TADPOLE_STAGE_DAYS: [1.5, 3.5, 5.5, 7],
  CAT_VISIT_CHANCE: 0.4,
  SNAIL_RESCUE_DEWDROPS: 2,
  SNAIL_RESCUE_COOLDOWN_HOURS: 4,
  SNAIL_KEEP_AT: 3,
  /** Spider season is autumn; a settled spider pays rent in caught bugs. */
  SPIDER_DAY_CHANCE: 0.5,
  WEB_LOOT_DEWDROPS: 2,
  WEB_LOOT_COOLDOWN_HOURS: 12,
  /** The ladybird is a guest, never a pet — every greeting brings luck. */
  LADYBIRD_DEWDROPS: 1,
  /** More garden guests: the feeder robin, the butterfly, the hedgehog —
   * every visit pays. The repeat window is shorter than any two visits, so
   * it only stops drumming on one lingering guest from paying per tap. */
  GUEST_DEWDROPS: 1,
  GUEST_REPEAT_SECONDS: 15,

  NICKNAME_MAX_LENGTH: 20,

  /** The diary keeps milestones only — and even those are capped. */
  JOURNAL_MAX_ENTRIES: 60,

  /** The SNAP! arcade: pocket money with a daily lid — play for joy, not grind. */
  ARCADE_SCORE_PER_DEWDROP: 5,
  ARCADE_DAILY_CAP: 10,
  ARCADE_HIGHSCORE_AT: 25,

  /** Insect packs: buyable boxes of bugs, released wherever you stand. */
  PACK_INSECTS: 3,

  /** Daily luck jars: each little friend pays out at most this many times a
   * day. The jar visibly counts down and refills at midnight with the
   * quests — generous enough that normal play rarely notices, small enough
   * that no critter is an infinite money tap. Trap catches are not listed:
   * digestion is their natural daily lid, as it has always been. */
  DAILY_LUCK: {
    raindrop: 8,
    star: 4,
    snail: 5,
    ladybird: 4,
    robin: 3,
    butterfly: 3,
    hedgehog: 3,
  },
} as const
