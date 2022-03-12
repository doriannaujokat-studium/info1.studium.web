(() => {
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
        const TMModule = await import('./turing.js');
        const TuringMachine = TMModule.default;

        let DOM_Z_empty = document.getElementById('turing-list-Z-empty');
        let DOM_Z_list = document.getElementById('turing-list-Z'); // Zustände
        let DOM_Band_list = document.getElementById('turing-list-Band');
        let DOM_E_list = document.getElementById('turing-list-E'); // Eingabe
        let DOM_B_list = document.getElementById('turing-list-B'); // Band
        let DOM_StartZ = document.getElementById('turing-startZ');
        let DOM_emptyZ = document.getElementById('turing-emptyZ');
        let DOM_T_list = document.getElementById('turing-list-transitions'); // Übergänge
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

        {
            let data = window.localStorage.getItem('save');
            if (data) {
                loadSave(JSON.parse(data));
            }
        }

        document.getElementById('turing-save').addEventListener('click', () => {
            let blob = new Blob([JSON.stringify(createSave())],{type: "application/json"});

            let dlElem = document.createElement('a');
            dlElem.href = window.URL.createObjectURL(blob);
            dlElem.target = '_blank';
            dlElem.download = 'turing.json';
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
            loadSave(JSON.parse("{\"Band\":\"111+11111\",\"E\":\"1+\",\"B\":\"1+_=*\",\"Start\":\"z1\",\"Empty\":\"_\",\"T\":\"(z1,_)(z1,_,R)\\n(z1,1)(z2,1,L)\\n\\n(z2,_)(z3,=,R)\\n\\n(z3,_)(z5,_,L)\\n(z3,*)(z3,*,R)\\n(z3,+)(z3,+,R)\\n(z3,=)(z3,=,R)\\n(z3,1)(z4,*,L)\\n\\n(z4,*)(z4,*,L)\\n(z4,+)(z4,+,L)\\n(z4,=)(z4,=,L)\\n(z4,_)(z3,*,R)\\n\\n(z5,_)(z5,_,H)\\n(z5,+)(z5,+,L)\\n(z5,1)(z5,1,L)\\n(z5,=)(z5,=,L)\\n(z5,*)(z5,1,L)\"}"));
            saveToLocal();
        });
        document.getElementById('turing-clear').addEventListener('click', () => {
            DOM_Band_list.value = "";
            DOM_E_list.value = "";
            DOM_B_list.value = "";
            DOM_StartZ.value = "";
            DOM_emptyZ.value = "";
            DOM_T_list.value = "";
            saveToLocal();
        });

        function createSave() {
            let saveData = {};
            saveData.Band = DOM_Band_list.value;
            saveData.E = DOM_E_list.value;
            saveData.B = DOM_B_list.value;
            saveData.Start = DOM_StartZ.value;
            saveData.Empty = DOM_emptyZ.value;
            saveData.T = DOM_T_list.value;
            return saveData;
        }
        function loadSave(data) {
            DOM_Band_list.value = data.Band;
            DOM_E_list.value = data.E;
            DOM_B_list.value = data.B;
            DOM_StartZ.value = data.Start;
            DOM_emptyZ.value = data.Empty;
            DOM_T_list.value = data.T;
        }
        function saveToLocal() {
            let data = createSave();
            window.localStorage.setItem('save',JSON.stringify(data));
        }
        [DOM_Band_list,DOM_E_list,DOM_B_list,DOM_StartZ,DOM_emptyZ,DOM_T_list].forEach(d => d.addEventListener('input',saveToLocal));
        function resetTuring() {
            Machine.reset();
            output.value = "";
            DOM_Z_list.innerHTML = "";
            DOM_Z_empty.style.display = "block";
            document.getElementById('turing-play').disabled = true;
            document.getElementById('turing-step').disabled = true;
            draw();

            let BandChars = DOM_B_list.value!==""?DOM_B_list.value.split(""):[];
            let EmptyChar = DOM_emptyZ.value!==""?DOM_emptyZ.value:'_';
            let InputChars = DOM_E_list.value!==""?DOM_E_list.value.split(""):[];
            let BandValue = DOM_Band_list.value!==""?DOM_Band_list.value:"";
            let Transitions = [];
            let Tval = DOM_T_list.value;
            if (Tval !== "") {
                let items = Tval.split("\n");
                for (let v of items) {
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
            }
            let loadParam = {BandChars: BandChars, InputChars: InputChars, BandValue: BandValue, EmptyChar: EmptyChar, StartState: DOM_StartZ.value, Transitions: Transitions};
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
                document.getElementById('turing-clear').disabled = false;
                document.getElementById('turing-example').disabled = false;
                document.getElementById('turing-load').disabled = false;
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
            document.getElementById('turing-clear').disabled = true;
            document.getElementById('turing-example').disabled = true;
            document.getElementById('turing-load').disabled = true;
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