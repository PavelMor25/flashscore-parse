export type common = {
    country: string,
    league: string,
    homeScore: string | null,
    awayScore: string | null,
    dateTime: Date,
    pair: (string | null)[],
    oddsName: string | null,
    oddsValue: (string | null)[]
}
