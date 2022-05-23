/**
 * @param {CanvasRenderingContext2D} context
 * @return {TuringRenderer}
 * @constructor
 */
function TuringRenderer(context) {
    if (!new.target) return new TuringRenderer(...arguments);
    this.context = context;
    this.rectSize = undefined;
    this.rectMargin = 10;
    this.enableTransitions = true;
    this.transitionDuration = 150;
    //this.animationCurve = 1;
    this.lastTimeStamp = undefined;
    this.requestingAnimationFrame = false;
    /** @type {?TuringMachine} */
    this.TuringMachine = undefined;
    this.currentPosition = undefined;
    this.nextPosition = undefined;
    this.transitionProgress = undefined;
    this.fixedScroll = undefined;
    this.scroll = 0;
    this.displayCenterCross = false;
    this.placeholder = undefined;
}

/**
 * @param {TuringMachine} turingMachine
 */
TuringRenderer.prototype.setTuringMachine = function setTuringMachine(turingMachine) {
    this.TuringMachine = turingMachine;
    this.update();
};

TuringRenderer.prototype.update = function update(timestamp) {
    if (!this.TuringMachine || !this.TuringMachine.isReady()) {
        this.currentPosition = undefined;
        this.nextPosition = undefined;
        this.transitionProgress = undefined;
        this.render();
        return;
    }
    const currentPosition = this.TuringMachine.getCurrentPosition();
    if (this.enableTransitions) {
        if (this.currentPosition === undefined) {
            this.currentPosition = currentPosition;
            this.nextPosition = undefined;
            this.transitionProgress = undefined;
        } else {
            if (this.currentPosition !== currentPosition && this.nextPosition !== currentPosition) {
                this.currentPosition = this.nextPosition??this.currentPosition;
                this.nextPosition = currentPosition;
                this.transitionProgress = 0;
            } else if (this.currentPosition !== currentPosition && this.nextPosition === currentPosition && timestamp !== undefined) {
                const delta = timestamp - (this.lastTimeStamp??timestamp);
                const progress = delta / this.transitionDuration;
                this.transitionProgress = Math.min(1, this.transitionProgress + progress);
                if (this.transitionProgress >= 1) {
                    this.currentPosition = this.nextPosition;
                    this.nextPosition = undefined;
                    this.transitionProgress = undefined;
                }
            } else if (this.currentPosition === currentPosition && this.nextPosition === currentPosition) {
                this.nextPosition = undefined;
                this.transitionProgress = undefined;
            }
        }
    } else {
        this.currentPosition = currentPosition;
        this.nextPosition = undefined;
        this.transitionProgress = undefined;
    }

    this.render();

    if (this.enableTransitions && this.transitionProgress !== undefined && (!this.requestingAnimationFrame || timestamp)) {
        this.lastTimeStamp = timestamp;
        this.requestingAnimationFrame = true;
        requestAnimationFrame(this.update.bind(this));
    } else if (this.requestingAnimationFrame && timestamp) {
        this.requestingAnimationFrame = false;
        this.lastTimeStamp = undefined;
    }
};

TuringRenderer.prototype.clear = function clear() {
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
};

