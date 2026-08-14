import { type AchievementId, award } from './achievements'
import { adventDayAt, adventGift, adventOpened } from './advent'
import { SIM } from './config'
import { hasMailWaiting, isRainbowSpell, puddlesAbout, volunteerAbout } from './garden'
import { REDEEMED_GIFTS_MAX } from './gifts'
import { INSECTS, isFireflyNight } from './insects'
import { remember, remembers } from './journal'
import { progressQuest, progressWeekly } from './quests'
import { seasonAt, winterKeyAt } from './season'
import { currentWeather } from './weather'
import { catAtWindow, hasFullHouse, spiderAtCorner, webLootReady } from './pets'
import { seasonAt as seasonOf } from './season'
import { canMoveTo, canTakeCutting, isTrapReady, snowmanStage } from './selectors'
import { MAX_PLANTS, hasGreenhouse, plantCapacity, shopItem, sillPlantCount } from './shop'
import { CULTIVARS, SPECIES } from './species'
import { createPlant } from './state'
import { tick } from './tick'
import { TIME_SCALES, toGameTime, withTimeScale } from './time'
import type { Action, CultivarId, GameState, LuckSourceId, PlantState, SpeciesId } from './types'
import { clamp, dayKey, HOUR_MS } from './util'

/**
 * Apply a player action at wall-clock `realNow`. The rules run on the game
 * clock (`now`), which speed mode may run faster than real time. The world is
 * ticked first so the action validates against fresh state. Invalid actions
 * return the ticked state unchanged — the UI may be slightly stale, the sim
 * never is.
 */
export function apply(state: GameState, action: Action, realNow: number): GameState {
  const ticked = tick(state, realNow)
  const next = applyAction(ticked, action, toGameTime(ticked.time, realNow), realNow)
  // Sim timestamps live on the game clock; "last changed" is a wall-clock concern.
  return next === ticked ? ticked : { ...next, updatedAt: realNow }
}

