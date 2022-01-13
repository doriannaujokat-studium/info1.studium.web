(() => {
    window.addEventListener('load', () => {
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

        const Transitions = new Map();

        const Band = new Map();
        let BandPos = -1;
        let CurrentState = 'z1';
        let emptyChar = '_';
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
            Band.clear();
            BandPos = -1;
            Transitions.clear();
            output.value = "";
            DOM_Z_list.innerHTML = "";
            DOM_Z_empty.style.display = "block";
            draw();
            {
                let BandChars = DOM_B_list.value!==""?DOM_B_list.value.split(""):[];
                emptyChar = DOM_emptyZ.value!==""?DOM_emptyZ.value:'_';
                if (!BandChars.includes(emptyChar)) {
                    alert("Das Leerzeichen ist nicht in der Bandmenge definiert.");
                    return;
                }
                let InputChars = DOM_E_list.value!==""?DOM_E_list.value.split(""):[];
                if (!InputChars.every(z => BandChars.includes(z))) {
                    alert("Alle Eingabecharaktere müssen in der Bandmenge definiert sein.");
                    return;
                }
                let BandValue = DOM_Band_list.value!==""?DOM_Band_list.value.split(""):[];
                if (!BandValue.every(z => InputChars.includes(z)||emptyChar === z)) {
                    alert("Der Anfangswert des Bandes kann nur aus Eingabecharakteren bestehen!");
                    return;
                }
                BandValue.forEach((z,i) => {
                    Band.set(i,z);
                });
                output.value = Array.from(Band.entries()).sort(([k1,v1],[k2,v2]) => k1 -k2).map(v => v[1]).join("");
                if (DOM_StartZ.value === "") {
                    alert("Ein Anfangszustand muss definiert sein!");
                    return;
                }
                CurrentState = DOM_StartZ.value;
            }
            let Tval = DOM_T_list.value;
            if (Tval !== "") {
                let items = Tval.split("\n");
                items.forEach(v => {
                    let imatch = v.match(new RegExp(`\\((\\w+),(.)\\)\\s*\\((\\w+),(.),([RLH])\\)`,'i'));
                    if (!imatch) return;
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
                    DOM_Z_empty.style.display = "none";
                    let ts = Transitions.get(imatch[1]);
                    if (!ts) {
                        ts = new Map();
                        Transitions.set(imatch[1],ts);
                    }
                    ts.set(imatch[2],[imatch[3],imatch[4],imatch[5]]);
                });
            }
            draw();
        }
        function performStep() {
            if (!Transitions.has(CurrentState) || !Transitions.get(CurrentState).has(getCurrentValue())) {
                if (simulating) {
                    document.getElementById('turing-play').click();
                }
                alert("Es kann kein weiterer Schritt gemacht werden!");
                return;
            }
            let ct = Transitions.get(CurrentState).get(getCurrentValue());
            CurrentState = ct[0];
            Band.set(BandPos,ct[1]);
            switch(ct[2]) {
                case 'L':
                    BandPos--;
                    break;
                case 'R':
                    BandPos++;
                    break;
                case 'H':
                    if (simulating) {
                        document.getElementById('turing-play').click();
                        break;
                    }
                    alert("Das Ende wurde erreicht!");
                    break;
            }
            output.value = Array.from(Band.entries()).sort(([k1,v1],[k2,v2]) => k1 -k2).map(v => v[1]).join("");
            draw();
        }

        document.getElementById('turing-reset').addEventListener('click', resetTuring);
        document.getElementById('turing-clear').addEventListener('click', () => {
            DOM_Band_list.value = "";
            DOM_E_list.value = "";
            DOM_B_list.value = "";
            DOM_StartZ.value = "";
            DOM_emptyZ.value = "";
            DOM_T_list.value = "";
            saveToLocal();
        });
        document.getElementById('turing-play').addEventListener('click', () => {
            if (simulating) {
                clearInterval(simulatingTimer);
                document.getElementById('turing-reset').disabled = false;
                document.getElementById('turing-clear').disabled = false;
                document.getElementById('turing-step').disabled = false;
                document.getElementById('turing-play').innerText = "Start";
                simulating = false;
                simulatingTimer = undefined;
                return;
            }
            simulating = true;
            document.getElementById('turing-reset').disabled = true;
            document.getElementById('turing-clear').disabled = true;
            document.getElementById('turing-step').disabled = true;
            document.getElementById('turing-play').innerText = "Stop";
            simulatingTimer = setInterval(performStep, 250);
        });
        document.getElementById('turing-step').addEventListener('click', performStep);

        function getCurrentValue() {
            return Band.get(BandPos)??emptyChar;
        }

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


            for (let i = BandPos - Math.round(middleElem[0]/50); middleElem[0] - (BandPos-i)*(rectSize+margin) < width + rectSize + margin; i++) {
                let value = Band.get(i)??emptyChar;
                drawRect(i,value,middleElem[0] - (BandPos-i)*(rectSize+margin),middleElem[1],rectSize,rectSize);
            }
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(middleElem[0],middleElem[1],rectSize,rectSize);
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