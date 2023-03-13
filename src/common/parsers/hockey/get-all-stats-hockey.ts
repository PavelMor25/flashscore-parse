import {Page} from "puppeteer";
import {matches} from "../../../types/leagues/matches.type.js";
import {jsonHockey} from "../../../types/hockey/jsonHockey.type.js";
import {getAllStats} from "../matches/get-all-stats.js";
import {getJsonHockey, getParseHockeyMatch} from "./utils.js";


export const getAllStatsHockey = async (page: Page, matches: string[]): Promise<matches<jsonHockey[]>> => {
    return await getAllStats<
        typeof getParseHockeyMatch,
        typeof getJsonHockey,
        jsonHockey[]>(page, matches, getParseHockeyMatch, getJsonHockey)
}