function applyAction(s: GameState, action: Action, now: number, realNow: number): GameState {
  const plant = activeOf(s)
  if (!plant) return s

  switch (action.type) {
    case 'water': {
      if (unavailable(plant) || plant.water >= 100) return s
      if (s.weather.rainBarrel < SIM.WATER_COST) return s
      const paid: GameState = {
        ...s,
        weather: { ...s.weather, rainBarrel: s.weather.rainBarrel - SIM.WATER_COST },
        // A perfectly timed pour earns a little extra.
        inventory: action.perfect
          ? { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.POUR_PERFECT_DEWDROPS }
          : s.inventory,
      }
      let next = progressWeekly(
        progressQuest(bumpCareStreak(withPlant(paid, { ...plant, water: 100 }), now), 'water2'),
        'waterWeek',
      )
      if (action.perfect) {
        next = progressWeekly(progressQuest(next, 'pour1'), 'pourWeek')
      }
      return next
    }
    case 'catchRaindrop': {
      // Drops fall further apart than the repeat window (which only folds a
      // tap-burst on one drop into a single catch), and the day's jar caps
      // how many of them turn into dewdrops.
      if (currentWeather(s, now) !== 'rain') return s
      const last = s.minigames.lastRaindropAt
      if (last !== null && now - last < SIM.RAINDROP_REPEAT_SECONDS * 1000) return s
      const caught: GameState = {
        ...s,
        minigames: { ...s.minigames, lastRaindropAt: now },
      }
      return payLuck(caught, now, 'raindrop', SIM.RAINDROP_DEWDROPS)
    }
    case 'wishOnStar': {
      // Stars streak by minutes apart; the repeat window folds a tap-burst
      // on one star into a single wish, and the night's jar holds the rest.
      const last = s.minigames.lastWishAt
      if (last !== null && now - last < SIM.STAR_WISH_REPEAT_SECONDS * 1000) return s
      const wished: GameState = {
        ...s,
        minigames: { ...s.minigames, lastWishAt: now },
      }
      return award(payLuck(wished, now, 'star', SIM.STAR_WISH_DEWDROPS), 'first-wish')
    }
    case 'wishOnRainbow': {
      // Only while the sky is actually showing off; the repeat window folds
      // a tap-burst on one rainbow into a single wish, the jar does the rest.
      if (!isRainbowSpell(s.rngSeed, now)) return s
      const last = s.minigames.lastRainbowAt
      if (last !== null && now - last < SIM.RAINBOW_REPEAT_SECONDS * 1000) return s
      const wished: GameState = {
        ...s,
        minigames: { ...s.minigames, lastRainbowAt: now },
      }
      return award(payLuck(wished, now, 'rainbow', SIM.RAINBOW_WISH_DEWDROPS), 'rainbow-wish')
    }
    case 'pickApple': {
      // Autumn's apple tree. The visible apples ARE the day's luck jar, so an
      // empty tree simply has nothing left to tap until midnight regrows it.
      if (seasonOf(now) !== 'autumn') return s
      const last = s.minigames.lastAppleAt
      if (last !== null && now - last < SIM.APPLE_REPEAT_SECONDS * 1000) return s
      const picked: GameState = {
        ...s,
        minigames: { ...s.minigames, lastAppleAt: now },
      }
      return award(payLuck(picked, now, 'apple', SIM.APPLE_DEWDROPS), 'apple-picker')
    }
    case 'stompPuddle': {
      // Splashing takes boots (the shop sells them) and an actual puddle.
      // Pure joy, no payout — the badge is the trophy.
      if (!s.inventory.items.includes('rain-boots')) return s
      if (!puddlesAbout(s.rngSeed, now)) return s
      return award(s, 'puddle-jumper')
    }
    case 'collectMail': {
      // One envelope per delivery day; collecting pays the enclosed treat.
      if (!hasMailWaiting(s, now)) return s
      return award(
        {
          ...s,
          mail: { lastDay: dayKey(now) },
          inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.MAIL_DEWDROPS },
        },
        'pen-pal',
      )
    }
    case 'claimVolunteer': {
      // Pot up the windblown seedling and pass it on to a fellow collector —
      // one volunteer per autumn, which is all a flower box can manage.
      if (!volunteerAbout(s, now)) return s
      return award(
        {
          ...s,
          volunteerYear: new Date(now).getUTCFullYear(),
          inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.VOLUNTEER_DEWDROPS },
        },
        'volunteer',
      )
    }
    case 'greetDragonfly': {
      // Summer's fast little jewel — it only hunts over the bought pond.
      if (!s.inventory.items.includes('pond') || seasonOf(now) !== 'summer') return s
      return greetGuest(
        s,
        now,
        'lastDragonflyAt',
        'dragonfly',
        'sky-dancer',
        SIM.DRAGONFLY_DEWDROPS,
      )
    }
    case 'takeCutting': {
      // Propagation, the real keeper's trick: a thriving grown plant donates
      // a leaf pulling that roots into a free clone — cultivar included.
      if (!canTakeCutting(s, plant, now)) return s
      const rested = withPlant(s, remember({ ...plant, lastCuttingAt: now }, 'cutting', now))
      const potted = plantSeed(rested, plant.speciesId, plant.cultivar, now, 0)
      if (!potted) return s
      return bumpCareStreak(award(potted, 'propagator'), now)
    }
    case 'giftSeed': {
      // Pay for the seed that rides along in chat. The server never knows it
      // carried a present — both ends' sims keep the books.
      const item = shopItem(action.item)
      if (!item || item.kind !== 'seed' || s.inventory.dewdrops < item.cost) return s
      return award(
        { ...s, inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops - item.cost } },
        'gift-sent',
      )
    }
    case 'redeemSeedGift': {
      // Plant a gifted seed — once per message, capacity permitting.
      const item = shopItem(action.item)
      if (!item || item.kind !== 'seed' || !item.speciesId) return s
      if (!action.messageId || s.redeemedGifts.includes(action.messageId)) return s
      const potted = plantSeed(s, item.speciesId, item.cultivarId ?? null, now, 0)
      if (!potted) return s
      return {
        ...potted,
        redeemedGifts: [...potted.redeemedGifts, action.messageId].slice(-REDEEMED_GIFTS_MAX),
      }
    }
    case 'openAdventDoor': {
      // December's ritual: today's door, or a missed one — catching up is
      // half the tradition. Each opens once and pays its little something.
      const day = Math.floor(action.day)
      const latest = adventDayAt(now)
      if (latest === 0 || day < 1 || day > latest) return s
      const opened = adventOpened(s, now)
      if (opened.includes(day)) return s
      const doors = [...opened, day]
      let next: GameState = {
        ...s,
        advent: { year: new Date(now).getUTCFullYear(), opened: doors },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + adventGift(day) },
      }
      if (doors.length >= 24) next = award(next, 'advent-star')
      return next
    }
    case 'markFireflies': {
      // View says "the player is watching fireflies" — verify the calendar agrees.
      if (!isFireflyNight(s.rngSeed, now)) return s
      return award(s, 'firefly-night')
    }
    case 'letCatIn': {
      // Only works while the soaked cat actually sits at the window.
      if (!catAtWindow(s, now)) return s
      let next: GameState = { ...s, pets: { ...s.pets, cat: true } }
      next = award(next, 'pet-cat')
      if (hasFullHouse(next, now)) next = award(next, 'full-house')
      return next
    }
    case 'adoptSpider': {
      // Only while the trial web hangs in the corner.
      if (!spiderAtCorner(s, now)) return s
      let next: GameState = { ...s, pets: { ...s.pets, spider: true } }
      next = award(next, 'pet-spider')
      if (hasFullHouse(next, now)) next = award(next, 'full-house')
      return next
    }
    case 'lootWeb': {
      // The spider's rent: a wrapped bug now and then, never a chore.
      if (!webLootReady(s, now)) return s
      return {
        ...s,
        pets: { ...s.pets, lastWebLootAt: now },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + SIM.WEB_LOOT_DEWDROPS },
      }
    }
    case 'greetLadybird': {
      // Ladybirds hibernate through winter; the rest of the year every
      // greeting brings its spot of luck — the strolls' own slow rhythm
      // is all the pacing luck needs.
      if (seasonOf(now) === 'winter') return s
      const greeted: GameState = payLuck(
        { ...s, pets: { ...s.pets, lastLadybirdAt: now } },
        now,
        'ladybird',
        SIM.LADYBIRD_DEWDROPS,
      )
      return progressWeekly(award(greeted, 'ladybird-luck'), 'greetWeek')
    }
    case 'greetRobin': {
      // No feeder, no robin — it has standards.
      if (!s.inventory.items.includes('bird-feeder')) return s
      return greetGuest(s, now, 'lastRobinAt', 'robin', 'robin-song')
    }
    case 'greetButterfly': {
      const season = seasonOf(now)
      if (season !== 'spring' && season !== 'summer') return s
      return greetGuest(s, now, 'lastButterflyAt', 'butterfly', 'safe-landing')
    }
    case 'greetHedgehog': {
      // Hedgehogs sleep the winter away, curled up somewhere dry.
      if (seasonOf(now) === 'winter') return s
      return greetGuest(s, now, 'lastHedgehogAt', 'hedgehog', 'evening-snuffler')
    }
    case 'arcadeScore': {
      // The computer insists it is not for games; the sim knows better.
      if (!s.inventory.items.includes('computer')) return s
      const score = Math.floor(action.score)
      if (!Number.isFinite(score) || score <= 0) return s
      const day = dayKey(now)
      const paidBefore = s.arcade.day === day ? s.arcade.paidToday : 0
      const earned = Math.floor(score / SIM.ARCADE_SCORE_PER_DEWDROP)
      const pay = Math.max(0, Math.min(earned, SIM.ARCADE_DAILY_CAP - paidBefore))
      let next: GameState = {
        ...s,
        arcade: { best: Math.max(s.arcade.best, score), day, paidToday: paidBefore + pay },
        inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + pay },
      }
      if (score >= SIM.ARCADE_HIGHSCORE_AT) next = award(next, 'high-score')
      return next
    }
    case 'buildSnowman': {
      // Only while there is snow on the lawn — and each winter builds its own
      // snowman from scratch (last year's melted, as snowmen do). Three taps
      // of packed snow; the little payout comes when the head goes on.
      if (seasonOf(now) !== 'winter') return s
      const stage = snowmanStage(s, now)
      if (stage >= SIM.SNOWMAN_STAGES) return s
      const built = stage + 1
      let next: GameState = { ...s, snowman: { stage: built, winter: winterKeyAt(now) } }
      if (built >= SIM.SNOWMAN_STAGES) {
        next = award(
          {
            ...next,
            inventory: {
              ...next.inventory,
              dewdrops: next.inventory.dewdrops + SIM.SNOWMAN_DEWDROPS,
            },
          },
          'snowman',
        )
      }
      return next
    }
    case 'releasePack': {
      // Open a pack and set its insects free. The sim only guards the stock —
      // where they buzz off to is the view's story (whichever room you stand
      // in), and any that tempt a trap are caught through catchInsect as usual.
      const count = s.inventory.packs[action.insect]
      if (!count || count <= 0) return s
      return {
        ...s,
        inventory: {
          ...s.inventory,
          packs: { ...s.inventory.packs, [action.insect]: count - 1 },
        },
      }
    }
    case 'rescueSnail': {
      // Lifting a snail out of harm's way always pays — the garden crawls
      // with them when it rains. Only the jar-adoption count keeps its gentle
      // pace: one counted rescue per cooldown, until the snail moves in
      // (the third counted relocation earns its trust).
      const counted =
        !s.pets.snail &&
        (s.pets.lastSnailAt === null ||
          now - s.pets.lastSnailAt >= SIM.SNAIL_RESCUE_COOLDOWN_HOURS * HOUR_MS)
      const snailRescues = s.pets.snailRescues + (counted ? 1 : 0)
      const keep = s.pets.snail || (counted && snailRescues >= SIM.SNAIL_KEEP_AT)
      let next: GameState = bumpCareStreak(
        payLuck(
          {
            ...s,
            pets: {
              ...s.pets,
              snailRescues,
              lastSnailAt: counted ? now : s.pets.lastSnailAt,
              snail: keep,
            },
          },
          now,
          'snail',
          SIM.SNAIL_RESCUE_DEWDROPS,
        ),
        now,
      )
      if (keep && !s.pets.snail) {
        next = award(next, 'pet-snail')
        if (hasFullHouse(next, now)) next = award(next, 'full-house')
      }
      // A gentle rescue is a garden hello too.
      return progressWeekly(next, 'greetWeek')
    }
    case 'tapWater': {
      if (unavailable(plant) || plant.water >= 100) return s
      // Butterworts grow on limestone in the wild — tap water is fine by them.
      const penalty = SPECIES[plant.speciesId].limeTolerant ? 0 : SIM.TAP_WATER_HEALTH_PENALTY
      const health = clamp(plant.health - penalty, SIM.HEALTH_MIN, 100)
      return progressWeekly(
        progressQuest(
          bumpCareStreak(withPlant(s, { ...plant, water: 100, health }), now),
          'water2',
        ),
        'waterWeek',
      )
    }
    case 'mist': {
      if (unavailable(plant) || !SPECIES[plant.speciesId].needsMisting) return s
      if (plant.humidity >= 100) return s
      return progressQuest(bumpCareStreak(withPlant(s, { ...plant, humidity: 100 }), now), 'mist1')
    }
    case 'pet': {
      if (plant.dead || plant.dormant) return s
      if (plant.lastPetAt !== null && now - plant.lastPetAt < SIM.PET_COOLDOWN_HOURS * HOUR_MS) {
        return s
      }
      const petted = withPlant(s, { ...plant, lastPetAt: now })
      return progressWeekly(
        progressQuest(
          {
            ...petted,
            inventory: {
              ...petted.inventory,
              dewdrops: petted.inventory.dewdrops + SIM.PET_DEWDROPS,
            },
          },
          'pet2',
        ),
        'petWeek',
      )
    }
    case 'pullWeed': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || target.dead || target.dormant) return s
      if (now < target.nextWeedAt) return s
      const weeded = withPlant(s, { ...target, nextWeedAt: now + SIM.WEED_RESPAWN_HOURS * HOUR_MS })
      return progressWeekly(
        progressQuest(
          bumpCareStreak(
            {
              ...weeded,
              inventory: {
                ...weeded.inventory,
                dewdrops: weeded.inventory.dewdrops + SIM.WEED_DEWDROPS,
              },
            },
            now,
          ),
          'weed2',
        ),
        'weedWeek',
      )
    }
    case 'feedPlant': {
      if (unavailable(plant) || plant.wilted || SPECIES[plant.speciesId].isSnapper) return s
      if (
        plant.lastFedAt !== null &&
        now - plant.lastFedAt < SIM.FEED_PLANT_COOLDOWN_HOURS * HOUR_MS
      ) {
        return s
      }
      const nutrition = clamp(plant.nutrition + SIM.FEED_PLANT_NUTRITION, 0, 100)
      return bumpCareStreak(withPlant(s, { ...plant, nutrition, lastFedAt: now }), now)
    }
    case 'feedTrap': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || unavailable(target) || target.wilted) return s
      const trap = target.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const traps = spendTrapUse(target, trap.id, now, 1)
      const nutrition = clamp(target.nutrition + SIM.HAND_FEED_NUTRITION, 0, 100)
      return bumpCareStreak(withPlant(s, { ...target, traps, nutrition }), now)
    }
    case 'catchInsect': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || unavailable(target) || target.wilted) return s
      if (!SPECIES[target.speciesId].isSnapper) return s
      const trap = target.traps.find((candidate) => candidate.id === action.trapId)
      if (!trap || !isTrapReady(trap, now)) return s
      const def = INSECTS[action.insect]
      const digestFactor = action.insect === 'beetle' ? SIM.BEETLE_DIGEST_FACTOR : 1
      const traps = spendTrapUse(target, trap.id, now, digestFactor)
      const nutrition = clamp(target.nutrition + def.nutrition, 0, 100)
      let caught: PlantState = { ...target, traps, nutrition }
      if (action.insect !== 'beetle' && !remembers(caught, 'firstCatch')) {
        caught = remember(caught, 'firstCatch', now)
      }
      let next = withPlant(s, caught)
      if (def.dewdrops > 0) {
        next = {
          ...next,
          inventory: { ...next.inventory, dewdrops: next.inventory.dewdrops + def.dewdrops },
        }
      }
      if (action.insect === 'beetle') next = award(next, 'beetle-lesson')
      else {
        next = award(next, 'first-catch')
        next = progressQuest(next, 'catch2')
        next = progressWeekly(next, 'catchWeek')
      }
      if (action.insect === 'spider') next = award(next, 'spider-snack')
      if (action.insect === 'moth') next = award(next, 'night-owl')
      return bumpCareStreak(next, now)
    }
    case 'move': {
      if (unavailable(plant) || plant.placement === action.placement) return s
      if (!canMoveTo(s, plant, action.placement)) return s
      return withPlant(s, { ...plant, placement: action.placement })
    }
    case 'rename': {
      const nickname = action.nickname.trim().slice(0, SIM.NICKNAME_MAX_LENGTH)
      if (!nickname || nickname === plant.nickname) return s
      return withPlant(s, { ...plant, nickname })
    }
    case 'selectPlant': {
      if (s.activePlantId === action.plantId) return s
      if (!s.plants.some((candidate) => candidate.id === action.plantId)) return s
      return { ...s, activePlantId: action.plantId }
    }
    case 'buy': {
      const item = shopItem(action.item)
      if (!item || s.inventory.dewdrops < item.cost) return s
      if (item.kind === 'consumable') {
        // The restockables: each purchase adds one pack of its kind.
        if (!item.packInsect) return s
        return {
          ...s,
          inventory: {
            ...s.inventory,
            dewdrops: s.inventory.dewdrops - item.cost,
            packs: {
              ...s.inventory.packs,
              [item.packInsect]: s.inventory.packs[item.packInsect] + 1,
            },
          },
        }
      }
      if (item.kind === 'seed') {
        if (!item.speciesId) return s
        return plantSeed(s, item.speciesId, item.cultivarId ?? null, now, item.cost) ?? s
      }
      if (item.kind === 'unlock' || item.kind === 'deco') {
        if (s.inventory.items.includes(item.id)) return s
        // The tadpole needs somewhere to hop off to when it's done growing.
        if (item.id === 'tadpole-jar' && !hasGreenhouse(s)) return s
        const bought: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            dewdrops: s.inventory.dewdrops - item.cost,
            items: [...s.inventory.items, item.id],
          },
        }
        if (item.id === 'tadpole-jar') {
          return { ...bought, pets: { ...bought.pets, tadpoleSince: now } }
        }
        return bought
      }
      if (item.kind === 'accessory') {
        // Dressing up the active plant — repeatable per plant, swaps the old one.
        if (!item.accessoryId || plant.accessory === item.accessoryId || plant.dead) return s
        const dressed = withPlant(
          s,
          remember({ ...plant, accessory: item.accessoryId }, 'dressed', now),
        )
        return {
          ...dressed,
          inventory: { ...dressed.inventory, dewdrops: dressed.inventory.dewdrops - item.cost },
        }
      }
      // pot: a physical repot of the active plant — repeatable per plant
      if (!item.potColor || plant.potColor === item.potColor) return s
      const repotted = withPlant(s, remember({ ...plant, potColor: item.potColor }, 'repot', now))
      return {
        ...repotted,
        inventory: { ...repotted.inventory, dewdrops: repotted.inventory.dewdrops - item.cost },
      }
    }
    case 'setDormant': {
      if (plant.dead || !SPECIES[plant.speciesId].needsDormancy) return s
      if (action.on) {
        if (seasonAt(now) !== 'winter' || plant.dormant) return s
        return withPlant(
          s,
          remember(
            {
              ...plant,
              dormant: true,
              flowering: null,
              lastFloweringEndedAt: plant.flowering ? now : plant.lastFloweringEndedAt,
            },
            'sleep',
            now,
          ),
        )
      }
      if (!plant.dormant) return s
      return withPlant(s, remember({ ...plant, dormant: false }, 'wake', now))
    }
    case 'cutFlower': {
      if (unavailable(plant) || !plant.flowering || plant.flowering.blooming) return s
      const next = withPlant(
        s,
        remember({ ...plant, flowering: null, lastFloweringEndedAt: now }, 'cut', now),
      )
      return {
        ...next,
        inventory: {
          ...next.inventory,
          dewdrops: next.inventory.dewdrops + SIM.CUT_REWARD_DEWDROPS,
        },
      }
    }
    case 'letBloom': {
      if (unavailable(plant) || !plant.flowering || plant.flowering.blooming) return s
      return withPlant(s, { ...plant, flowering: { startedAt: now, blooming: true } })
    }
    case 'removePlant': {
      const target = s.plants.find((candidate) => candidate.id === action.plantId)
      if (!target || !target.dead || s.plants.length <= 1) return s
      const plants = s.plants.filter((candidate) => candidate.id !== action.plantId)
      const activePlantId = s.activePlantId === action.plantId ? plants[0].id : s.activePlantId
      return { ...s, plants, activePlantId }
    }
    case 'setTimeScale': {
      if (!TIME_SCALES.some((scale) => scale === action.scale)) return s
      if (s.time.scale === action.scale) return s
      return { ...s, time: withTimeScale(s.time, action.scale, realNow) }
    }
    case 'setSound': {
      if (s.settings.sound === action.on) return s
      return { ...s, settings: { ...s.settings, sound: action.on } }
    }
    case 'setMusic': {
      if (s.settings.music === action.on) return s
      return { ...s, settings: { ...s.settings, music: action.on } }
    }
    case 'setLocale': {
      if (s.settings.locale === action.locale) return s
      return { ...s, settings: { ...s.settings, locale: action.locale } }
    }
    case 'setHardMode': {
      if (s.settings.hardMode === action.on) return s
      return { ...s, settings: { ...s.settings, hardMode: action.on } }
    }
  }
}

