import {Page} from "puppeteer";
import {F00TBALL_SELECTORS} from "../../../constants/selectors.js";
import {getContent} from "../../../utils/utils.js";
import {matchStat} from "../../../types/football/match-stats.type.js";
import {incidents} from "../../../types/football/incidents.type.js";
import {jsonFootball} from "../../../types/football/json-football.type.js";
import moment from "moment";

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

    let detailScore = await page.$(SCORES.DETAIL_SCORE);
    if (detailScore) {
        homeScore = await detailScore.$eval(SCORES.HOME_D, (el) => el.textContent);
        awayScore = await detailScore.$eval(SCORES.AWAY_D, (el) => el.textContent);
    }

    // Get date match
    // let time = await page.$eval(DATE, (el) => el.textContent!.split(' '));
    let time = await page.$eval(DATE, (el) => el.textContent);
    let dateTime = moment(time, 'DD.MM.YYYY kk:mm').toDate();

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
    await page.waitForSelector(ODDS.ODDS_ROW, {timeout: 5000}).catch(_ => false);
    // @ts-ignore
    let oddsName = await page.$eval(ODDS.NAME, (el) => el.title).catch((_)=>null);
    let oddsValue = await getContent(page, ODDS.VALUE);

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
        dateTime,
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
    return ({
        "id": id,
        "country": country,
        "league": league,
        "round": round,
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

