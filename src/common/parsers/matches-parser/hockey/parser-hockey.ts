import {ParserMatchInterface} from "../parser-match.interface.js";
import {hockeyMatchStat} from "../../../../types/hockey/match-stats.type.js";
import {jsonHockey} from "../../../../types/hockey/json-hockey.type.js";
import {Page} from "puppeteer";
import {matches} from "../../../../types/leagues/matches.type.js";
import chalk from "chalk";
import {incidents} from "../../../../types/hockey/incidents.js";
import {MATCH_SELECTORS} from "../../../../constants/selectors.js";
import {getCommonInfoMatch, getContent, getExData} from "../../utils/utils.js";
import Spinner from "../../../../common/spinner/spinner.js";

const error = chalk.red.bold;
const other = chalk.magenta.bold;
export default class ParserHockey implements ParserMatchInterface<jsonHockey> {
    private matchesParsed: jsonHockey[] = [];

    constructor(
        public page: Page,
        public matches: string[]
    ) {}

    private _getGoals = async (): Promise<incidents> => {
        const rowsInc = await this.page.$$('.smv__verticalSections.section > div');
        const goalTeam = [];
        const homeMin = [];
        const awayMin = [];
        let n = 0;
        for (let row of rowsInc) {
            if (n === 4) {
                break;
            }
            let headerClass = await row.evaluate(el => el.className);
            if (headerClass.includes('smv__incidentsHeader')) {
                n++
                continue;
            }
            let goal = await row.$('.hockeyGoal-ico');
            if (goal) {
                let goalTime = await row.$eval('.smv__timeBox', el => el.textContent?.split(':')) ?? [];
                let minute = Number(goalTime[1]) > 0 ? Number(goalTime[0]) + 1 : Number(goalTime[0]);
                minute = minute + (n - 1) * 20;
                let teamGoal = headerClass.includes('home') ? 1 : 2;
                teamGoal === 1 ? homeMin.push(minute) : awayMin.push(minute);
                goalTeam.push(teamGoal);
            }
        }
        if (!goalTeam.length) {
            return {
                fgt: 0,
                fgm: 0,
                goalTeam: '',
                homeMin: '',
                awayMin: ''
            }
        }

        return {
            fgt: goalTeam[0],
            fgm: [homeMin,awayMin][goalTeam[0]-1][0],
            goalTeam: goalTeam.join(''),
            homeMin: homeMin.join(';'),
            awayMin: awayMin.join(';')
        }
    }

