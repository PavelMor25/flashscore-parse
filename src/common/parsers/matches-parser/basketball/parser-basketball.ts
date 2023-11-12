import {ParserMatchInterface} from "../parser-match.interface.js";
import {Page} from "puppeteer";
import {MATCHES_SELECTORS} from "../../../../constants/selectors.js";
import {incidents} from "../../../../types/basketball/incidents.type.js";
import {getCommonInfoMatch, getContent, replacerStatName, getExData} from "../../utils/utils.js";
import {matches} from "../../../../types/leagues/matches.type.js";
import chalk from "chalk";
import { jsonBasketball } from "../../../../types/basketball/json-basketball.type.js";
import { basketballMatchStat } from "../../../../types/basketball/match-stats.type.js";
import { periods } from "../../../../types/basketball/periods.type.js";
import { topPlayers } from "../../../../types/basketball/top-players.type.js";
import { pointAdvantage } from "../../../../types/basketball/pointAdvantage.type.js";
import Spinner from "../../../../common/spinner/spinner.js";

const error = chalk.red.bold;
const other = chalk.magenta.bold;

export default class ParserBasketball implements ParserMatchInterface<jsonBasketball> {
    private matchesParsed: jsonBasketball[] = [];

    constructor(
        public page: Page,
        public matches: string[]
    ) {}

    private _getIncidents = async (page: Page): Promise<incidents> => {
        
        try {
            await page.waitForSelector(MATCHES_SELECTORS.TABS_WITH_FULL_STAT, {timeout: 3000})

            const pointAdvantage = await this._getPointAdvantage(page);

            const topPlayers = await this._getPlayers(page);

            return {
                pointAdvantage,
                topPlayers
            }
        } catch(e) {
            console.log(e)
            
            return {
                pointAdvantage: {
                    homeAdvantage: {
                        points: 0,
                        quater: 1
                    },
                    awayAdvantage: {
                        points: 0,
                        quater: 1
                    }
                },
                topPlayers: {
                    homePlayer: {
                        name: '',
                        points: 0
                    },
                    awayPlayer: {
                        name: '',
                        points: 0
                    }
                }
            }
        }

        
    }

    private _getPointAdvantage = async (page: Page): Promise<pointAdvantage> => {
        let pointAdvantage = {
            homeAdvantage: {
                points: 0,
                quater: 1
            },
            awayAdvantage: {
                points: 0,
                quater: 1
            }
        }

        let {homeAdvantage, awayAdvantage} = pointAdvantage;


        let historyLink = await page
            .waitForSelector('a[href="#/match-summary/point-by-point"]')
            .catch((_) => false);

        if (historyLink) {
            await page.click('a[href="#/match-summary/point-by-point"]');

            for (let i = 0; i < 5; i++) {
                historyLink = await page
                    .waitForSelector(`a[href="#/match-summary/point-by-point/${i}"]`, {timeout: 1000})
                    .catch((_) => false);

                    if (i && historyLink) {
                        await page.click(`a[href="#/match-summary/point-by-point/${i}"]`);
                    }
                
                await page.waitForSelector('.matchHistoryRowWrapper')


    
                let teamH =  await page
                    .$$eval(
                        '.matchHistoryRow__ahead.matchHistoryRow__green.matchHistoryRow__home', 
                        (els) => els.map((el) => Number(el.textContent?.replace('+', '')))
                    );
                let teamA =  await page
                    .$$eval(
                        '.matchHistoryRow__ahead.matchHistoryRow__green.matchHistoryRow__away',
                        (els) => els.map((el) => Number(el.textContent?.replace('+', '')))
                    );
                

                homeAdvantage.quater = Math.max(...teamH, homeAdvantage.points) === homeAdvantage.points ? homeAdvantage.quater : i + 1;
                awayAdvantage.quater = Math.max(...teamA, awayAdvantage.points) === awayAdvantage.points ? awayAdvantage.quater : i + 1;

                homeAdvantage.points = Math.max(...teamH, homeAdvantage.points); 
                awayAdvantage.points = Math.max(...teamA, awayAdvantage.points); 
            }
        }
        
        return pointAdvantage;
    }

