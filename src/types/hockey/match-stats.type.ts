import {teams} from "../matches/teams.type.js";
import {periods} from "./periods.type.js";
import {score} from "../matches/score.type.js";
import {countryCupRound} from "../matches/country-cup-round.type";
import {stats} from "./stats.type.js";
import {odds} from "../matches/odds.type.js";
import {goals} from "./goals.js";
import {exDataType} from "../matches/exData.type.js";

export type matchStat = {
    id: string,
    countryCupRound: countryCupRound,
    teams: teams,
    score: score,
    dateTime: Date,
    periods: periods,
    incidents: goals,
    odds: odds,
    stats?: stats,
    exData?: exDataType
}
