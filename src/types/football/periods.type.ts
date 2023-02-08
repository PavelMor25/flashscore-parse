export type periods = {
    stHalf: {
        home: string,
        away: string
    },
    ndHalf: {
        home: string,
        away: string
    },
    ExtraTime?: {
        home: string,
        away: string
    } | null,
    Penalties?: {
        home: string,
        away: string
    } | null

} | {}
