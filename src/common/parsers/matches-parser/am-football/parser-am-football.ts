import {ParserMatchInterface} from "../parser-match.interface.js";
import {amFootballMatchStat} from "../../../../types/am-football/match-stats.type.js";
import {jsonAmFootball} from "../../../../types/am-football/json-am-football.type.js";
import {Page} from "puppeteer";
import {matches} from "../../../../types/leagues/matches.type.js";
import chalk from "chalk";
import {incidents} from "../../../../types/am-football/incidents.type.js";
import {MATCHES_SELECTORS} from "../../../../constants/selectors.js";
import {getCommonInfoMatch, getContent, getExData} from "../../utils/utils.js";
import Spinner from "../../../../common/spinner/spinner.js";

const error = chalk.red.bold;
const other = chalk.magenta.bold;

export default class ParserAmFootball implements ParserMatchInterface<jsonAmFootball> {
    private matchesParsed: jsonAmFootball[] = [];

    constructor(
        public page: Page,
        public matches: string[]
    ) {}

    private _getGoals = async (): Promise<incidents> => {
        const rowsInc = await this.page.$$('.smv__verticalSections.section > div');
        const touchSeq = [];
        const homeTouchMin = [];
        const awayTouchMin = [];
        const fieldSeq = [];
        const homeFieldMin = [];
        const awayFieldMin = [];
        let n = 0;
        for (let row of rowsInc) {
            if (n === 5) {
                break;
            }
            let headerClass = await row.evaluate(el => el.className);
            if (headerClass.includes('smv__incidentsHeader')) {
                n++
                continue;
            }
            let goal = await row.$('.aussie-rules');
            if (goal) {
                let typeGoal = await row.$eval('.smv__subIncident', el => el.textContent);
                let goalTime = await row.$eval('.smv__timeBox',el => el.textContent?.split(':')) ?? [];
                let minute = Number(goalTime[1]) > 0 ? Number(goalTime[0]) + 1 : Number(goalTime[0]);
                minute = minute + (n - 1) * 15;
                let teamGoal = headerClass.includes('home') ? 1 : 2;

                if (typeGoal?.includes('Touchdown')) {
                    teamGoal === 1 ? homeTouchMin.push(minute) : awayTouchMin.push(minute);
                    touchSeq.push(teamGoal);
                } else if (!typeGoal?.includes('Missed') && typeGoal?.includes('Field Goal')) {
                    teamGoal === 1 ? homeFieldMin.push(minute) : awayFieldMin.push(minute);
                    fieldSeq.push(teamGoal);
                }
            }
        }

        return {
            FTD: touchSeq[0],
            TDM: [homeTouchMin,awayTouchMin]?.[touchSeq[0]-1]?.[0],
            TDS: touchSeq.join(''),
            TDM1: homeTouchMin.join(';'),
            TDM2: awayTouchMin.join(';'),
            FFG: fieldSeq[0],
            FGM: [homeFieldMin,awayFieldMin]?.[fieldSeq[0]-1]?.[0],
            FGS: fieldSeq.join(''),
            FGM1: homeFieldMin.join(';'),
            FGM2: awayFieldMin.join(';')
        }
    }

