export interface CliCommandInterface {
    readonly name: string;

    execute(...parametrs: string[]): void
}
