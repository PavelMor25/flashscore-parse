export interface SpinnerInterface {
    
    start(text: string): void;
    fail(text: string): void;
    success(text: string): void;
    updateSpinerText(text: string): void;
    getTextWithTime(text: string): string;
}