    private _getPlayers = async (page: Page): Promise<topPlayers> => {
        let topPlayers = {
            homePlayer: {
                name: '',
                points: 0
            },
            awayPlayer: {
                name: '',
                points: 0
            }
        }

        let linkPlayerStat = await page
            .waitForSelector('a[href="#/match-summary/player-statistics"]')
            .catch((_) => false);

    
        if (!linkPlayerStat) {
            return topPlayers
        }
        await page.click('a[href="#/match-summary/player-statistics"]')
        
        for (let i = 1; i < 3; i++) {
            linkPlayerStat = await page
            .waitForSelector(`a[href="#/match-summary/player-statistics/${i}"]`)
            .catch((_) => false);
            

            if (linkPlayerStat) {
                await page.click(`a[href="#/match-summary/player-statistics/${i}"]`)
                let table = await page 
                    .waitForSelector('.ui-table.playerStatsTable')
                    .catch((_) => false);
                
                if (table) {
                    let name = await page.$eval('.ui-table__body .ui-table__row.playerStatsTable__row:first-child .playerStatsTable__participantNameCell',
                    (el) => el.textContent);
                    let points = await page.$eval('.ui-table__body .ui-table__row.playerStatsTable__row:first-child .playerStatsTable__cell:nth-child(3)',
                    (el) => el.textContent);

                    topPlayers[i === 1 ? 'homePlayer' : 'awayPlayer'] = {
                        name: name ?? '',
                        points: Number(points)
                    };
                }
            }
        } 

        return topPlayers;
    }