    private _toJson = (el: amFootballMatchStat) => {
        let {
            id = '',
            countryCupRound: {country, league, round},
            score: {home, away},
            dateTime,
            teams: {home: homeTeam, away: awayTeam},
            periods: {
                // @ts-ignore
                stQuarter: {home: fPerHome, away: fPerAway},
                // @ts-ignore
                ndQuarter: {home: sPerHome, away: sPerAway},
                // @ts-ignore
                rdQuarter: {home: tPerHome, away: tPerAway},
                // @ts-ignore
                thQuarter: {home: ftPerHome, away: ftPerAway},
                // @ts-ignore
                Overtime = null,
            },
            incidents: {
                FTD,
                TDM,
                TDS,
                TDM1,
                TDM2,
                FFG,
                FGM,
                FGS,
                FGM1,
                FGM2
            },
            exData: {
                Venue = '',
                Attendance = 0
            } = {},
            odds: {name: nameOdds = '-', home: homeOdds = 0, away: awayOdds = 0},
            stats: {
                stDowns: {home: home1std = 0, away: away1std = 0} = {},
                TotalYards: {home: homeYds = 0, away: awayYds = 0} = {},
                PassingYards: {home: homeRec = 0, away: awayRec = 0} = {},
                RushingYards: {home: homeRush = 0, away: awayRush = 0} = {},
                Penalties: {home: homePen = 0, away: awayPen = 0} = {},
                PenaltiesYards: {home: homeYdsP = 0, away: awayYdsP = 0} = {},
                Turnovers: {home: homeTO = 0, away: awayTO = 0} = {},
                Punts: {home: homePnt = 0, away: awayPnt = 0} = {},
                Touchdowns: {home: homeTD = 0, away: awayTD = 0} = {},
                RushingTouchdowns: {home: homeRTD = 0, away: awayRTD = 0} = {},
                PassingTouchdowns: {home: homePTD = 0, away: awayPTD = 0} = {},
                TurnoverTouchdowns: {home: homeTTD = 0, away: awayTTD = 0} = {},
                FieldGoalsSucceeded: {home: homeFGS = 0, away: awayFGS = 0} = {},
                FieldGoalsAttempted: {home: homeFGA = 0, away: awayFGA = 0} = {},
                InterceptionThrown: {home: homeInt = 0, away: awayInt = 0} = {},
                FumblesLost: {home: homeFl = 0, away: awayFl = 0} = {},
                SacksAllowed: {home: homeSk = 0, away: awaySk = 0} = {},
                Safeties: {home: homeSfty = 0, away: awaySfty = 0} = {},
                Pointconversions: {home: home2PM = 0, away: away2PM  = 0} = {},
            } = {}
        } = el;

        this.matchesParsed.push({
            "id": id,
            "country": country,
            "league": league,
            "round": round,
            "date": dateTime,
            "time": dateTime,
            "home": homeTeam,
            "away": awayTeam,
            "S1": home,
            "S2": away,
            "SD":away - home,
            "ET": Overtime ? 'OT' : '-',
            "Bet": nameOdds,
            "K1": Number(homeOdds),
            "K2": Number(awayOdds),
            "1Q1": Number(fPerHome),
            "1Q2": Number(fPerAway),
            "2Q1": Number(sPerHome),
            "2Q2": Number(sPerAway),
            "3Q1": Number(tPerHome),
            "3Q2": Number(tPerAway),
            "4Q1": Number(ftPerHome),
            "4Q2": Number(ftPerAway),
            "1st TD": FTD,
            "1TDM": TDM,
            "TDS": TDS,
            "TDM1": TDM1,
            "TDM2": TDM2,
            "1st FG": FFG,
            "1FGM": FGM,
            "FGS": FGS,
            "FGM1": FGM1,
            "FGM2": FGM2,
            "1stD1": Number(home1std),
            "1stD2": Number(away1std),
            "Yds1": Number(homeYds),
            "Yds2": Number(awayYds),
            "Rec1": Number(homeRec),
            "Rec2": Number(awayRec),
            "Rush1": Number(homeRush),
            "Rush2": Number(awayRush),
            "Pen1": Number(homePen),
            "Pen2": Number(awayPen),
            "YdsP1": Number(homeYdsP),
            "YdsP2": Number(awayYdsP),
            "TO1": Number(homeTO),
            "TO2": Number(awayTO),
            "Pnt1": Number(homePnt),
            "Pnt2": Number(awayPnt),
            "TD1": Number(homeTD),
            "TD2": Number(awayTD),
            "RTD1": Number(homeRTD),
            "RTD2": Number(awayRTD),
            "PTD1": Number(homePTD),
            "PTD2": Number(awayPTD),
            "TTD2": Number(homeTTD),
            "TTD1": Number(awayTTD),
            "FGS1": Number(homeFGS),
            "FGS2": Number(awayFGS),
            "FGA1": Number(homeFGA),
            "FGA2": Number(awayFGA),
            "Int1": Number(homeInt),
            "Int2": Number(awayInt),
            "Fl1": Number(homeFl),
            "Fl2": Number(awayFl),
            "Sk1": Number(homeSk),
            "Sk2": Number(awaySk),
            "Sfty1": Number(homeSfty),
            "Sfty2": Number(awaySfty),
            "2PM1": Number(home2PM),
            "2PM2": Number(away2PM),
            "Venue": Venue,
            "Attendance": Number(Attendance),
        });
    }

    private _parseMatch = async (id: string): Promise<amFootballMatchStat> => {
        const page = this.page
        const {
            NAME_TEAMS,
            PERIODS,
            TABS_WITH_FULL_STAT,
            LINK_FULL_STATS,
            TABLE_FULL_STATS,
            FULL_STATS
        } = MATCHES_SELECTORS;

        let matchStat: amFootballMatchStat;

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

        let rounds = common.league?.split(' - ');

        // Create obj before full stats
        matchStat = {
            id,
            countryCupRound: {
                country: common.country ?? '',
                league: rounds[0],
                round: rounds[1],
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
                away: common.oddsValue[1]
            },
            exData
        };

        // Check full stats
        let tabsStat = await this.page
            .waitForSelector(TABS_WITH_FULL_STAT, {timeout: 1000})
            .catch((_) => false);

        if (!tabsStat) {
            return matchStat;
        }

        let linkStat = await this.page
            .waitForSelector(LINK_FULL_STATS, {timeout: 1000})
            .catch((_) => false);

        if (linkStat) {


            // Go to full statistic and wait loading
            await this.page.click(LINK_FULL_STATS);
            await this.page.waitForSelector(TABLE_FULL_STATS);

            // Get name stat and value
            let homeValue = await getContent(page,FULL_STATS.HOME);
            let statName = await getContent(page,FULL_STATS.NAME);
            let awayValue = await getContent(page,FULL_STATS.AWAY);

            // Form obj full stats
            let stats = {};
            for (let i = 0; i < statName.length; i++) {
                stats = {
                    ...stats,
                    [statName[i]!.replaceAll(/[\s\W1-9]/gm, '')]: {
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
        matchesToParse: string[] = this.matches): Promise<matches<jsonAmFootball>> => {
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
            errIteration++
            console.log(other(`Try parse errors. try: ${errIteration}`));
            let matches: matches<jsonAmFootball> = await this.parseAllMatches(
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
