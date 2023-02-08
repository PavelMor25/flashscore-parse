import {teams} from "./teams.type.js";
import {dateTime} from "./date-time.type.js";
import {periods} from "./periods.type.js";
import {incidents} from "./incidents.type.js";
import {score} from "./score.type.js";
import {countryCupRound} from "./country-cup-round.type.js";
import {stats} from "./stats.type.js";
import {odds} from "./odds.type.js";

export type matchStat = {
    id: string,
    countryCupRound: countryCupRound,
    teams: teams,
    score: score,
    dateTime: dateTime,
    periods: periods,
    incidents: incidents,
    odds: odds,
    stats?: stats
}
