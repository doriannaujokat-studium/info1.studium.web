(() => {
    const VERSION = 1;

    const LANG = {
        EMPTCHAR_NOT_BANDCHAR: "Das Leerzeichen ist nicht in der Bandmenge definiert.",
        INCHAR_NOT_BANDCHAR: "Alle Eingabecharaktere müssen in der Bandmenge definiert sein.",
        STARTCHAR_NOT_INCHAR: "Der Anfangswert des Bandes kann nur aus Eingabecharakteren bestehen!",
        STARTSTATE_NOT_DEFINED: "Ein Anfangszustand muss definiert sein!",
        NEXTSTEP_NA: "Es kann kein weiterer Schritt gemacht werden!",
        ENDSTATE_ARRIVED: "Das Ende wurde erreicht!",
        TRANCHAR_NOT_BANDCHAR: "Alle übergangswerte müssen in der Bandmenge definiert sein.",
        NOT_READY: "Die Maschine ist nicht bereit.",
    };

    window.addEventListener('load', async () => {
        const TMModule = await import('../turing.js');
        const TuringMachine = TMModule.default;

        let DOM_Z_empty = document.getElementById('turing-list-Z-empty');
        let DOM_Z_list = document.getElementById('turing-list-Z'); // Zustände
        let DOM_Band_list = document.getElementById('turing-list-Band');
        let DOM_E_list = document.getElementById('turing-list-E'); // Eingabe
        let DOM_B_list = document.getElementById('turing-list-B'); // Band
        let DOM_StartZ = document.getElementById('turing-startZ');
        let DOM_emptyZ = document.getElementById('turing-emptyZ');
        let DOM_T_list = document.getElementById('turing-list-transitions'); // Übergänge
        let DOM_Expert = document.getElementById('turing-expert'); // Experten Modus
        let output = document.getElementById('turing-output');
        let canvas = document.getElementById('turing-canvas');
        /**
         * @type {CanvasRenderingContext2D}
         */
        let ctx = canvas.getContext('2d');

        /** @type {TuringMachine} */
        const Machine = new TuringMachine();

        let simulating = false;
        let simulatingTimer = undefined;

        let disableAutosave = false;
        let readonly = false;

        {
            const url = new URL(location);
            if (url.searchParams.has('sd')) {
                disableAutosave = true;
                document.getElementById('turing-notif-autosave-disabled').toggleAttribute('active',true);
                loadSave(JSON.parse(atob(url.searchParams.get('sd'))));
            } else if (url.searchParams.has('url')) {
                disableAutosave = true;
                document.getElementById('turing-notif-autosave-disabled').toggleAttribute('active',true);
                fetch(url.searchParams.get('url')).then(v => v.text()).then(v => {
                    loadSave(JSON.parse(v));
                    saveToLocal();
                });
            } else {
                let data = window.localStorage.getItem('save');
                if (data) {
                    loadSave(JSON.parse(data));
                }
            }
            if (url.searchParams.has('readonly')) {
                readonly = true;
                document.getElementById('turing-notif-readonly').toggleAttribute('active',true);
                document.getElementById('turing-clear').disabled = true;
                document.getElementById('turing-example').disabled = true;
                document.getElementById('turing-example-expert').disabled = true;
                document.getElementById('turing-load').disabled = true;
                document.getElementById('turing-expert').disabled = true;
                document.getElementById('turing-save').disabled = true;
                document.getElementById('turing-exportparsed').disabled = true;
                document.getElementById('turing-sharelink').disabled = true;

                //document.getElementById('turing-list-Band').setAttribute('readonly','readonly');
                document.getElementById('turing-list-E').setAttribute('readonly','readonly');
                document.getElementById('turing-list-B').setAttribute('readonly','readonly');
                document.getElementById('turing-startZ').setAttribute('readonly','readonly');
                document.getElementById('turing-emptyZ').setAttribute('readonly','readonly');
                document.getElementById('turing-list-transitions').setAttribute('readonly','readonly');
            }
        }

        document.getElementById('turing-save').addEventListener('click', () => {
            if (readonly) return;
            let blob = new Blob([JSON.stringify(createSave())],{type: "application/json"});

            let dlElem = document.createElement('a');
            dlElem.href = window.URL.createObjectURL(blob);
            dlElem.target = '_blank';
            dlElem.download = 'turing.json';
            dlElem.click();
            dlElem.remove();
        });
        document.getElementById('turing-sharelink').addEventListener('click', () => {
            if (readonly) return;
            const link = new URL(window.location);
            link.searchParams.set('sd',btoa(JSON.stringify(createSave())));
            navigator.clipboard.writeText(link.toString()).then(() => {
                alert('Link kopiert!');
            }).catch((reason) => {
                console.log(reason);
                alert('Fehler beim Kopieren!');
            });
        });
        document.getElementById('turing-print').addEventListener('click', (e) => {
            const parsed = GetParsedTuring();
            let popup = e.ctrlKey ? window.open('./print.html','_blank', 'popup=no') : window.open('./print.html','_blank', 'popup=yes,width=800,height=600,toolbar=no,location=no,directories=no,status=no,menubar=no');
            let loadPU = function () {
                popup.document.getElementById('turing-sstate').innerText = parsed.StartState;
                popup.document.getElementById('turing-emptchar').innerText = parsed.EmptyChar;
                const states = new Set();
                states.add(parsed.StartState);
                parsed.Transitions.forEach((t) => {
                    states.add(t.oState);
                    states.add(t.nState);
                });
                const statesArr = Array.from(states).sort();
                for (let [I, S] of statesArr.entries()) {
                    if (I > 0) {
                        const SE = popup.document.createElement('span');
                        SE.innerText = ',';
                        popup.document.getElementById('turing-states').append(SE);
                    }
                    const SE = popup.document.createElement('span');
                    SE.innerText = S;
                    popup.document.getElementById('turing-states').append(SE);
                }
                for (let [I, C] of parsed.InputChars.entries()) {
                    if (I > 0) {
                        const CE = popup.document.createElement('span');
                        CE.innerText = ',';
                        popup.document.getElementById('turing-input').append(CE);
                    }
                    const CE = popup.document.createElement('span');
                    CE.innerText = C;
                    popup.document.getElementById('turing-input').append(CE);
                }
                for (let [I, C] of parsed.BandChars.entries()) {
                    if (I > 0) {
                        const CE = popup.document.createElement('span');
                        CE.innerText = ',';
                        popup.document.getElementById('turing-band').append(CE);
                    }
                    const CE = popup.document.createElement('span');
                    CE.innerText = C;
                    popup.document.getElementById('turing-band').append(CE);
                }
                const _Transitions = new Map();
                for (let [I, T] of parsed.Transitions.entries()) {
                    if (!_Transitions.has(T.oState)) _Transitions.set(T.oState, new Set());
                    if (_Transitions.get(T.oState).has(T.oChar)) continue;
                    _Transitions.get(T.oState).add(T.oChar);
                    const TE = popup.document.createElement('div');
                    const TEoS = popup.document.createElement('span');
                    TEoS.innerText = T.oState;
                    const TEoC = document.createElement('span');
                    TEoC.innerText = T.oChar;
                    const TEnS = popup.document.createElement('span');
                    TEnS.innerText = T.nState;
                    const TEnC = document.createElement('span');
                    TEnC.innerText = T.nChar;
                    const TEA = popup.document.createElement('span');
                    TEA.innerText = T.action;
                    TE.append(TEoS, TEoC, TEnS, TEnC, TEA);
                    popup.document.getElementById('turing-transitions').append(TE);
                }
            };
            popup.window.addEventListener('DOMContentLoaded', loadPU, {once: true, passive: true});
        });
        document.getElementById('turing-sharelink').addEventListener('dragstart', (event) => {
            if (readonly) {
                event.preventDefault();
                return;
            }
            const link = new URL(window.location);
            link.searchParams.set('sd',btoa(JSON.stringify(createSave())));
            let dt = event.dataTransfer;
            dt.setData('text/uri-list', link.toString());
            dt.setData('text/plain', link.toString());
        });
        document.getElementById('turing-exportparsed').addEventListener('click', () => {
            if (readonly) return;
            const parsedData = GetParsedTuring();
            let saveData = {};
            saveData.Band = parsedData.BandValue;
            saveData.InputC = parsedData.InputChars.join('');
            saveData.BandC = parsedData.BandChars.join('');
            saveData.Start = parsedData.StartState;
            saveData.Empty = parsedData.EmptyChar;
            saveData.Trans = parsedData.Transitions.map(v => `(${v.oState}, ${v.oChar}) ==> (${v.nState/*.replaceAll('\\','\\\\').replaceAll('"','\\""')*/}, ${v.nChar}, ${v.action})`).join('\n');
            saveData.Expert = false;
            saveData.VERSION = VERSION;
            let blob = new Blob([JSON.stringify(saveData)],{type: "application/json"});

            let dlElem = document.createElement('a');
            dlElem.href = window.URL.createObjectURL(blob);
            dlElem.target = '_blank';
            dlElem.download = 'turing.standard.json';
            dlElem.click();
            dlElem.remove();
        });
        document.getElementById('turing-load').addEventListener('click', () => {
            let ulElem = document.createElement('input');
            ulElem.type = "file";
            ulElem.accept = '.json';
            ulElem.addEventListener("change", () => {
                if (ulElem.files) {
                    ulElem.files.item(0).text().then(v => {
                        loadSave(JSON.parse(v));
                        saveToLocal();
                    }).finally(() => {
                        ulElem.remove();
                    });
                } else {
                    ulElem.remove();
                }
            });
            ulElem.addEventListener("abort", () => {
                ulElem.remove();
            });
            ulElem.click();
        });
        document.getElementById('turing-example').addEventListener('click', () => {
            fetch('./examples/turing_unary_addition.json').then(v => v.text()).then(v => {
                loadSave(JSON.parse(v));
                saveToLocal();
            });
        });
        document.getElementById('turing-example-expert').addEventListener('click', () => {
            fetch('./examples/turing_decimal_addition.json').then(v => v.text()).then(v => {
                loadSave(JSON.parse(v));
                saveToLocal();
            });
        });
        document.getElementById('turing-clear').addEventListener('click', () => {
            DOM_Band_list.value = "";
            DOM_E_list.value = "";
            DOM_B_list.value = "";
            DOM_StartZ.value = "";
            DOM_emptyZ.value = "";
            DOM_T_list.value = "";
            DOM_Expert.removeAttribute('active');
            document.getElementById('turing-exportparsed').disabled = true;
            readonly = false;
            document.getElementById('turing-notif-readonly').toggleAttribute('active',false);
            disableAutosave = false;
            document.getElementById('turing-notif-autosave-disabled').toggleAttribute('active',false);
            saveToLocal();
        });

        function createSave() {
            let saveData = {};
            saveData.Band = DOM_Band_list.value;
            saveData.InputC = DOM_E_list.value;
            saveData.BandC = DOM_B_list.value;
            saveData.Start = DOM_StartZ.value;
            saveData.Empty = DOM_emptyZ.value;
            saveData.Trans = DOM_T_list.value;
            saveData.Expert = DOM_Expert.hasAttribute('active');
            saveData.VERSION = VERSION;
            return saveData;
        }
        function loadSave(data) {
            if ((data.VERSION??0) > VERSION) {
                let ignore = confirm(`This save was made using a newer version. (Save: ${data.VERSION??0}, Current: ${VERSION})\n\nIt may not load correctly. Do you want to load it anyway?`);
                if (!ignore) return;
            }
            DOM_Band_list.value = data.Band ?? "";
            DOM_E_list.value = data.InputC ?? data.E ?? "";
            DOM_B_list.value = data.BandC ?? data.B ?? "";
            DOM_StartZ.value = data.Start ?? "";
            DOM_emptyZ.value = data.Empty ?? "";
            DOM_T_list.value = data.Trans ?? data.T ?? "";
            DOM_Expert.toggleAttribute('active', data.Expert ?? false);
            document.getElementById('turing-exportparsed').disabled = !data.Expert;
        }
        function saveToLocal() {
            if (disableAutosave) return;
            let data = createSave();
            window.localStorage.setItem('save',JSON.stringify(data));
        }
        [DOM_Band_list,DOM_E_list,DOM_B_list,DOM_StartZ,DOM_emptyZ,DOM_T_list].forEach(d => d.addEventListener('input',saveToLocal));
        function GetParsedTuring() {
            let BandChars = DOM_B_list.value!==""?DOM_B_list.value.split(""):[];
            let EmptyChar = DOM_emptyZ.value!==""?DOM_emptyZ.value:'_';
            let InputChars = DOM_E_list.value!==""?DOM_E_list.value.split(""):[];
            let BandValue = DOM_Band_list.value!==""?DOM_Band_list.value:"";
            let Transitions = [];
            const CharRegionMaps = new Map();
            function GetCharRegion(region) {
                if(CharRegionMaps.has(region)) return CharRegionMaps.get(region);
                const sc = region.substring(0,1);
                const ec = region.substring(2,3);
                const si = BandChars.indexOf(sc);
                const ei = BandChars.indexOf(ec);
                let rmap = [];
                if (si === -1 || ei === -1) rmap = [];
                else {
                    let reverse = si > ei;
                    rmap = BandChars.slice(reverse?ei:si, reverse?si+1:ei+1);
                    if (reverse) rmap = rmap.reverse();
                }
                CharRegionMaps.set(region,rmap);
                return rmap;
            }
            let Tval = DOM_T_list.value;
            if (Tval !== "") {
                let items = Tval.split("\n");
                itemLoop: for (let v of items) {
                    if (DOM_Expert.hasAttribute('active')) {
                        if (v.length < 1) continue;
                        let isEscaping = false;
                        let isString = false;
                        let patternType = undefined;
                        let isInGroup = false;
                        let cPos = 0;
                        let pat = [];
                        let sepLastP = true;
                        let lastControlC = undefined;
                        let isWhiteSpace = true;
                        // Parse line
                        for (let c of v.split("")) {
                            if (isWhiteSpace && c === '#') continue itemLoop; // Line is comment
                            if (isWhiteSpace && c !== ' ') isWhiteSpace = false;
                            if (isEscaping) {
                                isEscaping = false;
                                pat[cPos] = (pat[cPos] ?? "") + c;
                                sepLastP = false;
                                continue;
                            }
                            if (c === '\\') {
                                isEscaping = true;
                                continue;
                            }
                            if (isString) {
                                if (c === '"') {
                                    isString = false;
                                    lastControlC = '"';
                                    sepLastP = false;
                                    continue;
                                }
                                pat[cPos] = (pat[cPos] ?? "") + c;
                                continue;
                            }
                            if (c === '(') {
                                if (isInGroup) continue itemLoop; // Invalid line
                                if (patternType === undefined) patternType = 'group';
                                if (patternType !== "group") continue itemLoop; // Invalid line
                                isInGroup = true;
                                continue;
                            }
                            if (c === ')') {
                                if (!isInGroup) continue itemLoop; // Invalid line
                                if (!sepLastP) cPos++;
                                sepLastP = true;
                                isInGroup = false;
                                continue;
                            }
                            if (c === '"') {
                                if (!sepLastP) continue itemLoop; // Invalid line
                                if (patternType === undefined) patternType = 'string';
                                isString = true;
                                lastControlC = '"';
                                sepLastP = false;
                                continue;
                            }
                            if (c === ',' || c === ' ') {
                                if (!sepLastP) cPos++;
                                sepLastP = true;
                                continue;
                            }
                            if (!isInGroup && patternType === 'group' && (c === '=' || c === '>' || c === '-')) {
                                if (!sepLastP) continue itemLoop; // Invalid line
                                continue;
                            }
                            if (!isInGroup && c === '#') { // Treat end of line as comment
                                if (pat.length < 5) continue itemLoop; // Invalid line
                                break;
                            }
                            if (patternType === undefined) patternType = 'chars';
                            pat[cPos] = (pat[cPos] ?? "") + c;
                            sepLastP = false;
                        }
                        if (pat.length < 5 || pat.length > 6) continue;
                        let patS = pat.slice(0, 2), patE = pat.slice(-3);
                        const oChar = new Set();
                        let eGroup = false; // Is currently in a group
                        let etGroup = false; // Is currently opening or closing a group
                        let evGroup = undefined; // Current value of the group
                        let esc = false;
                        // Parse original character
                        for (let i = 0; i < patS[1].length; i++) {
                            const c = patS[1][i];
                            if (esc) {
                                if (evGroup) evGroup += c;
                                else oChar.add(c);
                                esc = false;
                                continue;
                            }
                            if (c === '\\') {
                                esc = true;
                                continue;
                            }
                            if (c === '{') {
                                if (!eGroup && etGroup) {
                                    eGroup = true;
                                    etGroup = false;
                                    evGroup = "";
                                    continue;
                                }
                                if (!eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '}';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (c === '}') {
                                if (eGroup && etGroup) {
                                    eGroup = false;
                                    etGroup = false;
                                    if (evGroup === '*') BandChars.forEach(c => oChar.add(c));
                                    else if (evGroup.length === 3 && evGroup[1] === '-') GetCharRegion(evGroup).forEach(c => oChar.add(c));
                                    evGroup = undefined;
                                    continue;
                                }
                                if (eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (!eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '{';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (eGroup) evGroup += c;
                            else oChar.add(c);
                        }
                        if (eGroup || etGroup) continue itemLoop; // Invalid line
                        if (oChar.size === 0) continue itemLoop; // Invalid line
                        const oState = [];
                        let _ci = 0;
                        oChar.forEach(c => oState.push({c: c, ci: _ci++, s: '', v: '', ns: '', nc: '', a: ''}));
                        // Parse original state
                        for (let i = 0; i < patS[0].length; i++) {
                            const c = patS[0][i];
                            if (esc) {
                                if (evGroup) evGroup += c;
                                else oState.forEach(v => v.s += c);
                                esc = false;
                                continue;
                            }
                            if (c === '\\') {
                                esc = true;
                                continue;
                            }
                            if (c === '{') {
                                if (!eGroup && etGroup) {
                                    eGroup = true;
                                    etGroup = false;
                                    evGroup = "";
                                    continue;
                                }
                                if (!eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '}';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (c === '}') {
                                if (eGroup && etGroup) {
                                    eGroup = false;
                                    etGroup = false;
                                    if (evGroup === 'c') oState.forEach(v => v.s += v.c);
                                    else if (evGroup.startsWith('m:')) {
                                        const _region = GetCharRegion(evGroup.substring(2));
                                        if (oChar.size !== _region.length || oState.length % _region.length !== 0) continue itemLoop;
                                        oState.forEach(v => v.s += _region[v.ci]);
                                    } else if (evGroup.startsWith('v:')) {
                                        const _vv = evGroup.substring(2);
                                        let vv = [];
                                        if (_vv === '*') BandChars.forEach(v => vv.push(v));
                                        else if (_vv.length === 3 && _vv[1] === '-') GetCharRegion(_vv).forEach(v => vv.push(v));
                                        if (vv.length === 1) {
                                            oState.forEach(v => {
                                                v.v += vv[0];
                                                v.s += vv[0];
                                            });
                                        } else if (vv.length > 1) {
                                            const _tempO = [];
                                            oState.forEach(v => {
                                                for (let i = 1; i < vv.length; i++) {
                                                    let vi = Object.assign({},v);
                                                    vi.v += vv[i];
                                                    vi.s += vv[i];
                                                    oState.push(vi);
                                                }
                                                v.v += vv[0];
                                                v.s += vv[0];
                                            });
                                        }
                                    }
                                    evGroup = undefined;
                                    continue;
                                }
                                if (eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (!eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '{';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (eGroup) evGroup += c;
                            else oState.forEach(v => v.s += c);
                        }
                        if (eGroup || etGroup) continue itemLoop; // Invalid line
                        // Parse new state
                        for (let i = 0; i < patE[0].length; i++) {
                            const c = patE[0][i];
                            if (esc) {
                                if (evGroup) evGroup += c;
                                else oState.forEach(v => v.ns += c);
                                esc = false;
                                continue;
                            }
                            if (c === '\\') {
                                esc = true;
                                continue;
                            }
                            if (c === '{') {
                                if (!eGroup && etGroup) {
                                    eGroup = true;
                                    etGroup = false;
                                    evGroup = "";
                                    continue;
                                }
                                if (!eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '}';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (c === '}') {
                                if (eGroup && etGroup) {
                                    eGroup = false;
                                    etGroup = false;
                                    if (evGroup === 'c') oState.forEach(v => v.ns += v.c);
                                    else if (evGroup === 's') oState.forEach(v => v.ns += v.s);
                                    else if (evGroup.startsWith('m:')) {
                                        const _region = GetCharRegion(evGroup.substring(2));
                                        if (oChar.size !== _region.length || oState.length % _region.length !== 0) continue itemLoop;
                                        oState.forEach(v => v.ns += _region[v.ci]);
                                    } else if (evGroup.startsWith('v:')) {
                                        const _vv = evGroup.substring(2);
                                        const vv = parseInt(_vv);
                                        if (isNaN(vv)) continue itemLoop;
                                        if (vv < 0) continue itemLoop;
                                        for (let v of oState) {
                                            if (vv > v.v.length) continue itemLoop;
                                            v.ns += v.v[vv];
                                        }
                                    } else if (evGroup.startsWith('add:')) {
                                        const _vv = evGroup.substring(4);
                                        const vvs = _vv.split('+');
                                        if (vvs.length < 0) continue itemLoop;
                                        const vs = [];
                                        for (let a of vvs) {
                                            if (a === 'c') {
                                                vs.push('c');
                                                continue;
                                            }
                                            const vv = parseInt(a);
                                            if (isNaN(vv)) continue itemLoop;
                                            if (vv < 0) continue itemLoop;
                                            vs.push(vv);
                                        }
                                        for (let v of oState) {
                                            let sum = 0;
                                            for (let vv of vs) {
                                                if (vv === 'c') {
                                                    let vvv = parseInt(v.c);
                                                    if (isNaN(vvv)) continue;
                                                    sum += vvv;
                                                    continue;
                                                }
                                                if (vv > v.v.length) continue itemLoop;
                                                let vvv = parseInt(v.v[vv]);
                                                if (isNaN(vvv)) continue;
                                                sum += vvv;
                                            }
                                            v.ns += sum;
                                        }
                                    }
                                    evGroup = undefined;
                                    continue;
                                }
                                if (eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (!eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '{';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (eGroup) evGroup += c;
                            else oState.forEach(v => v.ns += c);
                        }
                        if (eGroup || etGroup) continue itemLoop; // Invalid line
                        // Parse new character
                        for (let i = 0; i < patE[1].length; i++) {
                            const c = patE[1][i];
                            if (esc) {
                                if (evGroup) evGroup += c;
                                else oState.forEach(v => v.nc += c);
                                esc = false;
                                continue;
                            }
                            if (c === '\\') {
                                esc = true;
                                continue;
                            }
                            if (c === '{') {
                                if (!eGroup && etGroup) {
                                    eGroup = true;
                                    etGroup = false;
                                    evGroup = "";
                                    continue;
                                }
                                if (!eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '}';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (c === '}') {
                                if (eGroup && etGroup) {
                                    eGroup = false;
                                    etGroup = false;
                                    if (evGroup === 'c') oState.forEach(v => v.nc += v.c);
                                    else if (evGroup === 's') oState.forEach(v => v.nc += v.s);
                                    else if (evGroup.startsWith('m:')) {
                                        const _region = GetCharRegion(evGroup.substring(2));
                                        if (oChar.size !== _region.length || oState.length % _region.length !== 0) continue itemLoop;
                                        oState.forEach(v => v.nc += _region[v.ci]);
                                    } else if (evGroup.startsWith('v:')) {
                                        const _vv = evGroup.substring(2);
                                        const vv = parseInt(_vv);
                                        if (isNaN(vv)) continue itemLoop;
                                        if (vv < 0) continue itemLoop;
                                        for (let v of oState) {
                                            if (vv > v.v.length) continue itemLoop;
                                            v.nc += v.v[vv];
                                        }
                                    }
                                    evGroup = undefined;
                                    continue;
                                }
                                if (eGroup && !etGroup) {
                                    etGroup = true;
                                    continue;
                                }
                                if (!eGroup && etGroup)   {
                                    etGroup = false;
                                    evGroup += '{';
                                }
                                evGroup += c;
                                continue;
                            }
                            if (eGroup) evGroup += c;
                            else oState.forEach(v => v.nc += c);
                        }
                        if (eGroup || etGroup) continue itemLoop; // Invalid line
                        oState.forEach(v => v.a = patE[2]); // Load action
                        oState.forEach(v => Transitions.push({oState: v.s, oChar: v.c, nState: v.ns, nChar: v.nc, action: v.a}));
                        continue;
                    }
                    //let imatch = v.match(new RegExp(`\\((\\w+),(.)\\)\\s*\\((\\w+),(.),([RLH])\\)`,'i'));
                    let imatch = v.match(new RegExp(`^\\(?(?<oState>\\w+),\\s*?(?<oChar>.)\\s*?(?:(?<!\\(.*?),\\s*?|(?<=\\(.*?)\\)\\s*?(?:[-=]*>)?\\s*?\\()(?<nState>\\w+),\\s*?(?<nChar>.),\\s*?(?<action>R|L|H)(?:(?<=\\(.*?\\).*?\\(.*?)\\)$|(?<!\\(.*?)$)`,'iu'));
                    if (!imatch) continue;
                    /**
                     if (!Array.from(DOM_Z_list.childNodes.values()).some(v => v.innerText === imatch[1])) {
                        let d = document.createElement('div');
                        d.innerText = imatch[1];
                        DOM_Z_list.appendChild(d);
                    }
                     if (!Array.from(DOM_Z_list.childNodes.values()).some(v => v.innerText === imatch[3])) {
                        let d = document.createElement('div');
                        d.innerText = imatch[3];
                        DOM_Z_list.appendChild(d);
                    }
                     DOM_Z_empty.style.display = "none";*/
                    Transitions.push({oState: imatch.groups.oState, oChar: imatch.groups.oChar, nState: imatch.groups.nState, nChar: imatch.groups.nChar, action: imatch.groups.action});
                }
                console.log(`Number of transitions: ${Transitions.length}`);
            }
            return {BandChars: BandChars, InputChars: InputChars, BandValue: BandValue, EmptyChar: EmptyChar, StartState: DOM_StartZ.value, Transitions: Transitions};
        }
        function resetTuring() {
            Machine.reset();
            output.value = "";
            DOM_Z_list.innerHTML = "";
            DOM_Z_empty.style.display = "block";
            document.getElementById('turing-play').disabled = true;
            document.getElementById('turing-step').disabled = true;
            draw();

            let loadParam = GetParsedTuring();

            let validation = Machine.validate(loadParam);
            if (validation !== "VALID") {
                let message;
                switch (validation) {
                    case "INVALID_INC":
                        message = LANG.INCHAR_NOT_BANDCHAR;
                        break;
                    case "INVALID_EMPTC":
                        message = LANG.EMPTCHAR_NOT_BANDCHAR;
                        break;
                    case "INVALID_TRANS":
                        message = LANG.TRANCHAR_NOT_BANDCHAR;
                        break;
                    default:
                        message = validation;
                        break;
                }
                alert(message);
                return;
            }
            Machine.load(loadParam);
            output.value = Machine.getBandValues();
            document.getElementById('turing-play').disabled = false;
            document.getElementById('turing-step').disabled = false;
            draw();

        }
        function timedStep() {
            const result = Machine.performStep();
            if (result === "NOT_READY") {
                if (simulating) {
                    document.getElementById('turing-play').click();
                }
                alert(LANG.NOT_READY);
                return;
            }
            if (result === "NO_TRANSITION") {
                if (simulating) {
                    document.getElementById('turing-play').click();
                }
                alert(LANG.NEXTSTEP_NA);
                return;
            }
            output.value = Machine.getBandValues();
            draw();
            if (result === "HALT") {
                if (simulating) {
                    document.getElementById('turing-play').click();
                }
                alert(LANG.ENDSTATE_ARRIVED);
                return;
            }
        }

        document.getElementById('turing-reset').addEventListener('click', resetTuring);
        document.getElementById('turing-expert').addEventListener('click', (e) => {
            if (e.target !== e.currentTarget) return;
            document.getElementById('turing-expert').toggleAttribute('active');
            document.getElementById('turing-exportparsed').disabled = readonly || !document.getElementById('turing-expert').hasAttribute('active');
            saveToLocal();
        });
        document.getElementById('turing-fast').addEventListener('click', () => {
            if (simulating) {
                clearInterval(simulatingTimer);
                if (document.getElementById('turing-fast').hasAttribute('active')) {
                    simulatingTimer = setInterval(timedStep, 250);
                    document.getElementById('turing-fast').removeAttribute('active');
                    return;
                }
                document.getElementById('turing-fast50').removeAttribute('active');
                simulatingTimer = setInterval(timedStep, 25);
                document.getElementById('turing-fast').setAttribute('active','');
            }
        });
        document.getElementById('turing-fast50').addEventListener('click', () => {
            if (simulating) {
                clearInterval(simulatingTimer);
                if (document.getElementById('turing-fast50').hasAttribute('active')) {
                    simulatingTimer = setInterval(timedStep, 250);
                    document.getElementById('turing-fast50').removeAttribute('active');
                    return;
                }
                document.getElementById('turing-fast').removeAttribute('active');
                simulatingTimer = setInterval(timedStep, 5);
                document.getElementById('turing-fast50').setAttribute('active','');
            }
        });
        document.getElementById('turing-play').addEventListener('click', () => {
            if (simulating) {
                clearInterval(simulatingTimer);
                document.getElementById('turing-clear').disabled = readonly || false;
                document.getElementById('turing-example').disabled = readonly || false;
                document.getElementById('turing-example-expert').disabled = readonly || false;
                document.getElementById('turing-load').disabled = readonly || false;
                document.getElementById('turing-expert').disabled = readonly || false;
                document.getElementById('turing-reset').disabled = false;
                document.getElementById('turing-step').disabled = false;
                document.getElementById('turing-fast').disabled = true;
                document.getElementById('turing-fast50').disabled = true;
                document.getElementById('turing-play').removeAttribute('active');
                document.getElementById('turing-fast').removeAttribute('active');
                document.getElementById('turing-fast50').removeAttribute('active');
                document.getElementById('turing-play-text').innerText = "Start";
                document.getElementById('turing-play-icon').setAttribute('d',"M6 3 A 1 1 0 0 0 5 4 A 1 1 0 0 0 5 4.0039062L5 15L5 25.996094 A 1 1 0 0 0 5 26 A 1 1 0 0 0 6 27 A 1 1 0 0 0 6.5800781 26.8125L6.5820312 26.814453L26.416016 15.908203 A 1 1 0 0 0 27 15 A 1 1 0 0 0 26.388672 14.078125L6.5820312 3.1855469L6.5800781 3.1855469 A 1 1 0 0 0 6 3 z");
                simulating = false;
                simulatingTimer = undefined;
                return;
            }
            simulating = true;
            document.getElementById('turing-clear').disabled = readonly || true;
            document.getElementById('turing-example').disabled = readonly || true;
            document.getElementById('turing-example-expert').disabled = readonly || true;
            document.getElementById('turing-load').disabled = readonly || true;
            document.getElementById('turing-expert').disabled = readonly || true;
            document.getElementById('turing-reset').disabled = true;
            document.getElementById('turing-step').disabled = true;
            document.getElementById('turing-fast').disabled = false;
            document.getElementById('turing-fast50').disabled = false;
            document.getElementById('turing-play').setAttribute('active','');
            document.getElementById('turing-play-text').innerText = "Stop";
            document.getElementById('turing-play-icon').setAttribute('d',"M8 4C6.895 4 6 4.895 6 6L6 24C6 25.105 6.895 26 8 26L10 26C11.105 26 12 25.105 12 24L12 6C12 4.895 11.105 4 10 4L8 4 z M 20 4C18.895 4 18 4.895 18 6L18 24C18 25.105 18.895 26 20 26L22 26C23.105 26 24 25.105 24 24L24 6C24 4.895 23.105 4 22 4L20 4 z");
            simulatingTimer = setInterval(timedStep, 250);
        });
        document.getElementById('turing-step').addEventListener('click', timedStep);

        window.addEventListener('resize', resize);

        function resize() {
            canvas.width = window.innerWidth;
            draw();
        }
        function draw() {
            const rectSize = 40;
            const margin = 10;
            const width = canvas.clientWidth, height = canvas.clientHeight;
            const middle = [width/2,height/2];
            const middleElem = [middle[0]-rectSize/2,middle[1]-rectSize/2];

            ctx.clearRect(0,0,width,height);
            if (!Machine.isReady()) return;

            for (let i = Machine.getCurrentPosition() - Math.round(middleElem[0]/50); middleElem[0] - (Machine.getCurrentPosition()-i)*(rectSize+margin) < width + rectSize + margin; i++) {
                let value = Machine.getCharacterAtPosition(i);
                drawRect(i,value,middleElem[0] - (Machine.getCurrentPosition()-i)*(rectSize+margin),middleElem[1],rectSize,rectSize);
            }

            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(middleElem[0],middleElem[1],rectSize,rectSize);

            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.font = "16px sans-serif";
            ctx.fillStyle = '#ff0000';
            //ctx.fillText(v,x+(w/2-measure.width/2),y+(h/2));
            ctx.fillText(Machine.getCurrentState(),middleElem[0]+(rectSize/2),middleElem[1]-1);
        }
        function drawRect(i,v,x,y,w,h) {
            ctx.fillStyle = Math.abs(i)%2===1?'#000000':'#89ba17';
            ctx.fillRect(x,y,w,h);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "24px sans-serif";
            let measure = ctx.measureText(v);
            ctx.fillStyle = Math.abs(i)%2===1?'#89ba17':'#000000';
            //ctx.fillText(v,x+(w/2-measure.width/2),y+(h/2));
            ctx.fillText(v,x+(w/2),y+(h/2));
        }

        resize();
    });
})();