import {ParserMatchInterface} from "../parser-match.interface.js";
import {Page} from "puppeteer";
import {MATCHES_SELECTORS} from "../../../../constants/selectors.js";
import {footballMatchStat} from "../../../../types/football/match-stats.type.js";
import {incidents} from "../../../../types/football/incidents.type.js";
import {jsonFootball} from "../../../../types/football/json-football.type.js";
import {getCommonInfoMatch, getContent} from "../../utils/utils.js";
import {matches} from "../../../../types/leagues/matches.type.js";
import chalk from "chalk";

const error = chalk.red.bold;
const other = chalk.magenta.bold;
export default class ParserFootball implements ParserMatchInterface<footballMatchStat, jsonFootball> {
    private matchesParsed: jsonFootball[] = [];

    constructor(
        public page: Page,
        public matches: string[]
    ) {}

    getGoalsCards = async (page: Page): Promise<incidents> => {
        const {
            INCIDENTS: {
                ROWS,
                TYPE_INCIDENT,
                TIME_INCIDENT
            }
        } = MATCHES_SELECTORS

        let rowsPeriod = await page.$$(ROWS);
        let goalTimeTeamA = [];
        let goalTimeTeamB = [];
        let cardTimeTeamA = [];
        let cardTimeTeamB = [];
        let goals = []
        let firstTeamCard = 0;

        // Sort another incidents except for (incidentsType/red-yellow-card/red card)
        for (let row of rowsPeriod) {
            let incident = await row.$eval(
                TYPE_INCIDENT,
                el => {
                    // @ts-ignore
                    return el.className.baseVal;
                }
            ).catch((_) => false);

            if (!incident || !incident.match(/(?:soccer)|(?:card-ico)/g))  {
                continue;
            }

            if (incident.search('yellow') !== -1) {
                continue
            }

            // get team and time incident
            let team = await row.evaluate((el) => el.className);
            let timeInc = await row.$eval(TIME_INCIDENT, el => el.textContent);

            // Check team goal (home or away)
            if (incident.search('soccer') !== -1) {
                if (!timeInc!.match('\'')) {
                    continue
                }
                if (team.search('away') === -1) {
                    goals.push(1)
                    goalTimeTeamA.push(timeInc)
                    continue;
                }
                goals.push(2)
                goalTimeTeamB.push(timeInc)
                continue;
            }

            // Check first red card team and time (home or away)
            if (team.search('away') === -1) {
                cardTimeTeamA.push(timeInc)
                firstTeamCard = !firstTeamCard ? 1 : firstTeamCard;
                continue
            }

            cardTimeTeamB.push(timeInc)
            firstTeamCard = !firstTeamCard ? 2 : firstTeamCard;
        }

        return {
            goals,
            goalTimeTeamA,
            goalTimeTeamB,
            cardTimeTeamA,
            cardTimeTeamB,
            firstTeamCard
        }
    }

