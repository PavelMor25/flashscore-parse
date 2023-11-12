import {ParserMatchInterface} from "../parser-match.interface.js";
import {baseballMatchStat} from "../../../../types/baseball/match-stats.type.js";
import {jsonBaseball} from "../../../../types/baseball/json-baseball.type.js";
import {Page} from "puppeteer";
import {matches} from "../../../../types/leagues/matches.type.js";
import {MATCHES_SELECTORS} from "../../../../constants/selectors.js";
import {getCommonInfoMatch, getContent, getExData} from "../../utils/utils.js";
import chalk from "chalk";
import {incidents} from "../../../../types/baseball/incidents.type.js";
import {periods} from "../../../../types/baseball/periods.type.js";
import Spinner from "../../../../common/spinner/spinner.js";

const error = chalk.red.bold;
const other = chalk.magenta.bold;

interface StrinKey {
    [key: string]: number,
}

export default class ParserBaseball implements ParserMatchInterface<jsonBaseball> {
    private matchesParsed: jsonBaseball[] = [];

    constructor(
        public page: Page,
        public matches: string[]
    ) {}

    private _getRuns = (periods: periods & StrinKey): incidents => {
        let ingOrder = [
            '1I2','1I1','2I2','2I1','3I2','3I1','4I2','4I1','5I2','5I1',
            '6I2','6I1','7I2','7I1','8I2','8I1','9I2','9I1','EI2','EI1'
        ];
        let firstRunTeam = null
        let firstRunIng = '';
        let firstRunPoints = null
        let runSq = []
        for (let ing of ingOrder) {
            if (periods[ing]) {
                let isHome = ing.includes('I1')
                if (!firstRunTeam) {
                    firstRunTeam = isHome ? 1 : 2;
                    firstRunIng = ing[0];
                    firstRunPoints = periods[ing];
                }
                isHome ? runSq.push(1) : runSq.push(2);
            }
        }

        return {
            "1stR": firstRunTeam as number,
            "1RI": firstRunIng,
            "1RP": firstRunPoints as number,
            "RS": runSq.join('')
        }
    }

    private _toJson = (el: baseballMatchStat) => {
        let {
            id = '',
            countryCupRound: {country, league, round, roundTwo, leg},
            score: {home, away},
            dateTime,
            teams: {home: homeTeam, away: awayTeam},
            periods,
            pitchers: {pitHome, pitAway},
            incidents,
            exData: {
                Venue = '',
                Attendance = ''
            } = {},
            odds: {name: nameOdds = '-', home: homeOdds = 0, away: awayOdds = 0},
            stats: {
                Hits: {home: homeH = 0, away: awayH = 0} = {},
                Errors: {home: homeE = 0, away: awayE = 0} = {},
                Bdouble: {home: homeD = 0, away: awayD = 0} = {},
                Btriple: {home: homeT = 0, away: awayT = 0} = {},
                HomeRuns: {home: homeHR = 0, away: awayHR = 0} = {},
                Runsbattedin: {home: homeR = 0, away: awayR = 0} = {},
                Leftonbase: {home: homeL = 0, away: awayL = 0} = {},
                BaseonBalls: {home: homeB = 0, away: awayB = 0} = {},
                Strikeouts: {home: homeStr = 0, away: awayStr = 0} = {},
                Stolenbases: {home: homeS = 0, away: awayS = 0} = {},
                Atbat: {home: homeA = 0, away: awayA = 0} = {},
                BattingAverage: {home: homeBA = 0, away: awayBA = 0} = {},
            } = {}
        } = el

        this.matchesParsed.push({
            "id": id,
            "country": country,
            "league": league,
            "r1": round,
            "r2": roundTwo ?? '',
            "leg": leg ?? '',
            "S1": Number(home),
            "S2": Number(away),
            "SD":away - home,
            "ET": (periods['EI1'] || periods['EI2']) ? 'ET' : '',
            "date": dateTime,
            "time": dateTime,
            "home": homeTeam,
            "pitcherH": pitHome,
            "away": awayTeam,
            "pitcherA": pitAway,
            "Bet": nameOdds,
            "K1": Number(homeOdds),
            "K2": Number(awayOdds),
            "1I1": periods["1I1"],
            "1I2": periods['1I2'],
            "2I1": periods['2I1'],
            "2I2": periods['2I2'],
            "3I1": periods['3I1'],
            "3I2": periods['3I2'],
            "4I1": periods['4I1'],
            "4I2": periods['4I2'],
            "5I1": periods['5I1'],
            "5I2": periods['5I2'],
            "6I1": periods['6I1'],
            "6I2": periods['6I2'],
            "7I1": periods['7I1'],
            "7I2": periods['7I2'],
            "8I1": periods['8I1'],
            "8I2": periods['8I2'],
            "9I1": periods['9I1'],
            "9I2": periods['9I2'],
            "EI1": periods['EI1'],
            "EI2": periods['EI2'],
            "1stR": Number(incidents['1stR']),
            "1RI": incidents['1RI'],
            "1RP": incidents['1RP'],
            "RS": incidents.RS,
            "H1": Number(homeH),
            "H2": Number(awayH),
            "E1": Number(homeE),
            "E2": Number(awayE),
            "2B1": Number(homeD),
            "2B2": Number(awayD),
            "3B1": Number(homeT),
            "3B2": Number(awayT),
            "HR1": Number(homeHR),
            "HR2": Number(awayHR),
            "RBI1": Number(homeR),
            "RBI2": Number(awayR),
            "LOB1": Number(homeL),
            "LOB2": Number(awayL),
            "BB1": Number(homeB),
            "BB2": Number(awayB),
            "SO1": Number(homeStr),
            "SO2": Number(awayStr),
            "SB1": Number(homeS),
            "SB2": Number(awayS),
            "AB1": Number(homeA),
            "AB2": Number(awayA),
            "BA1": Number(homeBA),
            "BA2": Number(awayBA),
            "Venue": Venue,
            "Attendance": Attendance
        })
    }