const activeOf = (s: GameState): PlantState | undefined =>
  s.plants.find((plant) => plant.id === s.activePlantId) ?? s.plants[0]

const unavailable = (plant: PlantState) => plant.dead || plant.dormant

/**
 * Put a new plant in a pot — the shared end of buying a seed, planting a
 * gifted one, and potting a leaf pulling (cost 0 for the free paths). Null
 * when every pot is taken; collection achievements are checked either way
 * the newcomer arrived.
 */
function plantSeed(
  s: GameState,
  speciesId: SpeciesId,
  cultivarId: CultivarId | null,
  now: number,
  cost: number,
): GameState | null {
  if (s.plants.length >= plantCapacity(s)) return null
  const id = `p${s.plants.map((p) => p.id).reduce((max, pid) => Math.max(max, Number(pid.slice(1)) || 0), 0) + 1}`
  const sprout = createPlant(id, speciesId, now, cultivarId)
  // A full sill sends the new sprout straight to the greenhouse bench.
  if (sillPlantCount(s) >= MAX_PLANTS) sprout.placement = 'greenhouse'
  let next: GameState = {
    ...s,
    plants: [...s.plants, sprout],
    activePlantId: sprout.id,
    inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops - cost },
  }
  const grown = new Set(next.plants.map((p) => p.cultivar))
  if (CULTIVARS.every((c) => grown.has(c))) next = award(next, 'cultivar-collector')
  const speciesOwned = new Set(next.plants.map((p) => p.speciesId))
  if (speciesOwned.size >= Object.keys(SPECIES).length) {
    next = award(next, 'full-collection')
  }
  return next
}