    private _parseMatch = async (id: string): Promise<hockeyMatchStat> => {
        const page = this.page;
        const {
            NAME_TEAMS,
            PERIODS,
            TABS_WITH_FULL_STAT,
            LINK_FULL_STATS,
            TABLE_FULL_STATS,
            FULL_STATS
        } = MATCH_SELECTORS;

        let matchStat: hockeyMatchStat;

        // Create link and wait loading
        const link = `https://www.flashscore.com/match/${id}/#/match-summary/match-summary/`;
        await page.goto(link);
        await page.waitForSelector(NAME_TEAMS);

        const common = await getCommonInfoMatch(page);

        // Get stats periods
        let halfName = await getContent(page,PERIODS.NAME);

        let halfScore = await getContent(page,PERIODS.VALUE)
            .then((data) => data.map((el) => el!.split(' - ')));

        let periods = {}
        for (let i = 0; i < halfName.length; i++) {
            periods = {
                ...periods,
                [halfName[i]!.replaceAll(/[\s\d]/gm, '')]: {
                    home: halfScore[i][0],
                    away: halfScore[i][1]
                }
            };
        }

        // Get incidentsType and red cards
        const incidents = await this._getGoals();

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
            incidents,
            odds: {
                name: common.oddsName ?? '',
                home: common.oddsValue[0],
                draw: common.oddsValue[1],
                away: common.oddsValue[2]
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
                    [statName[i]!.replaceAll(/[\s\W]/gm, '')]: {
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

    private _toJson = (el: hockeyMatchStat) => {
        let {
            id = '',
            countryCupRound: {country, league, round, leg},
            score: {home, away},
            dateTime,
            teams: {home: homeTeam, away: awayTeam},
            periods: {
                // @ts-ignore
                stPeriod: {home: fPerHome, away: fPerAway},
                // @ts-ignore
                ndPeriod: {home: sPerHome, away: sPerAway},
                // @ts-ignore
                rdPeriod: {home: tPerHome, away: tPerAway},
                // @ts-ignore
                Overtime = null,
                // @ts-ignore
                Penalties = null
            },
            incidents: {
                fgt,
                fgm,
                goalTeam,
                homeMin,
                awayMin,
            },
            exData: {
                Venue = '',
                Attendance = 0
            } = {},
            odds: {name: nameOdds = '-', home: homeOdds = 0, draw = 0, away: awayOdds = 0},
            stats: {
                ShotsonGoal: {home: homeSOG = 0, away: awaySOG = 0} = {},
                ShootingPCT: {home: homeSP = '0', away: awaySP = '0'} = {},
                BlockedShots: {home: homeBS = 0, away: awayBS = 0} = {},
                GoalkeeperSaves: {home: homeSV = 0, away: awaySV = 0} = {},
                SavesPCT: {home: homeSaP = '0', away: awaySaP = '0'} = {},
                Penalties: {home: homeP = 0, away: awayP = 0} = {},
                PIM: {home: homePIM = 0, away: awayPIM = 0} = {},
                PowerplayGoals: {home: homePG = 0, away: awayPG = 0} = {},
                ShorthandedGoals: {home: homeSHG = 0, away: awaySHG = 0} = {},
                PowerplayPCT: {home: homePP = '0', away: awayPP = '0'} = {},
                PenKillingPCT: {home: homePKP = '0', away: awayPKP = '0'} = {},
                Hits: {home: homeH = 0, away: awayH = 0} = {},
                FaceoffsWon: {home: homeFW = 0, away: awayFW = 0} = {},
                Faceoffs: {home: homeF = 0, away: awayF = 0} = {},
                Giveaways: {home: homeG = 0, away: awayG = 0} = {},
                Takeaways: {home: homeT = 0, away: awayT = 0} = {},
                EmptyNetGoals: {home: homeENG = 0, away: awayENG = 0} = {},
            } = {}
        } = el;

        this.matchesParsed.push({
            "id": id,
            "country": country,
            "league": league,
            "round": round,
            "leg": leg ?? '',
            "date": dateTime,
            "time": dateTime,
            "home": homeTeam,
            "away": awayTeam,
            "S1": home,
            "S2": away,
            "SD":away - home,
            "ET": Penalties ? 'SO' : Overtime ? 'OT' : '-',
            "Bet": nameOdds,
            "K1": Number(homeOdds),
            "X": Number(draw),
            "K2": Number(awayOdds),
            "1P1": Number(fPerHome),
            "1P2": Number(fPerAway),
            "2P1": Number(sPerHome),
            "2P2": Number(sPerAway),
            "3P1": Number(tPerHome),
            "3P2": Number(tPerAway),
            "Pen1": Number(Penalties ? Penalties.home : 0),
            "Pen2": Number(Penalties ? Penalties.away : 0),
            "1st Goal": fgt,
            "1GM": fgm,
            "GS": goalTeam,
            "GM1": homeMin,
            "GM2": awayMin,
            "SOG1": Number(homeSOG),
            "SOG2": Number(awaySOG),
            "S_P1": Number(homeSP.split('%')[0]),
            "S_P2": Number(awaySP.split('%')[0]),
            "BS1": Number(homeBS),
            "BS2": Number(awayBS),
            "SV1": Number(homeSV),
            "SV2": Number(awaySV),
            "SV_P1": Number(homeSaP.split('%')[0]),
            "SV_P2": Number(awaySaP.split('%')[0]),
            "P1": Number(homeP),
            "P2": Number(awayP),
            "PIM1": Number(homePIM),
            "PIM2": Number(awayPIM),
            "PPG1": Number(homePG),
            "PPG2": Number(awayPG),
            "SHG1": Number(homeSHG),
            "SHG2": Number(awaySHG),
            "PP_P1": Number(homePP.split('%')[0]),
            "PP_P2": Number(awayPP.split('%')[0]),
            "PK_P1": Number(homePKP.split('%')[0]),
            "PK_P2": Number(awayPKP.split('%')[0]),
            "H1": Number(homeH),
            "H2": Number(awayH),
            "FO1": Number(homeFW),
            "FO2": Number(awayFW),
            "FO_P1": Number(homeF),
            "FO_P2": Number(awayF),
            "GA1": Number(homeG),
            "GA2": Number(awayG),
            "TA1": Number(homeT),
            "TA2": Number(awayT),
            "ENG1": Number(homeENG),
            "ENG2": Number(awayENG),
            "Venue": Venue,
            "Attendance": Number(Attendance),
        });
    }

    parseAllMatches = async (
        errIteration: number = 0,
        repeat: boolean = true,
        matchesToParse: string[] = this.matches): Promise<matches<jsonHockey>> => {
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
            let matches: matches<jsonHockey> = await this.parseAllMatches(
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
