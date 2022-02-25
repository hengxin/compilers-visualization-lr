class ParserException extends Error {
    constructor(code: number, msg: string) {
        super(msg);
    }
}

const LR0ItemIndexOutOfRange = () => new ParserException(1001, "LR0ItemIndexOutOfRange");
const AutomatonStatePtrOutOfRange = () => new ParserException(1011, "AutomatonStatePtrOutOfRange");
const StartSymbolNotFound = () => new ParserException(1021, "StartSymbolNotFound");


const InfoAutomatonDone = () => new ParserException(2001, "AutomatonDone");

export {
    LR0ItemIndexOutOfRange,
    AutomatonStatePtrOutOfRange,
    StartSymbolNotFound,

    InfoAutomatonDone,
}