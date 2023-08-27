import {teams} from "../matches/teams.type.js";
import {periods} from "./periods.type.js";
import {incidents} from "./incidents.type.js";
import {score} from "../matches/score.type.js";
import {countryCupRound} from "../matches/country-cup-round.type.js";
import {stats} from "./stats.type.js";
import {odds} from "../matches/odds.type.js";
import {exDataType} from "../matches/exData.type";

export type basketballMatchStat = {
    id: string,
    countryCupRound: countryCupRound,
    teams: teams,
    score: score,
    dateTime: Date,
    periods: periods,
    incidents: incidents,
    odds: odds,
    stats?: stats
    exData?: exDataType,
}
