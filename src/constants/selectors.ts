export const F00TBALL_SELECTORS = {
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
    'TABS_WITH_FULL_STAT': '.tabs.tabs__detail--nav',
    'LINK_FULL_STATS': 'a[href="#/match-summary/match-statistics"]',
    'TABLE_FULL_STATS': '.subTabs.tabs__detail--sub + .section',
    'FULL_STATS': {
        'NAME': '.stat__categoryName',
        'HOME': '.stat__homeValue',
        'AWAY': '.stat__awayValue'
    },
};

export const MATCH_SELECTORS = {
    'RESULT_TABLE': '.event--results',
    'BTN_SHOW_MORE': 'a.event__more.event__more--static',
    'MATCH_LINE': '.event__match.event__match--static.event__match--twoLine',
}