    private _parseMatch = async (id: string): Promise<basketballMatchStat> => {
        const page = this.page;
        const {
            NAME_TEAMS,
            TABS_WITH_FULL_STAT,
            LINK_FULL_STATS,
            TABLE_FULL_STATS,
            FULL_STATS
        } = MATCHES_SELECTORS;

        let matchStat: basketballMatchStat;

        // Create link and wait loading
        const link = `https://www.flashscore.com/match/${id}/#/match-summary/match-summary/`;
        await page.goto(link);
        await page.waitForSelector(NAME_TEAMS);

        const common = await getCommonInfoMatch(page);

        // Get stats periods
        let periods: periods = {}
        const periodNum = ['1','2','3','4','5'];

        for (let num of periodNum) {
            let quarter = num === '5' ? 'QO' : `Q${num}`;
            let homeRes =  await page.$eval(`.smh__home.smh__part--${num}`, el => {
                return el.textContent ? Number(el.textContent) : 0;
            });
            let awayRes =  await page.$eval(`.smh__away.smh__part--${num}`, el => {
                return el.textContent ? Number(el.textContent) : 0;
            });
            periods[quarter] = {
                home: homeRes,
                away: awayRes
            }
        }
        

        let rounds = common.league?.split(' - ');

        const leg = await page.$eval('.infoBox__info', el => {
            return el.textContent?.includes('leg')
                ? el.textContent?.split(' leg')[0]
                : '';
        }).catch(_=>'');

        const exData = await getExData(page);

        const incidents = await this._getIncidents(page);

        // Create obj before full stats
        matchStat = {
            id,
            countryCupRound: {
                country: common.country ?? '',
                league: rounds[0],
                round: rounds[1],
                roundTwo: rounds[2],
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
                    [statName[i]!.replaceAll(/[\s\W\d]/gm, replacerStatName)]: {
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

    private _toJson = (el: basketballMatchStat) => {
        let {
            id = '',
            countryCupRound: {country, league, round, roundTwo, leg},
            score: {home, away},
            dateTime,
            teams: {home: homeTeam, away: awayTeam},
            periods: {Q1, Q2, Q3, Q4, QO},
            incidents: {
                pointAdvantage: {homeAdvantage, awayAdvantage},
                topPlayers: {homePlayer, awayPlayer},
            },
            exData: {
                Venue = '',
                Attendance = ''
            } = {},
            odds: {name: nameOdds = '-', home: homeOdds = 0, away: awayOdds = 0},
            stats: {
                FieldGoalsAttempted: {home: homeFGA = '0', away: awayFGA = '0'} = {},
                FieldGoalsMade: {home: homeFGM = '0', away: awayFGM = '0'} = {},
                FieldGoals: {home: homeFG = '0', away: awayFG = '0'} = {},
                twoPointFieldGAttempted: {home: homePFA = '0', away: awayPFA = '0'} = {},
                twoPointFieldGoalsMade: {home: homePFGM = '0', away: awayPFGM = '0'} = {},
                twoPointFieldGoals: {home: homePFG = '0', away: awayPFG = '0'} = {},
                threePointFieldGAttempted: {home: homeTPF = '0', away: awayTPF = '0'} = {},
                threePointFieldGoalsMade: {home: homeTPFGM = '0', away: awayTPFGM = '0'} = {},
                threePointFieldGoals: {home: homeTPFG = '0', away: awayTPFG = '0'} = {},
                FreeThrowsAttempted: {home: homeFTA = '0', away: awayFTA = '0'} = {},
                FreeThrowsMade: {home: homeFTM = '0', away: awayFTM = '0'} = {},
                FreeThrows: {home: homeFT = '0', away: awayFT = '0'} = {},
                OffensiveRebounds: {home: homeOR = '0', away: awayOR = '0'} = {},
                DefensiveRebounds: {home: homeDR = '0', away: awayDR = '0'} = {},
                TotalRebounds: {home: homeTR = '0', away: awayTR = '0'} = {},
                Assists: {home: homeA = '0', away: awayA = '0'} = {},
                Blocks: {home: homeB = '0', away: awayB = '0'} = {},
                Turnovers: {home: homeT = '0', away: awayT = '0'} = {},
                Steals: {home: homeS = '0', away: awayS = '0'} = {},
                PersonalFouls: {home: homePF = '0', away: awayPF = '0'} = {},
                TechnicalFouls: {home: homeTF = '0', away: awayTF = '0'} = {},
            } = {}
        } = el;
        this.matchesParsed.push({
            "id": id,
            "country": country,
            "league": league,
            "r1": round,
            "r2": roundTwo ?? '',
            "leg": leg ?? '',
            "date": dateTime,
            "time": dateTime,
            "home": homeTeam,
            "away": awayTeam,
            "S1": home,
            "S2": away,
            "SD":away - home,
            "ET": QO.home + QO.away > 0 ? 'OT' : '',
            "Bet": nameOdds,
            "K1": Number(homeOdds),
            "K2": Number(awayOdds),
            "1Q1": Q1.home,
            "1Q2": Q1.away,
            "2Q1": Q2.home,
            "2Q2": Q2.away,
            "3Q1": Q3.home,
            "3Q2": Q3.away,
            "4Q1": Q4.home,
            "4Q2": Q4.away,
            "OT1": QO.home,
            "OT2": QO.away,
            "HA": homeAdvantage.points,
            "QHA": homeAdvantage.quater,
            "AA": awayAdvantage.points,
            "QAA": awayAdvantage.quater,
            "VAR": homeAdvantage.points + awayAdvantage.points,
            "playerH": homePlayer.name,
            "playerPtsH": homePlayer.points,
            "playerA": awayPlayer.name,
            "playerPtsA": awayPlayer.points,
            "FGA1": +homeFGA,
            "FGA2": +awayFGA,
            "FGM1": +homeFGM,
            "FGM2": +awayFGM,
            "FGP1": +homeFG.replace('%',''),
            "FGP2": +awayFG.replace('%',''),
            "PA21": +homePFA,
            "PA22": +awayPFA,
            "PM21": +homePFGM,
            "PM22": +awayPFGM,
            "PP21": +homePFG.replace('%',''),
            "PP22": +awayPFG.replace('%',''),
            "PA31": +homeTPF,
            "PA32": +awayTPF,
            "PM31": +homeTPFGM,
            "PM32": +awayTPFGM,
            "PP31": +homeTPFG.replace('%',''),
            "PP32": +awayTPFG.replace('%',''),
            "FTA1": +homeFTA,
            "FTA2": +awayFTA,
            "FTM1": +homeFTM,
            "FTM2": +awayFTM,
            "FTP1": +homeFT.replace('%',''),
            "FTP2": +awayFT.replace('%',''),
            "ORB1": +homeOR,
            "ORB2": +awayOR,
            "DRB1": +homeDR,
            "DRB2": +awayDR,
            "TRB1": +homeTR,
            "TRB2": +awayTR,
            "AST1": +homeA,
            "AST2": +awayA,
            "BLK1": +homeB,
            "BLK2": +awayB,
            "TOV1": +homeT,
            "TOV2": +awayT,
            "STL1": +homeS,
            "STL2": +awayS,
            "PF1": +homePF,
            "PF2": +awayPF,
            "TF1": +homeTF,
            "TF2": +awayTF,
            "Venue": Venue,
            "Attendance": Number(Attendance),
        });
    }

    parseAllMatches = async (
        errIteration: number = 0,
        repeat: boolean = true,
        matchesToParse: string[] = this.matches): Promise<matches<jsonBasketball>> => {
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
            let matches: matches<jsonBasketball> = await this.parseAllMatches(
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
