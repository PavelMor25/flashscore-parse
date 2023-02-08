export interface FileReaderInterface {
    readonly fileName: string;

    read(): void;
}