TuringRenderer.prototype.render = function render() {
    this.clear();
    if (!this.TuringMachine || !this.TuringMachine.isReady()) {
        // Display not ready text
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.font = "28px sans-serif";
        this.context.fillStyle = '#ff0000';
        const text = this.placeholder??"";
        if (this.context.measureText(text).width > this.context.canvas.width) {
            this.context.font = "18px sans-serif";
        }
        this.context.fillText(text,this.context.canvas.width/2,this.context.canvas.height/2);
        return;
    }
    const width = this.context.canvas.width, height = this.context.canvas.height;
    const rectMargin = this.rectMargin??0;
    const rectMarginV = Math.max(20, rectMargin);
    const rectSize = Math.min(height, (this.rectSize??height) - Math.max(rectMargin,rectMarginV) * 2);
    const middle = [width/2,height/2];
    const focusElement = this.scroll??0;
    const currentViewpoint = [this.fixedScroll??0, 0];
    const viewportBounds = [[currentViewpoint[0]-width/2,currentViewpoint[1]-height/2],[currentViewpoint[0]+width/2,currentViewpoint[1]+height/2]];

    // The element currently shown on coordinates [0,0] including animation disposition
    const currentPosition = this.currentPosition + (this.nextPosition !== undefined ? TuringRenderer.CubicBezierCurve(this.transitionProgress??0,.86,.22,.35,.72)*(this.nextPosition - this.currentPosition): 0);

    const firstVisibleElement = Math.floor(viewportBounds[0][0]/(rectSize+rectMargin)+currentPosition);
    const lastVisibleElement = Math.ceil(viewportBounds[1][0]/(rectSize+rectMargin)+currentPosition);

    for (let i = firstVisibleElement; i <= lastVisibleElement; i++) {
        this.renderCharacter(i, this.TuringMachine.getCharacterAtPosition(i),(i - currentPosition)*(rectSize+rectMargin) - viewportBounds[0][0], middle[1], rectSize, rectSize);
        // Draw red rectangle around current element
        if (i === this.currentPosition) this.renderRect((i - currentPosition)*(rectSize+rectMargin) - viewportBounds[0][0], middle[1], rectSize, rectSize);
        //if (i === 0) this.renderFocusRect((i - currentPosition)*(rectSize+rectMargin) - viewportBounds[0][0], middle[1], rectSize, rectSize);
        // Display index of element every 5 elements
        if (i%5 === 0) this.renderPositionLabel(i, (i - currentPosition)*(rectSize+rectMargin) - viewportBounds[0][0], middle[1], rectSize, rectSize);
    }
    // Display red cross at middle of screen if enabled
    if (this.displayCenterCross) this.renderCenterCross(middle[0], middle[1], width, height);
};

TuringRenderer.prototype.renderCharacter = function renderRect(position, value, x, y, width, height, color, textColor) {
    this.context.fillStyle = color ?? Math.abs(position)%2===1?'#000000':'#89ba17';
    this.context.fillRect(x-width/2,y-height/2,width,height);
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.font = "24px sans-serif";
    this.context.fillStyle = textColor ?? Math.abs(position)%2===1?'#89ba17':'#000000';
    this.context.fillText(value,x,y);
};

TuringRenderer.prototype.renderRect = function renderRect (x, y, width, height, color, thickness = 1) {
    this.context.strokeStyle = '#ff0000';
    this.context.lineWidth = thickness??1;
    this.context.strokeRect(x-width/2,y-width/2,width,height);

    this.context.textAlign = "center";
    this.context.textBaseline = "bottom";
    this.context.font = "16px sans-serif";
    this.context.fillStyle = '#ff0000';
    this.context.fillText(this.TuringMachine.getCurrentState(),x,y-height/2);
};

TuringRenderer.prototype.renderFocusRect = function renderFocusRect (x, y, width, height, color, thickness = 2) {
    this.context.strokeStyle = window.getComputedStyle(this.context.canvas).getPropertyValue('color');
    this.context.lineWidth = thickness??2;
    this.context.strokeRect(x-width/2,y-width/2,width,height);
};

TuringRenderer.prototype.renderPositionLabel = function renderPositionLabel (position, x, y, width, height, color) {
    this.context.fillStyle = window.getComputedStyle(this.context.canvas).getPropertyValue('color');
    this.context.textAlign = "center";
    this.context.textBaseline = "top";
    this.context.font = "16px sans-serif";
    this.context.fillText(position,x,y+height/2+4);
};

TuringRenderer.prototype.renderCenterCross = function renderCenterCross(x, y, width, height, color = '#ff0000') {
    this.context.strokeStyle = color??'#ff0000';
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.context.moveTo(x-width/2,y);
    this.context.lineTo(x+width/2,y);
    this.context.moveTo(x,y-height/2);
    this.context.lineTo(x,y+height/2);
    this.context.stroke();
};

TuringRenderer.CubicBezierCurve = function CubicBezierCurve(t = 0, x1 = 0.42, y1 = 0, x2 = 0.58, y2 = 1) {
    return ((1-t)**3)*0 + 3*((1-t)**2)*t*y1 + 3*(1-t)*(t**2)*y2 + (t**3)*1;
};

export default TuringRenderer;