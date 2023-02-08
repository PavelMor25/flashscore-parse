import {Page} from "puppeteer";
import {F00TBALL_SELECTORS} from "../../../constants/selectors.js";
import {getContent} from "../../../utils/utils.js";
import {matchStat} from "../../../types/football/match-stats.type.js";
import {incidents} from "../../../types/football/incidents.type.js";
import {jsonFootball} from "../../../types/football/json-football.type.js";

const getGoalsCards = async (page: Page): Promise<incidents> => {
    const {
        INCIDENTS: {
            ROWS,
            TYPE_INCIDENT,
            TIME_INCIDENT
        }
    } = F00TBALL_SELECTORS

    let rowsPeriod = await page.$$(ROWS);
    let goalTimeTeamA = [];
    let goalTimeTeamB = [];
    let cardTimeTeamA = [];
    let cardTimeTeamB = [];
    let goals = []
    let firstTeamCard = 0;

    // Sort another incidents except for (goals/red-yellow-card/red card)
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

export const getParseMatch = async (page: Page, id: string): Promise<matchStat> => {
    const {
        NAME_TEAMS,
        LEAGUE,
        SCORES,
        DATE,
        PERIODS,
        ODDS,
        TABS_WITH_FULL_STAT,
        LINK_FULL_STATS,
        TABLE_FULL_STATS,
        FULL_STATS
    } = F00TBALL_SELECTORS;

    let matchStat: matchStat;

    // Create link and wait loading
    const link = `https://www.flashscore.com/match/${id}/#/match-summary/match-summary/`;
    await page.goto(link);
    await page.waitForSelector(NAME_TEAMS);

    // Get Country, league and round
    let country = await page.$eval(LEAGUE, (el) => el.textContent);
    let cupCountry = [
        country!.split(':')[0],
        ...country!
            .trimStart()
            .split(':')[1]
            .split(' - ')
    ];

    // Get total score
    let homeScore = await page.$eval(SCORES.HOME, (el) => el.textContent);
    let awayScore = await page.$eval(SCORES.AWAY, (el) => el.textContent);

    // Get date match
    let time = await page.$eval(DATE, (el) => el.textContent!.split(' '));

    // Get Name teams
    let pair = await getContent(page, NAME_TEAMS);

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

    // Get goals and red cards
    const incidents = await getGoalsCards(page);

    // Get odds
    // @ts-ignore
    let oddsName = await page.$eval(ODDS.NAME, (el) => el.title).catch((_)=>null);
    let oddsValue = await getContent(page,ODDS.VALUE);

    // Create obj before full stats
    matchStat = {
        id,
        countryCupRound: {
            country: cupCountry[0],
            league: cupCountry[1],
            round: cupCountry[2]
        },
        score: {
            home: Number(homeScore),
            away: Number(awayScore)
        },
        dateTime: {
            date: time[0],
            time: time[1]
        },
        teams: {
            home: pair[0] ?? '',
            away: pair[1] ?? ''
        },
        periods,
        incidents,
        odds: {
            name: oddsName,
            home: oddsValue[0],
            draw: oddsValue[1],
            away: oddsValue[2]
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

export const getJsonFootball = (el: matchStat): jsonFootball => {
    // @ts-ignore
    // @ts-ignore
    let {
        id = '',
        countryCupRound: {country, league, round},
        score: {home, away},
        dateTime: {date, time},
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
            BallPossession: {home: homeBP = '-', away: awayBP = '-'} = {},
            GoalAttempts: {home: homeGA = '-', away: awayGA = '-'} = {},
            ShotsonGoal: {home: homeSOG = '-', away: awaySOG = '-'} = {},
            ShotsoffGoal: {home: homeOFG = '-', away: awayOFG = '-'} = {},
            BlockedShots: {home: homeBS = '-', away: awayBS = '-'} = {},
            FreeKicks: {home: homeFK = '-', away: awayFK = '-'} = {},
            CornerKicks: {home: homeCK = '-', away: awayCK = '-'} = {},
            Offsides: {home: homeOFF = '-', away: awayOFF = '-'} = {},
            Throwin: {home: homeTI = '-', away: awayTI = '-'} = {},
            GoalkeeperSaves: {home: homeSV = '-', away: awaySV = '-'} = {},
            Fouls: {home: homeF = '-', away: awayF = '-'} = {},
            RedCards: {home: homeRC = '-', away: awayRC = '-'} = {},
            YellowCards: {home: homeYS = '-', away: awayYS = '-'} = {},
            TotalPasses: {home: homeTP = '-', away: awayTP = '-'} = {},
            CompletedPasses: {home: homeCP = '-', away: awayCP = '-'} = {},
            Tackles: {home: homeTKL = '-', away: awayTKL = '-'} = {},
            Attacks: {home: homeTA = '-', away: awayTA = '-'} = {},
            DangerousAttacks: {home: homeDA = '-', away: awayDA = '-'} = {}
        } = {}
    } = el;
    return ({
        "id": id,
        "country": country,
        "league": league,
        "round": round,
        "S1": home,
        "S2": away,
        "SD":away - home,
        "ET": Penalties ? 'SO' : ExtraTime ? 'OT' : '-',
        "date": date,
        "time": time,
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
        "BP1": homeBP.replace('%',''),
        "BP2": awayBP.replace('%',''),
        "GA1": homeGA,
        "GA2": awayGA,
        "SOG1": homeSOG,
        "SOG2": awaySOG,
        "OFG1": homeOFG,
        "OFG2": awayOFG,
        "BS1": homeBS,
        "BS2": awayBS,
        "FK1": homeFK,
        "FK2": awayFK,
        "CK1": homeCK,
        "CK2": awayCK,
        "OFF1": homeOFF,
        "OFF2": awayOFF,
        "TI1": homeTI,
        "TI2": awayTI,
        "SV1": homeSV,
        "SV2": awaySV,
        "F1": homeF,
        "F2": awayF,
        "RC1": homeRC,
        "RC2": awayRC,
        "YS1": homeYS,
        "YS2": awayYS,
        "TP1": homeTP,
        "TP2": awayTP,
        "CP1": homeCP,
        "CP2": awayCP,
        "TKL1": homeTKL,
        "TKL2": awayTKL,
        "TA1": homeTA,
        "TA2": awayTA,
        "DA1": homeDA,
        "DA2": awayDA
    });
}