function spendTrapUse(plant: PlantState, trapId: string, now: number, digestFactor: number) {
  return plant.traps.map((trap) =>
    trap.id === trapId
      ? {
          ...trap,
          usesLeft: trap.usesLeft - 1,
          digestingUntil: now + SIM.DIGEST_HOURS * digestFactor * HOUR_MS,
        }
      : trap,
  )
}

/**
 * Shared shape of every garden-guest hello. The repeat window folds a
 * tap-burst on one lingering guest into a single hello; the daily luck jar
 * caps how many hellos turn into dewdrops. Quests, achievements and the
 * greeting itself keep working even with an empty jar.
 */
function greetGuest(
  s: GameState,
  now: number,
  field: 'lastRobinAt' | 'lastButterflyAt' | 'lastHedgehogAt' | 'lastDragonflyAt',
  source: LuckSourceId,
  achievement: AchievementId,
  amount: number = SIM.GUEST_DEWDROPS,
): GameState {
  const last = s.pets[field]
  if (last !== null && now - last < SIM.GUEST_REPEAT_SECONDS * 1000) return s
  const greeted: GameState = payLuck(
    { ...s, pets: { ...s.pets, [field]: now } },
    now,
    source,
    amount,
  )
  return progressWeekly(award(greeted, achievement), 'greetWeek')
}

