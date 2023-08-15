import { teamProps } from "../matches/teams-prop.type.js"

export type periods = {
    Q1: teamProps,
    Q2: teamProps,
    Q3: teamProps,
    Q4: teamProps,
    QO: teamProps
} | {[key: string]: teamProps}
