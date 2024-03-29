export const MATCH_SELECTORS = {
    'NAME_TEAMS': 'a.participant__participantName',
    'LEAGUE': '.tournamentHeader__country',
    'SCORES': {
        'HOME': '.detailScore__wrapper span:first-child',
        'AWAY': '.detailScore__wrapper span:last-child',
        'DETAIL_SCORE': '.detailScore__fullTime',
        'HOME_D': 'span:first-child',
        'AWAY_D': 'span:last-child'
    },
    'DATE': '.duelParticipant__startTime',
    'PERIODS': {
        'NAME': '.smv__incidentsHeader.section__title div:first-child',
        'VALUE': '.smv__incidentsHeader.section__title div:last-child'
    },
    'INCIDENTS': {
        'ROWS': '.smv__participantRow',
        'TYPE_INCIDENT': '.smv__incidentIcon svg',
        'TIME_INCIDENT': '.smv__timeBox'
    },
    'ODDS': {
        'ODDS_ROW': '.oddsRow',
        'NAME': '.bookmaker a',
        'VALUE': '.oddsValueInner'
    },
    'TABS_WITH_FULL_STAT': '.filterOver.filterOver--indent',
    'LINK_FULL_STATS': 'a[href="#/match-summary/match-statistics"]',
    'TABLE_FULL_STATS': '.subFilterOver.subFilterOver--indent.subFilterOver--radius + .section',
    'FULL_STATS': {
        'NAME': '.section div div div[class*="category"] strong',
        'HOME': '.section div div div[class*="homeValue"] strong',
        'AWAY': '.section div div div[class*="awayValue"] strong'
    },
};

export const MATCHES_SELECTORS = {
    'RESULT_TABLE': '.event.event--results',
    'BTN_SHOW_MORE': 'a.event__more.event__more--static',
    'MATCH_LINE': '.event__match.event__match--static.event__match--twoLine',
}