function withPlant(state: GameState, plant: PlantState): GameState {
  return {
    ...state,
    plants: state.plants.map((candidate) => (candidate.id === plant.id ? plant : candidate)),
  }
}

/** Zeroed jars for a fresh (UTC) day. */
const EMPTY_LUCK: Record<LuckSourceId, number> = {
  raindrop: 0,
  star: 0,
  snail: 0,
  ladybird: 0,
  robin: 0,
  butterfly: 0,
  hedgehog: 0,
  apple: 0,
  rainbow: 0,
  dragonfly: 0,
}

/**
 * Pay `amount` dewdrops from a source's daily luck jar. While the jar has
 * charges the pay is full; once today's max is spent it pays nothing until
 * midnight refills it. Only the dewdrops are gated — greetings still count
 * for quests, achievements and adoptions, so nothing FEELS broken, the tap
 * just stops printing money.
 */
function payLuck(s: GameState, now: number, source: LuckSourceId, amount: number): GameState {
  const day = dayKey(now)
  const paid = s.luck.day === day ? s.luck.paid : EMPTY_LUCK
  if (paid[source] >= SIM.DAILY_LUCK[source]) {
    // Jar empty — still roll the day forward so the state stays tidy.
    return s.luck.day === day ? s : { ...s, luck: { day, paid: EMPTY_LUCK } }
  }
  return {
    ...s,
    luck: { day, paid: { ...paid, [source]: paid[source] + 1 } },
    inventory: { ...s.inventory, dewdrops: s.inventory.dewdrops + amount },
  }
}

function bumpCareStreak(state: GameState, now: number): GameState {
  const day = dayKey(now)
  if (state.careStreak.lastDay === day) return state
  const days = state.careStreak.days + 1
  const next: GameState = {
    ...state,
    careStreak: { days, lastDay: day },
    // The day's first act of care pays a little check-in bonus.
    inventory: {
      ...state.inventory,
      dewdrops: state.inventory.dewdrops + SIM.DAILY_CARE_DEWDROPS,
    },
  }
  return days >= SIM.GREEN_THUMB_DAYS ? award(next, 'green-thumb') : next
}
