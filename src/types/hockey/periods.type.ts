export type periods = {
    stPeriod: {
        home: string,
        away: string
    },
    ndPeriod: {
        home: string,
        away: string
    },
    rdPeriod: {
        home: string,
        away: string
    },
    Overtime?: {
        home: string,
        away: string
    } | null,
    Penalties?: {
        home: string,
        away: string
    } | null

} | {}
