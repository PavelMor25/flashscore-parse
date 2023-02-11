import {matches} from "../../../types/leagues/matches.type.js";
import {jsonFootball} from "../../../types/football/json-football.type.js";
import {getAllStats} from "../matches/get-all-stats.js";
import {getParseFootballMatch, getJsonFootball} from "./utils.js";
import {Page} from "puppeteer";


export const getAllStatsFootball = async (page: Page, matches: string[]): Promise<matches<jsonFootball[]>> => {
    return await getAllStats<
        typeof getParseFootballMatch,
        typeof getJsonFootball,
        jsonFootball[]>(page, matches, getParseFootballMatch, getJsonFootball)
}
