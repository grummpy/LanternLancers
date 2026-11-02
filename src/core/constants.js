/** Tunables shared by simulation, bots, and the renderer. */

export const DT = 1 / 60;

export const ARENA_W = 960;
export const ARENA_H = 540;
export const FOG_H = 52;

export const RIDER_W = 42;
export const RIDER_H = 32;

export const GRAVITY = 780;
export const FLAP_VY = -292;
export const FLAP_COOLDOWN = 0.15;
export const MAX_FALL = 360;
export const MAX_RISE = -340;
export const MOVE_ACCEL = 1600;
export const MAX_SPEED = 230;
export const GROUND_DRAG = 0.86;
export const AIR_DRAG = 0.94;
export const DASH_SPEED = 520;
export const DASH_TIME = 0.16;
export const DASH_COOLDOWN = 1.5;
export const DASH_GRAVITY_SCALE = 0.4;

export const LANCE_TIE = 4;
export const HIT_COOLDOWN = 0.4;
export const FOG_COOLDOWN = 0.9;
export const FOG_BOUNCE = -310;

export const MAX_LANTERNS = 3;
export const ROUND_TIME = 120;
export const WINS_NEEDED = 3;
export const COUNTDOWN_TIME = 3;
export const BANNER_TIME = 2.5;

export const EMBER_R = 11;
export const EMBER_MAX = 2;
export const EMBER_EVERY = 4;

export const PAD_DEADZONE = 0.45;

export const PLAYER_NAMES = ["Amber", "Crimson", "Tide", "Violet"];

/** Which platform each rider perches on at the start of a round. */
export const SPAWN_PLATFORM = [0, 1, 3, 4];

export const BIND_FIELDS = ["left", "right", "up", "down", "action", "secondary"];
