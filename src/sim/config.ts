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

  /** The radio forecast: how many periods it reads out, and how far ahead it
   * scans for the next rain before giving up (weather is deterministic, so
   * this is knowledge the world already had — the radio just says it aloud). */
  FORECAST_PERIODS: 3,
  FORECAST_RAIN_SCAN_HOURS: 48,

  /** The garden snowman: three taps of packed snow, one little payout when the
   * head goes on — and each winter's snowman is its own (they melt in spring). */
  SNOWMAN_STAGES: 3,
  SNOWMAN_DEWDROPS: 5,

  /** Plant birthdays: every anniversary of the planting writes a diary page
   * and pays a small present. Missed ones are caught up by the next tick. */
  BIRTHDAY_DEWDROPS: 5,

  /** Wind is an overlay on the weather (any kind can blow), rolled per
   * period like everything else — clotheslines flap, leaves tumble. */
  WIND_PERIOD_CHANCE: 0.22,

  /** A rainbow sometimes follows a rain period into a sunny one. Wishing on
   * it pays like a shooting star; the repeat window folds tap-bursts. */
  RAINBOW_AFTER_RAIN_CHANCE: 0.6,
  RAINBOW_WISH_DEWDROPS: 3,
  RAINBOW_REPEAT_SECONDS: 10,

  /** The apple tree: three red apples every autumn day (they are the luck
   * jar, visibly — picked apples are gone until midnight regrows them). */
  APPLE_DEWDROPS: 2,
  APPLE_REPEAT_SECONDS: 6,

  /** Post in the letterbox on some days — flag up, one letter, small treat. */
  MAIL_CHANCE: 0.4,
  MAIL_DEWDROPS: 2,
  MAIL_LETTERS: 8,

  /** A windy autumn day can blow a volunteer seedling into the flower box —
   * potting it up for a fellow collector pays like a small seed harvest. */
  VOLUNTEER_DEWDROPS: 8,

  /** Propagation: a healthy grown plant can donate a leaf pulling that roots
   * into a free clone (cultivar included) — real keepers' favourite trick. */
  CUTTING_MIN_STAGE: 2,
  CUTTING_MIN_HEALTH: 70,
  CUTTING_COOLDOWN_DAYS: 14,

  /** The pond dragonfly: summer's fast little jewel, greeted like a guest. */
  DRAGONFLY_DEWDROPS: 2,

  /** December's advent calendar: one door per day (catching up is allowed —
   * it's tradition), each holding a little something. Index = day - 1. */
  ADVENT_GIFTS: [
    2, 2, 3, 2, 2, 5, 2, 2, 3, 2, 2, 5, 2, 3, 2, 2, 2, 5, 2, 3, 2, 2, 3, 12,
  ] as readonly number[],

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
    apple: 3,
    rainbow: 2,
    dragonfly: 3,
  },
} as const
