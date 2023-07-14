import {teams} from "../matches/teams.type";
import {periods} from "./periods.type.js";
import {incidents} from "./incidents.type.js";
import {score} from "../matches/score.type";
import {countryCupRound} from "../matches/country-cup-round.type";
import {stats} from "./stats.type.js";
import {odds} from "../matches/odds.type";
import {exDataType} from "../matches/exData.type";
import {pitchers} from "./pitchers.type";

interface StrinKey {
    [key: string]: number,
}

export type baseballMatchStat = {
    id: string,
    countryCupRound: countryCupRound,
    teams: teams,
    score: score,
    dateTime: Date,
    periods: periods & StrinKey,
    pitchers: pitchers,
    incidents: incidents,
    odds: odds,
    stats?: stats
    exData?: exDataType,
}
