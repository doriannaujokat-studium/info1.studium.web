/**
 * @return {TuringMachine}
 * @class TuringMachine
 * @constructor
 */
function TuringMachine() {
    if (!new.target) return new TuringMachine(...arguments);
    this.reset();
}

/**
 * @this {TuringMachine}
 * @return {TuringMachine}
 */
TuringMachine.prototype.reset = function reset() {
    /**
     * @name TuringMachine#Band
     * @type {?Map<number,string>}
     * @private
     */
    this.Band = undefined;
    this.StartBand = undefined;
    /**
     * @name TuringMachine#Position
     * @type {?number}
     * @private
     */
    this.Position = undefined;
    /**
     * @name TuringMachine#State
     * @type {?string}
     * @private
     */
    this.State = undefined;
    this.StartState = undefined;
    /**
     * @name TuringMachine#Transitions
     * @type {?Map<string,Map<string,{char: string, state: string, action: "R"|"L"|"H"}>>}
     * @private
     */
    this.Transitions = undefined;
    /**
     * @name TuringMachine#EmptyChar
     * @type {?string}
     * @private
     */
    this.EmptyChar = undefined;
    this.BandChars = undefined;
    this.InputChars = undefined;
    /**
     * @name TuringMachine#History
     * @type {?{}[]}
     * @private
     */
    this.History = undefined;
    return this;
}

/**
 * @param {{BandChars: string[], InputChars: string[], BandValue: string, EmptyChar: string, StartState: string, Transitions: {oState: string, oChar: string, nState: string, nChar: string, action: "R"|"L"|"H"}[]}} args
 * @this {TuringMachine}
 * @return {?TuringMachine}
 */
function load(args) {
    if (validate(args) !== "VALID") return undefined;
    this.Band = new Map();
    this.StartBand = args.BandValue;
    this.Position = 0;
    this.State = args.StartState;
    this.StartState = args.StartState;
    this.Transitions = new Map();
    this.EmptyChar = args.EmptyChar;
    this.BandChars = args.BandChars;
    this.InputChars = args.InputChars;
    for (let t of args.Transitions) {
        if (!this.Transitions.has(t.oState)) this.Transitions.set(t.oState, new Map());
        let tm = this.Transitions.get(t.oState);
        if (!tm.has(t.oChar)) tm.set(t.oChar, {char: t.nChar, state: t.nState, action: t.action});
    }
    args.BandValue.split('').forEach((v,i) => v.length === 1 && this.Band.set(i,v));
    this.History = [];
    return this;
}
TuringMachine.prototype.load = load;

TuringMachine.prototype.setBand = function setBand(band) {
    if (!this.isReady()) throw new TuringMachineError('NOT_READY', '');
    if (!band.split('').every(v => v.length === 0 || this.InputChars.includes(v) || this.EmptyChar === v)) throw new TuringMachineError("INVALID_BANDV");
    this.Position = 0;
    this.State = this.StartState;
    this.Band = new Map();
    this.StartBand = band;
    band.split('').forEach((v,i) => v.length === 1 && this.Band.set(i,v));
    return this;
};

/**
 * @param {{BandChars: string[], InputChars: string[], BandValue: string, EmptyChar: string, StartState: string, Transitions: {oState: string, oChar: string, nState: string, nChar: string, action: "R"|"L"|"H"}[]}} args
 * @return {"VALID"|"INVALID_BANDC"|"INVALID_INC"|"INVALID_BANDV"|"INVALID_EMPTC"|"INVALID_TRANS"}
 */
function validate(args) {
    if (!args.BandChars.every(v => v.length === 1)) return "INVALID_BANDC";
    if (!args.InputChars.every(v => v.length === 1 && args.BandChars.includes(v))) return "INVALID_INC";
    if (!(args.EmptyChar.length === 1 && args.BandChars.includes(args.EmptyChar))) return "INVALID_EMPTC";
    if (!args.BandValue.split('').every(v => v.length === 0 || args.InputChars.includes(v) || args.EmptyChar === v)) return "INVALID_BANDV";
    if (!args.Transitions.every(v => v.oChar.length === 1 && args.BandChars.includes(v.oChar) && v.nChar.length === 1 && args.BandChars.includes(v.nChar) && (v.action.toUpperCase() === "R" || v.action.toUpperCase() === "L" || v.action.toUpperCase() === "H"))) return "INVALID_TRANS";
    return "VALID";
}
TuringMachine.prototype.validate = validate;

/**
 * @this {TuringMachine}
 * @return {"NOT_READY"|"NO_TRANSITION"|"HALT"|"DONE"}
 */
function performStep() {
    if (this.Band === undefined || this.Position === undefined || this.State === undefined || this.EmptyChar === undefined || this.Transitions === undefined) return "NOT_READY";
    if (!this.Transitions.has(this.State)) return "NO_TRANSITION";
    let t = this.Transitions.get(this.State);
    if (!t.has(this.getCharacterAtPosition(this.Position))) return "NO_TRANSITION";
    let tc = t.get(this.getCharacterAtPosition(this.Position));
    this.Band.set(this.Position, tc.char);
    this.State = tc.state;
    if (tc.action === "H") return "HALT";
    if (tc.action === "R") this.Position++;
    if (tc.action === "L") this.Position--;
    return "DONE";
}
TuringMachine.prototype.performStep = performStep;

/**
 * @name TuringMachine.getCharacterAtPosition
 * @param {number} position
 * @this {TuringMachine}
 * @return {?string}
 */
function getCharacterAtPosition(position) {
    if (this.Band === undefined || this.Position === undefined || this.EmptyChar === undefined) return undefined;
    return this.Band.get(position)??this.EmptyChar;
}
TuringMachine.prototype.getCharacterAtPosition = getCharacterAtPosition;

/**
 * @this {TuringMachine}
 * @return {?string}
 */
function getCurrentState() {
    return this.State;
}
TuringMachine.prototype.getCurrentState = getCurrentState;

/**
 * @this {TuringMachine}
 * @return {?number}
 */
function getCurrentPosition() {
    return this.Position;
}
TuringMachine.prototype.getCurrentPosition = getCurrentPosition;

/**
 * @this {TuringMachine}
 * @return {?string}
 */
function getBandValues() {
    if (this.Band === undefined) return undefined;
    return Array.from(this.Band.entries()).sort(([k1,v1],[k2,v2]) => k1 -k2).map(v => v[1]).join("");
}
TuringMachine.prototype.getBandValues = getBandValues;

/**
 * @this {TuringMachine}
 * @return {boolean}
 */
function isReady() {
    return !(this.Band === undefined || this.Position === undefined || this.State === undefined || this.EmptyChar === undefined || this.Transitions === undefined);
}
TuringMachine.prototype.isReady = isReady;

class TuringMachineError extends Error {
    constructor(code,message) {
        super(message??code);
        this.name = "TuringMachineError";
        this.code = code;
    }
}

export { TuringMachine as default, TuringMachineError };