    parseMatch = async (id: string): Promise<footballMatchStat> => {
        const page = this.page;
        const {
            NAME_TEAMS,
            SCORES,
            PERIODS,
            TABS_WITH_FULL_STAT,
            LINK_FULL_STATS,
            TABLE_FULL_STATS,
            FULL_STATS
        } = MATCHES_SELECTORS;

        let matchStat: footballMatchStat;

        // Create link and wait loading
        const link = `https://www.flashscore.com/match/${id}/#/match-summary/match-summary/`;
        await page.goto(link);
        await page.waitForSelector(NAME_TEAMS);

        const common = await getCommonInfoMatch(page);

        let detailScore = await page.$(SCORES.DETAIL_SCORE);
        if (detailScore) {
            common.homeScore = await detailScore.$eval(SCORES.HOME_D, (el) => el.textContent);
            common.awayScore = await detailScore.$eval(SCORES.AWAY_D, (el) => el.textContent);
        }


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
        const incidents = await this.getGoalsCards(page);

        let rounds = common.league?.split(' - ');

        const leg = await page.$eval('.infoBox__info', el => {
            return el.textContent?.includes('leg')
                ? el.textContent?.split(' leg')[0]
                : '';
        }).catch(_=>'');

        // Create obj before full stats
        matchStat = {
            id,
            countryCupRound: {
                country: common.country ?? '',
                league: rounds[0],
                round: rounds[1],
                roundTwo: rounds[2],
                roundThree: rounds[3],
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
            }
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
            try {
                await page.waitForSelector(TABLE_FULL_STATS);
            } catch (err) {
                console.log(err);
                return matchStat;
            }


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

    toJson = (el: footballMatchStat) => {
        let {
            id = '',
            countryCupRound: {country, league, round, roundTwo, roundThree, leg},
            score: {home, away},
            dateTime,
            teams: {home: homeTeam, away: awayTeam},
            periods: {
                // @ts-ignore
                stHalf: {home: fHalfHome, away: fHalfAway},
                // @ts-ignore
                ndHalf: {home: sHalfHome, away: sHalfAway},
                // @ts-ignore
                ExtraTime = null,
                // @ts-ignore
                Penalties = null
            },
            incidents: {
                goals,
                goalTimeTeamA,
                goalTimeTeamB,
                cardTimeTeamA,
                cardTimeTeamB,
                firstTeamCard
            },
            odds: {name: nameOdds = '-', home: homeOdds = 0, draw = 0, away: awayOdds = 0},
            stats: {
                BallPossession: {home: homeBP = '0', away: awayBP = '0'} = {},
                GoalAttempts: {home: homeGA = 0, away: awayGA = 0} = {},
                ShotsonGoal: {home: homeSOG = 0, away: awaySOG = 0} = {},
                ShotsoffGoal: {home: homeOFG = 0, away: awayOFG = 0} = {},
                BlockedShots: {home: homeBS = 0, away: awayBS = 0} = {},
                FreeKicks: {home: homeFK = 0, away: awayFK = 0} = {},
                CornerKicks: {home: homeCK = 0, away: awayCK = 0} = {},
                Offsides: {home: homeOFF = 0, away: awayOFF = 0} = {},
                Throwin: {home: homeTI = 0, away: awayTI = 0} = {},
                GoalkeeperSaves: {home: homeSV = 0, away: awaySV = 0} = {},
                Fouls: {home: homeF = 0, away: awayF = 0} = {},
                RedCards: {home: homeRC = 0, away: awayRC = 0} = {},
                YellowCards: {home: homeYS = 0, away: awayYS = 0} = {},
                TotalPasses: {home: homeTP = 0, away: awayTP = 0} = {},
                CompletedPasses: {home: homeCP = 0, away: awayCP = 0} = {},
                Tackles: {home: homeTKL = 0, away: awayTKL = 0} = {},
                Attacks: {home: homeTA = 0, away: awayTA = 0} = {},
                DangerousAttacks: {home: homeDA = 0, away: awayDA = 0} = {}
            } = {}
        } = el;
        this.matchesParsed.push({
            "id": id,
            "country": country,
            "league": league,
            "r1": round,
            "r2": roundTwo ?? '',
            "r3": roundThree ?? '',
            "leg": leg ?? '',
            "S1": home,
            "S2": away,
            "SD":away - home,
            "ET": Penalties ? 'SO' : ExtraTime ? 'OT' : '-',
            "date": dateTime,
            "time": dateTime,
            "home": homeTeam,
            "away": awayTeam,
            "1H1": Number(fHalfHome),
            "1H2": Number(fHalfAway),
            "2H1": Number(sHalfHome),
            "2H2": Number(sHalfAway),
            "FGT": Number(goals[0] ?? 0),
            "GPM": goals.join(''),
            "TG1": goalTimeTeamA.join('; '),
            "TG2": goalTimeTeamB.join('; '),
            "FC": Number(firstTeamCard),
            "RCT1": cardTimeTeamA.join('; '),
            "RCT2": cardTimeTeamB.join('; '),
            "Bet": nameOdds,
            "K1": Number(homeOdds),
            "x": Number(draw),
            "K2": Number(awayOdds),
            "BP1": Number(homeBP.replace('%','')),
            "BP2": Number(awayBP.replace('%','')),
            "GA1": Number(homeGA),
            "GA2": Number(awayGA),
            "SOG1": Number(homeSOG),
            "SOG2": Number(awaySOG),
            "OFG1": Number(homeOFG),
            "OFG2": Number(awayOFG),
            "BS1": Number(homeBS),
            "BS2": Number(awayBS),
            "FK1": Number(homeFK),
            "FK2": Number(awayFK),
            "CK1": Number(homeCK),
            "CK2": Number(awayCK),
            "OFF1": Number(homeOFF),
            "OFF2": Number(awayOFF),
            "TI1": Number(homeTI),
            "TI2": Number(awayTI),
            "SV1": Number(homeSV),
            "SV2": Number(awaySV),
            "F1": Number(homeF),
            "F2": Number(awayF),
            "RC1": Number(homeRC),
            "RC2": Number(awayRC),
            "YS1": Number(homeYS),
            "YS2": Number(awayYS),
            "TP1": Number(homeTP),
            "TP2": Number(awayTP),
            "CP1": Number(homeCP),
            "CP2": Number(awayCP),
            "TKL1": Number(homeTKL),
            "TKL2": Number(awayTKL),
            "TA1": Number(homeTA),
            "TA2": Number(awayTA),
            "DA1": Number(homeDA),
            "DA2": Number(awayDA)
        });
    }

    parseAllMatches = async (
        errIteration: number = 0,
        repeat: boolean = true,
        matchesToParse: string[] = this.matches): Promise<matches<jsonFootball>> => {
        let errorsMatches = []
        let numMatch = 1;
        const matchesTotal = matchesToParse.length;
        for (let id of matchesToParse) {
            let label = `${numMatch}/${matchesTotal} Parse match ${id}`
            console.time(label);
            try {
                await this.parseMatch(id).then((data) => this.toJson(data));
                console.timeEnd(label);
                numMatch++;
            } catch (err) {
                errorsMatches.push(id)
                console.log(error(`${numMatch}/${matchesTotal} Error with match ${id}`))
                console.timeEnd(label);
                numMatch++;
            }
        }

        while (errorsMatches.length && errIteration < 5 && repeat) {
            errIteration++
            console.log(other(`Try parse errors. try: ${errIteration}`));
            let matches: matches<jsonFootball> = await this.parseAllMatches(
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