    private _parseMatch = async (id: string): Promise<baseballMatchStat> => {
        const page = this.page;
        const {
            NAME_TEAMS,
            TABS_WITH_FULL_STAT,
            LINK_FULL_STATS,
            TABLE_FULL_STATS,
            FULL_STATS
        } = MATCHES_SELECTORS;

        let matchStat: baseballMatchStat;

        // Create link and wait loading
        const link = `https://www.flashscore.com/match/${id}/#/match-summary/match-summary/`;
        await page.goto(link);
        await page.waitForSelector(NAME_TEAMS);

        const common = await getCommonInfoMatch(page);

        // Get stats periods
        let periods: StrinKey & periods = {}
        const innings = ['1','2','3','4','5','6','7','8','9','x'];

        for (let ing of innings) {
            let propHome = ing === 'x' ? 'EI1' : `${ing}I1`
            let propAway = ing === 'x' ? 'EI2' : `${ing}I2`
            let homeRes =  await page.$eval(`.smh__away.smh__part--${ing}`, el => {
                return /x/gi.test(el.textContent ?? '') ? 0 : Number(el.textContent)
            });
            let awayRes =  await page.$eval(`.smh__home.smh__part--${ing}`, el => {
                return /x/gi.test(el.textContent ?? '') ? 0 : Number(el.textContent)
            });
            periods[propHome] = homeRes;
            periods[propAway] = awayRes;
        }

        // Get incidentsType and red cards
        const incidents = await this._getRuns(periods);

        const pitchers = await getContent(page, '.smh__nbsp', 5000)
            .then((pits) => pits.map((el) => el?.split('.')[0]))

        const exData = await getExData(page);

        const leg = await page.$eval('.infoBox__info', el => {
            return el.textContent?.includes('leg')
                ? el.textContent?.split(' leg')[0]
                : '';
        }).catch(_=>'');

        let rounds = common.league?.split(' - ');

        // Create obj before full stats
        matchStat = {
            id,
            countryCupRound: {
                country: common.country ?? '',
                league: rounds[0],
                round: rounds[1],
                leg
            },
            score: {
                home: Number(common.homeScore),
                away: Number(common.awayScore)
            },
            dateTime: common.dateTime,
            teams: {
                home: common.pair[0] ?? '',
                away: common.pair[1] ?? ''
            },
            periods,
            pitchers: {
                pitHome: pitchers[0],
                pitAway: pitchers[1]
            },
            incidents,
            odds: {
                name: common.oddsName ?? '',
                home: common.oddsValue[0],
                away: common.oddsValue[1]
            },
            exData
        };

        // Check full stats
        let tabsStat = await page
            .waitForSelector(TABS_WITH_FULL_STAT, {timeout: 1000})
            .catch((_) => false);


        if (!tabsStat) {
            return matchStat;
        }

        let linkStat = await page
            .waitForSelector(LINK_FULL_STATS, {timeout: 1000})
            .catch((_) => false);


        if (linkStat) {


            // Go to full statistic and wait loading
            await page.click(LINK_FULL_STATS);
            await page.waitForSelector(TABLE_FULL_STATS);

            // Get name stat and value
            let homeValue = await getContent(page,FULL_STATS.HOME);
            let statName = await getContent(page,FULL_STATS.NAME);
            let awayValue = await getContent(page,FULL_STATS.AWAY);

            // Form obj full stats
            let stats = {};
            for (let i = 0; i < statName.length; i++) {
                stats = {
                    ...stats,
                    [statName[i]!.replaceAll(/[\W\d]/gm, '')]: {
                        home: homeValue[i],
                        away: awayValue[i]
                    }
                };
            }
            // Add full stats to other inform
            matchStat = {
                ...matchStat,
                stats
            };

        }
        return matchStat;
    }

    parseAllMatches = async (
        errIteration: number = 0,
        repeat: boolean = true,
        matchesToParse: string[] = this.matches): Promise<matches<jsonBaseball>> => {
        const spinner = new Spinner();
        let errorsMatches = []
        let numMatch = 1;
        const matchesTotal = matchesToParse.length;
        for (let id of matchesToParse) {
            let label = `${numMatch}/${matchesTotal} Parse match ${id}`
            spinner.start(label);
            try {
                await this._parseMatch(id).then((data) => this._toJson(data));
                spinner.success(label);
                numMatch++;
            } catch (err) {
                errorsMatches.push(id)
                spinner.fail(error(`${numMatch}/${matchesTotal} Error with match ${id}`))
                numMatch++;
            }
        }

        while (errorsMatches.length && errIteration < 5 && repeat) {
            errIteration++;
            console.log(other(`Try parse errors. try: ${errIteration}`));
            let matches: matches<jsonBaseball> = await this.parseAllMatches(
                errIteration,
                false,
                errorsMatches
            );
            errorsMatches = matches.errorsMatches;
        }

        return {
            matchesStats: this.matchesParsed,
            errorsMatches
        }
    }
}
