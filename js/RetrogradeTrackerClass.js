const signs = {
    aries: '♈︎', taurus: '♉︎', gemini: '♊︎', cancer: '♋︎', leo: '♌︎', virgo: '♍︎',
    libra: '♎︎', scorpio: '♏︎', sagittarius: '♐︎', capricorn: '♑︎', aquarius: '♒︎', pisces: '♓︎'
};

const planets = {
    mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
    uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷'
};

// Helper function to lighten a hex color for the gradient highlight
function lightenColor(hex, percent) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const factor = 1 + (percent / 100);
    const newR = Math.min(255, Math.round(r * factor));
    const newG = Math.min(255, Math.round(g * factor));
    const newB = Math.min(255, Math.round(b * factor));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

class RetrogradeTrackerClass {
    constructor(config) {
        this.config = config;
        this.dataObject = config.data;
        this.parentContainer = config.parentContainer;
        this.buffer = [];
        this.activeBuffer = 0;

        // Verify parentContainer
        if (!this.parentContainer) {
            console.error('Parent container not found:', this.parentContainer);
            throw new Error('Parent container is required');
        }
        if (this.dataObject.debug === true) {
            console.log('Parent container:', {
                id: this.parentContainer.id,
                width: this.parentContainer.clientWidth,
                height: this.parentContainer.clientHeight
            });
        }

        // Margin configuration
        this.margin = {
            left: this.dataObject.margin?.left !== undefined ? this.dataObject.margin.left : 40,
            top: this.dataObject.margin?.top !== undefined ? this.dataObject.margin.top : 40,
            right: this.dataObject.margin?.right !== undefined ? this.dataObject.margin.right : 40,
            bottom: this.dataObject.margin?.bottom !== undefined ? this.dataObject.margin.bottom : 40
        };
        this.rulerHeight = 20;
        this.rulerMargin = this.dataObject.rulerMargin !== undefined ? this.dataObject.rulerMargin : 32;
        this.arrowSize = 30;
        this.degreeTextMargin = this.dataObject.degreeTextMargin !== undefined ? this.dataObject.degreeTextMargin : 24;
        this.annotationColor = this.dataObject.annotationColor || '#444444';

        // Layout constants
        this.topLineY = this.margin.top + this.rulerHeight + this.rulerMargin;
        this.bottomLineY = this.parentContainer.clientHeight - this.margin.bottom - this.arrowSize / 2;
        this.lineSpacing = (this.bottomLineY - this.topLineY) / 2;
        this.arcRadius = this.lineSpacing / 2;
        this.middleLineY = this.topLineY + this.lineSpacing;
        this.shadowStartX = this.margin.left + this.arcRadius;
        this.shadowEndX = this.parentContainer.clientWidth - this.margin.right - this.arcRadius;
        this.topArrowX = this.shadowStartX + 64;
        this.originalBottomArrowX = this.shadowEndX - 64;
        this.bottomArrowX = this.originalBottomArrowX + 30;
        this.bottomArrowLeftX = this.bottomArrowX - 30;
        this.adjustedLeftEndpoint = this.topArrowX + this.arcRadius;
        this.adjustedRightEndpoint = this.bottomArrowLeftX - this.arcRadius;
        this.topRightArcCenterX = this.adjustedRightEndpoint;
        this.topRightArcCenterY = this.topLineY + this.arcRadius;
        this.bottomLeftArcCenterX = this.adjustedLeftEndpoint;
        this.bottomLeftArcCenterY = this.middleLineY + this.arcRadius;

        // Ball and tooltip tracking
        this.planetBall = null;
        this.transitBalls = [];
        this.hoveredBall = null;
        this.currentTooltip = null;
        this.isMouseOverBall = false;
        this.isMouseOverTooltip = false;
        this.tooltipCloseTimeout = null;
        this.tooltipBall = null;

        // Ruler tracker
        this.trackerX = null;

        // Calculate transits
        this.dataObject.transits = this.calculateTransits();
        if (this.dataObject.debug === true) {
            console.log('Generated transits:', this.dataObject.transits.map(t => ({
                date: t.date.toISOString(),
                sign: t.sign
            })));
        }

        // Create canvases
        for (let i = 0; i < 2; i++) {
            let canvas = document.createElement('canvas');
            canvas.width = this.parentContainer.clientWidth;
            canvas.height = this.parentContainer.clientHeight;
            canvas.style.zIndex = i === 0 ? '1' : '2';
            this.buffer.push(canvas);
            try {
                this.parentContainer.appendChild(canvas);
                if (this.dataObject.debug === true) {
                    console.log(`Canvas ${i} created:`, {
                        width: canvas.width,
                        height: canvas.height,
                        zIndex: canvas.style.zIndex
                    });
                }
            } catch (error) {
                console.error(`Failed to append canvas ${i}:`, error);
            }
        }

        // Update tooltip state with debounce
        this.updateTooltipState = () => {
            if (this.tooltipCloseTimeout) {
                clearTimeout(this.tooltipCloseTimeout);
            }
            this.tooltipCloseTimeout = setTimeout(() => {
                if (!this.isMouseOverBall && !this.isMouseOverTooltip && this.currentTooltip) {
                    this.currentTooltip.remove();
                    this.currentTooltip = null;
                    this.tooltipBall = null;
                    this.isMouseOverTooltip = false;
                    this.isMouseOverBall = false;
                    if (this.dataObject.debug === true) {
                        console.log('Tooltip removed; mouse outside ball and tooltip');
                    }
                }
            }, 100);
        };

        // Click handler for parent container
        const handleClick = (event) => {
            const activeCanvas = this.buffer[this.activeBuffer];
            const rect = activeCanvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            if (this.dataObject.debug === true) {
                console.log('Click detected:', {
                    clickX,
                    clickY,
                    canvasRect: {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    },
                    planetBall: this.planetBall ? {
                        x: this.planetBall.x,
                        y: this.planetBall.y,
                        radius: this.planetBall.radius
                    } : null,
                    transitBalls: this.transitBalls.map(b => ({
                        x: b.x,
                        y: b.y,
                        radius: b.radius,
                        sign: b.sign
                    }))
                });
            }

            // Check planet ball (circular hitbox)
            let clicked = false;
            if (this.planetBall) {
                const dx = clickX - this.planetBall.x;
                const dy = clickY - this.planetBall.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (this.dataObject.debug === true) {
                    console.log('Checking planet ball:', {
                        clickX,
                        clickY,
                        planetX: this.planetBall.x,
                        planetY: this.planetBall.y,
                        distance,
                        radius: this.planetBall.radius
                    });
                }
                if (distance <= this.planetBall.radius) {
                    if (this.dataObject.debug === true) {
                        console.log('Planet ball clicked');
                    }
                    this.tooltipBall = this.planetBall;
                    this.createTooltip({ type: 'planet', ...this.planetBall }, event);
                    clicked = true;
                    return;
                }
            }

            // Check transit balls (circular hitbox)
            for (let i = 0; i < this.transitBalls.length; i++) {
                const ball = this.transitBalls[i];
                const dx = clickX - ball.x;
                const dy = clickY - ball.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (this.dataObject.debug === true) {
                    console.log(`Checking transit ball ${i}:`, {
                        clickX,
                        clickY,
                        ballX: ball.x,
                        ballY: ball.y,
                        distance,
                        radius: ball.radius,
                        sign: ball.sign
                    });
                }
                if (distance <= ball.radius) {
                    if (this.dataObject.debug === true) {
                        console.log(`Transit ball ${i} clicked`, { sign: ball.sign });
                    }
                    this.tooltipBall = ball;
                    this.createTooltip({ type: 'transit', ...ball, index: i }, event);
                    clicked = true;
                    return;
                }
            }

            // Remove tooltip if clicking outside
            if (!clicked && this.currentTooltip) {
                this.currentTooltip.remove();
                this.currentTooltip = null;
                this.tooltipBall = null;
                this.isMouseOverTooltip = false;
                this.isMouseOverBall = false;
                clearTimeout(this.tooltipCloseTimeout);
                if (this.dataObject.debug === true) {
                    console.log('Tooltip removed on outside click');
                }
            } else if (!clicked && this.dataObject.debug === true) {
                console.log('No ball clicked; outside balls');
            }
        };

        // Check if mouse is over the tooltip’s ball hitbox (slightly extended)
        const checkBallHitbox = (mouseX, mouseY) => {
            const hitboxPadding = 2;
            if (this.tooltipBall) {
                const dx = mouseX - this.tooltipBall.x;
                const dy = mouseY - this.tooltipBall.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const isOverBall = distance <= this.tooltipBall.radius + hitboxPadding;
                if (this.dataObject.debug === true) {
                    console.log('Checking tooltip ball hitbox:', {
                        mouseX,
                        mouseY,
                        ballX: this.tooltipBall.x,
                        ballY: this.tooltipBall.y,
                        distance,
                        radius: this.tooltipBall.radius,
                        isOverBall
                    });
                }
                return isOverBall;
            }
            return false;
        };

        // Mouse event handlers
        this.buffer.forEach((canvas, index) => {
            let renderTimeout = null;
            canvas.addEventListener('mousemove', (event) => {
                if (renderTimeout) clearTimeout(renderTimeout);
                renderTimeout = setTimeout(() => {
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const mouseY = event.clientY - rect.top;
                    if (this.dataObject.debug === true) {
                        console.log(`Canvas ${index} mousemove:`, { mouseX, mouseY });
                    }
                    this.detectHover(mouseX, mouseY);
                    this.isMouseOverBall = checkBallHitbox(mouseX, mouseY);

                    // Ruler tracker logic
                    if (
                        mouseY >= this.margin.top &&
                        mouseY <= canvas.height - this.margin.bottom &&
                        mouseX >= this.rulerStartX &&
                        mouseX <= this.rulerEndX
                    ) {
                        this.trackerX = mouseX;
                        if (this.dataObject.debug === true) {
                            console.log('Ruler tracker active:', {
                                trackerX: this.trackerX,
                                mouseY,
                                verticalRange: { top: this.margin.top, bottom: canvas.height - this.margin.bottom }
                            });
                        }
                    } else {
                        this.trackerX = null;
                        if (this.dataObject.debug === true) {
                            console.log('Ruler tracker inactive:', {
                                mouseX,
                                mouseY,
                                verticalRange: { top: this.margin.top, bottom: canvas.height - this.margin.bottom },
                                horizontalRange: { start: this.rulerStartX, end: this.rulerEndX }
                            });
                        }
                    }

                    if (this.dataObject.debug === true && this.currentTooltip) {
                        console.log('Mouse state:', {
                            isMouseOverBall: this.isMouseOverBall,
                            isMouseOverTooltip: this.isMouseOverTooltip,
                            tooltipBall: this.tooltipBall ? {
                                x: this.tooltipBall.x,
                                y: this.tooltipBall.y,
                                type: this.tooltipBall.type || 'transit'
                            } : null
                        });
                    }
                    this.render();
                }, 16); // ~60fps debounce
            });

            canvas.addEventListener('mouseover', (event) => {
                const rect = canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                this.isMouseOverBall = checkBallHitbox(mouseX, mouseY);
                if (this.dataObject.debug === true && this.currentTooltip) {
                    console.log('Canvas mouseover; mouse over tooltip ball:', this.isMouseOverBall);
                }
            });

            canvas.addEventListener('mouseout', (event) => {
                const relatedTarget = event.relatedTarget;
                this.isMouseOverBall = false;
                this.trackerX = null;
                if (relatedTarget !== this.currentTooltip && !this.currentTooltip?.contains(relatedTarget)) {
                    this.updateTooltipState();
                }
                if (this.dataObject.debug === true) {
                    console.log('Canvas mouseout', {
                        relatedTarget: relatedTarget ? relatedTarget.id || relatedTarget.tagName : 'null'
                    });
                }
                this.hoveredBall = null;
                canvas.style.cursor = 'default';
                this.render();
            });

            canvas.addEventListener('mouseleave', () => {
                this.trackerX = null;
                this.hoveredBall = null;
                canvas.style.cursor = 'default';
                if (this.dataObject.debug === true) {
                    console.log('Canvas mouseleave; tracker cleared');
                }
                this.render();
            });
        });

        // Attach click handler to parent container
        this.parentContainer.removeEventListener('click', this.parentContainer._clickHandler);
        this.parentContainer._clickHandler = handleClick;
        this.parentContainer.addEventListener('click', handleClick);
        if (this.dataObject.debug === true) {
            console.log('Click handler attached to parent container');
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.buffer.forEach(canvas => {
                canvas.width = this.parentContainer.clientWidth;
                canvas.height = this.parentContainer.clientHeight;
            });
            this.topLineY = this.margin.top + this.rulerHeight + this.rulerMargin;
            this.bottomLineY = this.parentContainer.clientHeight - this.margin.bottom - this.arrowSize / 2;
            this.lineSpacing = (this.bottomLineY - this.topLineY) / 2;
            this.arcRadius = this.lineSpacing / 2;
            this.middleLineY = this.topLineY + this.lineSpacing;
            this.shadowStartX = this.margin.left + this.arcRadius;
            this.shadowEndX = this.parentContainer.clientWidth - this.margin.right - this.arcRadius;
            this.topArrowX = this.shadowStartX + 64;
            this.originalBottomArrowX = this.shadowEndX - 64;
            this.bottomArrowX = this.originalBottomArrowX + 30;
            this.bottomArrowLeftX = this.bottomArrowX - 30;
            this.adjustedLeftEndpoint = this.topArrowX + this.arcRadius;
            this.adjustedRightEndpoint = this.bottomArrowLeftX - this.arcRadius;
            this.topRightArcCenterX = this.adjustedRightEndpoint;
            this.topRightArcCenterY = this.topLineY + this.arcRadius;
            this.bottomLeftArcCenterX = this.adjustedLeftEndpoint;
            this.bottomLeftArcCenterY = this.middleLineY + this.arcRadius;
            this.render();
        });

        this.render();
    }

    parseDegree(degreeStr) {
        const match = degreeStr.match(/(\d+)°\s*(\w+)\s*(\d+)'/);
        if (!match) return { degree: 0, sign: '' };
        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[3]) / 60;
        return { degree: degrees + minutes, sign: match[2].toLowerCase() };
    }

    signToContinuous(degree, sign) {
        const zodiacSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
        const signIndex = zodiacSigns.indexOf(sign.toLowerCase());
        return signIndex * 30 + degree;
    }

    transitionDateFromDegree(degree, state) {
        const shadowStartMs = this.dataObject.retrogradeShadowStart.getTime();
        const retroStartMs = this.dataObject.retrogradeStart.getTime();
        const retroEndMs = this.dataObject.retrogradeEnd.getTime();
        const shadowEndMs = this.dataObject.retrogradeShadowEnd.getTime();

        const startDegree = this.signToContinuous(
            this.parseDegree(this.dataObject.retrogradeStartDegree).degree,
            this.parseDegree(this.dataObject.retrogradeStartDegree).sign
        );
        let endDegree = this.signToContinuous(
            this.parseDegree(this.dataObject.retrogradeEndDegree).degree,
            this.parseDegree(this.dataObject.retrogradeEndDegree).sign
        );
        if (endDegree > startDegree) {
            endDegree -= 360;
        }

        let startTimeMs, endTimeMs, startDeg, endDeg, direction;

        if (state === 'pre-retrograde') {
            startTimeMs = shadowStartMs;
            endTimeMs = retroStartMs;
            startDeg = endDegree;
            endDeg = startDegree;
            direction = 'forward';
        } else if (state === 'retrograde') {
            startTimeMs = retroStartMs;
            endTimeMs = retroEndMs;
            startDeg = startDegree;
            endDeg = endDegree;
            direction = 'backward';
        } else if (state === 'post-retrograde') {
            startTimeMs = retroEndMs;
            endTimeMs = shadowEndMs;
            startDeg = endDegree;
            endDeg = startDegree;
            direction = 'forward';
        } else {
            throw new Error(`Invalid state: ${state}`);
        }

        let adjustedDegree = degree;
        if (direction === 'forward') {
            if (adjustedDegree < startDeg) adjustedDegree += 360;
            if (adjustedDegree > endDeg + 360) adjustedDegree -= 360;
        } else {
            if (adjustedDegree > startDeg) adjustedDegree -= 360;
            if (adjustedDegree < endDeg - 360) adjustedDegree += 360;
        }

        const durationMs = endTimeMs - startTimeMs;
        let degreeProgress;
        if (direction === 'forward') {
            degreeProgress = (adjustedDegree - startDeg) / (endDeg - startDeg);
        } else {
            degreeProgress = (startDeg - adjustedDegree) / (startDeg - endDeg);
        }
        const transitTimeMs = startTimeMs + degreeProgress * durationMs;
        const transitDate = new Date(transitTimeMs);

        if (this.dataObject.debug === true) console.log('transitionDateFromDegree:', {
            degree,
            adjustedDegree,
            state,
            direction,
            startDeg,
            endDeg,
            degreeProgress,
            startTimeMs,
            endTimeMs,
            durationMs,
            transitTimeMs,
            transitDate: transitDate.toISOString()
        });

        return transitDate;
    }

    rulerScale(retrogradeStartDegree, retrogradeEndDegree, highlightStartX, highlightEndX, rulerStartX, rulerEndX) {
        const zodiacSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
        const start = this.parseDegree(retrogradeStartDegree);
        const end = this.parseDegree(retrogradeEndDegree);

        let startDegreeContinuous = this.signToContinuous(start.degree, start.sign);
        let endDegreeContinuous = this.signToContinuous(end.degree, end.sign);
        if (this.dataObject.debug === true) console.log('rulerScale inputs:', { retrogradeStartDegree, retrogradeEndDegree, highlightStartX, highlightEndX, rulerStartX, rulerEndX, startDegreeContinuous, endDegreeContinuous });

        if (endDegreeContinuous > startDegreeContinuous) {
            endDegreeContinuous -= 360;
        }

        let retrogradeDegreeSpan = startDegreeContinuous - endDegreeContinuous;
        while (retrogradeDegreeSpan < 0) { retrogradeDegreeSpan += 360; }

        const highlightWidth = highlightStartX - highlightEndX;
        const pixelsPerDegree = highlightWidth / retrogradeDegreeSpan;

        const rulerStartDegree = startDegreeContinuous + 30;
        const ticks = [];
        let continuousDegree;

        for (let degree = Math.ceil(rulerStartDegree); degree >= Math.floor(startDegreeContinuous); degree -= 0.25) {
            continuousDegree = degree % 360;
            if (continuousDegree <= 0) continuousDegree += 360;
            const signIndex = Math.floor(continuousDegree / 30) % 12;
            const sign = zodiacSigns[signIndex];
            const displayDegree = continuousDegree % 30 || 30;

            let tickmarkType, label = null;
            if (this.dataObject.debug === true) console.log('Aries tick:', { degree, continuousDegree, signIndex, sign, displayDegree });

            if (Number.isInteger(degree)) {
                tickmarkType = 'major';
                label = `${Math.floor(displayDegree)}° ${signs[sign]}`;
            } else if (Math.abs(degree % 1 - 0.5) < 0.001) {
                tickmarkType = 'half';
            } else {
                tickmarkType = 'minor';
            }

            const relativeDegree = startDegreeContinuous - continuousDegree;
            const x = highlightStartX - (relativeDegree * pixelsPerDegree);

            ticks.push({
                tickmarkX: x,
                tickmarkType: tickmarkType,
                label: label
            });
        }

        for (let degree = Math.floor(startDegreeContinuous); degree >= Math.ceil(endDegreeContinuous - 1); degree -= 0.25) {
            if (continuousDegree < 0) continuousDegree += 360;
            continuousDegree = degree % 360;

            const continuousDegreeAbs = (continuousDegree < 0 ? 360 : 0) + continuousDegree;

            const signIndex = Math.floor(continuousDegreeAbs / 30) % 12;
            const sign = zodiacSigns[signIndex];
            const displayDegree = continuousDegree % 30 || 0;

            let tickmarkType, label = null;

            if (Number.isInteger(degree)) {
                tickmarkType = 'major';
                label = `${Math.floor(displayDegree)}° ${signs[sign]}`;
            } else if (Math.abs(degree % 1 - 0.5) < 0.001) {
                tickmarkType = 'half';
            } else {
                tickmarkType = 'minor';
            }

            const relativeDegree = startDegreeContinuous - continuousDegree;
            const x = highlightStartX - (relativeDegree * pixelsPerDegree);
            if (this.dataObject.debug === true) console.log('Retrograde tick:', { degree, continuousDegree, signIndex, sign, displayDegree, x });
            ticks.push({
                tickmarkX: x,
                tickmarkType: tickmarkType,
                label: label
            });
        }

        return ticks
            .filter(tick => tick.tickmarkX >= rulerStartX && tick.tickmarkX <= rulerEndX)
            .sort((a, b) => a.tickmarkX - b.tickmarkX);
    }

    calculateTransits() {
        const transits = [];
        const shadowStart = this.dataObject.retrogradeShadowStart;
        const shadowEnd = this.dataObject.retrogradeShadowEnd;
        const retroStart = this.dataObject.retrogradeStart;
        const retroEnd = this.dataObject.retrogradeEnd;

        const zodiacSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

        const cusps = [0]; // Only include the 0° Aries/30° Pisces cusp

        if (this.dataObject.debug === true) console.log('Cusps:', cusps);

        cusps.forEach(cuspDegree => {
            let normalizedCusp = cuspDegree % 360;
            if (normalizedCusp < 0) normalizedCusp += 360;
            const signIndex = Math.floor(normalizedCusp / 30) % 12;
            const baseSign = zodiacSigns[signIndex];
            const prevSign = zodiacSigns[(signIndex - 1 + 12) % 12];

            const preShadowDate = this.transitionDateFromDegree(cuspDegree, 'pre-retrograde');
            if (preShadowDate >= shadowStart && preShadowDate <= retroStart) {
                transits.push({ date: preShadowDate, sign: baseSign });
            }

            const retrogradeDate = this.transitionDateFromDegree(cuspDegree, 'retrograde');
            if (retrogradeDate >= retroStart && retrogradeDate <= retroEnd) {
                transits.push({ date: retrogradeDate, sign: prevSign });
            }

            const postShadowDate = this.transitionDateFromDegree(cuspDegree, 'post-retrograde');
            if (postShadowDate >= retroEnd && postShadowDate <= shadowEnd) {
                transits.push({ date: postShadowDate, sign: baseSign });
            }
        });

        if (this.dataObject.transits && Array.isArray(this.dataObject.transits)) {
            transits.push(...this.dataObject.transits);
        }

        if (this.dataObject.debug === true) console.log('Transits before deduplication:', transits.map(t => ({ date: t.date.toISOString(), sign: t.sign })));

        transits.sort((a, b) => a.date - b.date);
        const uniqueTransits = [];
        const seenKeys = new Set();
        transits.forEach(transit => {
            const dateKey = `${transit.date.toISOString()}:${transit.sign}`;
            if (!seenKeys.has(dateKey)) {
                seenKeys.add(dateKey);
                uniqueTransits.push(transit);
            }
        });

        return uniqueTransits;
    }

    spaceBalls(mass, orbiter, distance) {
        const totalDistance = mass.radius + distance + orbiter.radius;
        const dx = orbiter.x - mass.x;
        const dy = orbiter.initialY - mass.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        const debugInfo = {
            transitX: orbiter.x,
            transitY: orbiter.initialY,
            planetX: mass.x,
            planetY: mass.y,
            dx,
            dyInitial: Math.abs(dy),
            yThreshold: totalDistance,
            adjustmentType: 'none',
            adjustmentValue: null,
            isArcTransit: false,
            arcQuarter: null,
            direction: null,
            newDistance: null,
            arcCenterY: null,
            yAbove: null,
            yBelow: null
        };

        if (currentDistance >= totalDistance - 0.1) {
            debugInfo.adjustmentType = 'none';
            if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
            return { type: 'none', value: NaN };
        }

        const isRetrogradeStart = orbiter.transitDate &&
            Math.abs(orbiter.transitDate.getTime() - this.dataObject.retrogradeStart.getTime()) < 1000;
        const isRetrogradeEnd = orbiter.transitDate &&
            Math.abs(orbiter.transitDate.getTime() - this.dataObject.retrogradeEnd.getTime()) < 1000;
        const isPreRetrograde = orbiter.transitDate &&
            orbiter.transitDate.getTime() < this.dataObject.retrogradeStart.getTime();
        const isPostRetrograde = orbiter.transitDate &&
            orbiter.transitDate.getTime() > this.dataObject.retrogradeEnd.getTime();
        const isDuringRetrograde = orbiter.transitDate &&
            orbiter.transitDate.getTime() >= this.dataObject.retrogradeStart.getTime() &&
            orbiter.transitDate.getTime() <= this.dataObject.retrogradeEnd.getTime();

        if (isRetrogradeStart) {
            debugInfo.adjustmentType = 'x-right';
            debugInfo.adjustmentValue = totalDistance;
            if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
            return { type: 'x', value: totalDistance };
        } else if (isRetrogradeEnd) {
            debugInfo.adjustmentType = 'x-left';
            debugInfo.adjustmentValue = -totalDistance;
            if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
            return { type: 'x', value: -totalDistance };
        }

        const isArcTransit = (
            (orbiter.initialY > this.topLineY + 1 && orbiter.initialY <= this.topRightArcCenterY + 5) ||
            (orbiter.initialY > this.middleLineY + 1 && orbiter.initialY <= this.bottomLeftArcCenterY + 5)
        );
        debugInfo.isArcTransit = isArcTransit;

        let direction;
        if (isPreRetrograde && orbiter.x > this.adjustedRightEndpoint) {
            direction = 'up';
        } else if (isPostRetrograde && orbiter.x < this.adjustedLeftEndpoint) {
            direction = 'down';
        } else if (isDuringRetrograde) {
            direction = orbiter.x < this.adjustedLeftEndpoint ? 'up' : 'down';
        } else {
            direction = orbiter.initialY < mass.y ? 'up' : 'down';
        }
        debugInfo.direction = direction;

        if (isArcTransit) {
            const arcCenterX = orbiter.x > this.adjustedRightEndpoint ? this.topRightArcCenterX : this.bottomLeftArcCenterX;
            const arcCenterY = orbiter.x > this.adjustedRightEndpoint ? this.topRightArcCenterY : this.bottomLeftArcCenterY;
            const arcQuarter = orbiter.x > this.adjustedRightEndpoint ?
                (orbiter.initialY <= arcCenterY ? 'top-right' : 'bottom-right') :
                (orbiter.initialY <= arcCenterY ? 'top-left' : 'bottom-left');
            debugInfo.arcQuarter = arcQuarter;
            debugInfo.arcCenterY = arcCenterY;

            const dxArc = orbiter.x - arcCenterX;
            if (Math.abs(dxArc) >= this.arcRadius - 0.1) {
                const newDySquared = totalDistance * totalDistance - dx * dx;
                if (newDySquared < 0) {
                    debugInfo.adjustmentType = 'none';
                    if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
                    return { type: 'none', value: NaN };
                }
                const newDyMagnitude = Math.sqrt(newDySquared);
                const newY = mass.y + (direction === 'up' ? -newDyMagnitude : newDyMagnitude);
                debugInfo.adjustmentType = 'y-straight-fallback';
                debugInfo.adjustmentValue = newY - orbiter.initialY;
                debugInfo.newDistance = Math.sqrt(dx * dx + (newY - mass.y) ** 2);
                if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
                return { type: 'y', value: newY };
            }

            const dyArc = Math.sqrt(this.arcRadius ** 2 - dxArc ** 2);
            const yAbove = arcCenterY - dyArc;
            const yBelow = arcCenterY + dyArc;
            debugInfo.yAbove = yAbove;
            debugInfo.yBelow = yBelow;

            let newY = direction === 'up' ? yAbove : yBelow;
            debugInfo.adjustmentType = 'y-arc-snap';

            const newDistance = Math.sqrt(dx * dx + (newY - mass.y) ** 2);
            if (Math.abs(newDistance - totalDistance) > 0.1) {
                const newDySquared = totalDistance * totalDistance - dx * dx;
                if (newDySquared < 0) {
                    debugInfo.adjustmentType = 'none';
                    if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
                    return { type: 'none', value: NaN };
                }
                const newDyMagnitude = Math.sqrt(newDySquared);
                newY = mass.y + (direction === 'up' ? -newDyMagnitude : newDyMagnitude);
                debugInfo.adjustmentType = 'y-straight-fallback';
            }

            debugInfo.newDistance = Math.sqrt(dx * dx + (newY - mass.y) ** 2);
            debugInfo.adjustmentValue = newY - orbiter.initialY;
            if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
            return { type: 'y', value: newY };
        } else {
            const newDySquared = totalDistance * totalDistance - dx * dx;
            if (newDySquared < 0) {
                debugInfo.adjustmentType = 'none';
                if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
                return { type: 'none', value: NaN };
            }
            const newDyMagnitude = Math.sqrt(newDySquared);
            const newY = mass.y + (direction === 'up' ? -newDyMagnitude : newDyMagnitude);
            debugInfo.adjustmentType = 'y-straight';
            debugInfo.adjustmentValue = newY - orbiter.initialY;
            debugInfo.newDistance = Math.sqrt(dx * dx + (newY - mass.y) ** 2);
            if (this.dataObject.debug === true) console.log('spaceBalls:', debugInfo);
            return { type: 'y', value: newY };
        }
    }

    plotDate(date, index, totalInRange) {
        const width = this.buffer[this.activeBuffer].width;
        const height = this.buffer[this.activeBuffer].height;
        const margin = this.margin;
        const arrowSize = this.arrowSize;
        const rulerHeight = 20;
        const rulerMargin = this.rulerMargin;
        const topLineY = margin.top + rulerHeight + rulerMargin;
        const bottomLineY = height - margin.bottom - arrowSize / 2;
        const lineSpacing = (bottomLineY - topLineY) / 2;
        const arcRadius = lineSpacing / 2;
        const middleLineY = topLineY + lineSpacing;

        // Calculate key x-coordinates
        const shadowStartX = margin.left + arcRadius;
        const retrogradeStartX = this.toPosition(this.dataObject.retrogradeStart);
        const retrogradeEndX = this.toPosition(this.dataObject.retrogradeEnd);
        const shadowEndX = width - margin.right - arcRadius;

        const topArrowX = shadowStartX + 64;
        const topArrowLeftX = topArrowX - arrowSize;
        const originalBottomArrowX = shadowEndX - 64;
        const bottomArrowX = originalBottomArrowX + arrowSize;
        const bottomArrowLeftX = bottomArrowX - arrowSize;

        // Adjusted endpoints for lines and arcs
        const adjustedLeftEndpoint = topArrowX + arcRadius;
        const adjustedRightEndpoint = bottomArrowLeftX - arcRadius;
        const bottomLeftArcOuterX = adjustedLeftEndpoint - arcRadius;

        // Arc centers
        const topRightArcCenterX = adjustedRightEndpoint;
        const topRightArcCenterY = topLineY + arcRadius;
        const bottomLeftArcCenterX = adjustedLeftEndpoint;
        const bottomLeftArcCenterY = middleLineY + arcRadius;

        let x, y;

        const dateMs = date.getTime();
        const shadowStartMs = this.dataObject.retrogradeShadowStart.getTime();
        const retroStartMs = this.dataObject.retrogradeStart.getTime();
        const retroEndMs = this.dataObject.retrogradeEnd.getTime();
        const shadowEndMs = this.dataObject.retrogradeShadowEnd.getTime();

        const getArcY = (x, centerX, centerY, radius, quarter) => {
            const dx = x - centerX;
            if (Math.abs(dx) > radius) return null;
            const dy = Math.sqrt(radius * radius - dx * dx);
            return quarter.includes('top') ? centerY - dy : centerY + dy;
        };

        const debugInfo = {
            date: date.toISOString(),
            x: null,
            y: null,
            fraction: null,
            arcOverlap: false,
            arcType: null,
            period: null
        };

        if (Math.abs(dateMs - retroStartMs) < 1000) {
            x = adjustedRightEndpoint + arcRadius;
            y = (topLineY + middleLineY) / 2;
            debugInfo.period = 'retrogradeStart';
        } else if (Math.abs(dateMs - retroEndMs) < 1000) {
            x = adjustedLeftEndpoint - arcRadius;
            y = (middleLineY + bottomLineY) / 2;
            debugInfo.period = 'retrogradeEnd';
        } else if (dateMs < shadowStartMs) {
            const segmentWidth = topArrowLeftX - margin.left;
            x = margin.left + segmentWidth / 2;
            y = topLineY;
            debugInfo.period = 'beforeShadowStart';
        } else if (dateMs >= shadowStartMs && dateMs < retroStartMs) {
            const durationMs = retroStartMs - shadowStartMs;
            const fraction = Math.min(1, (dateMs - shadowStartMs) / durationMs);
            x = topArrowX + fraction * (adjustedRightEndpoint + arcRadius - topArrowX);
            y = topLineY;
            if (x > adjustedRightEndpoint) {
                const arcY = getArcY(x, topRightArcCenterX, topRightArcCenterY, arcRadius, 'top-right');
                if (arcY !== null) {
                    y = arcY;
                    debugInfo.arcOverlap = true;
                    debugInfo.arcType = 'top-right';
                }
            }
            debugInfo.period = 'preRetrograde';
            debugInfo.fraction = fraction;
        } else if (dateMs >= retroStartMs && dateMs < retroEndMs) {
            const durationMs = retroEndMs - retroStartMs;
            const fraction = Math.min(1, (dateMs - retroStartMs) / durationMs);
            x = (adjustedRightEndpoint + arcRadius) - fraction * ((adjustedRightEndpoint + arcRadius) - (adjustedLeftEndpoint - arcRadius));
            y = middleLineY;
            if (x > adjustedRightEndpoint) {
                const arcY = getArcY(x, topRightArcCenterX, topRightArcCenterY, arcRadius, 'bottom-right');
                if (arcY !== null) {
                    y = arcY;
                    debugInfo.arcOverlap = true;
                    debugInfo.arcType = 'top-right';
                }
            } else if (x < adjustedLeftEndpoint) {
                const arcY = getArcY(x, bottomLeftArcCenterX, bottomLeftArcCenterY, arcRadius, 'top-left');
                if (arcY !== null) {
                    y = arcY;
                    debugInfo.arcOverlap = true;
                    debugInfo.arcType = 'bottom-left';
                }
            }
            debugInfo.period = 'retrograde';
            debugInfo.fraction = fraction;
        } else if (dateMs >= retroEndMs && dateMs <= shadowEndMs) {
            const durationMs = shadowEndMs - retroEndMs;
            const fraction = Math.min(1, (dateMs - retroEndMs) / durationMs);
            x = bottomLeftArcOuterX + fraction * (bottomArrowLeftX - bottomLeftArcOuterX);
            y = bottomLineY;
            if (x < adjustedLeftEndpoint) {
                const arcY = getArcY(x, bottomLeftArcCenterX, bottomLeftArcCenterY, arcRadius, 'bottom-left');
                if (arcY !== null) {
                    y = arcY;
                    debugInfo.arcOverlap = true;
                    debugInfo.arcType = 'bottom-left';
                }
            }
            debugInfo.period = 'postRetrograde';
            debugInfo.fraction = fraction;
        } else {
            const segmentWidth = (width - margin.right) - bottomArrowX;
            x = bottomArrowX + segmentWidth / 2;
            y = bottomLineY;
            debugInfo.period = 'afterShadowEnd';
        }

        debugInfo.x = x;
        debugInfo.y = y;
        if (this.dataObject.debug === true) console.log('Plotting transit:', debugInfo);
        return { x, y };
    }

    toPosition(date) {
        const width = this.buffer[this.activeBuffer].width;
        const margin = this.margin;
        const arcRadius = (this.buffer[this.activeBuffer].height - margin.top - margin.bottom - this.rulerHeight - this.rulerMargin) / 4;
        const activeWidth = width - margin.left - margin.right - 2 * arcRadius;
        const shadowStartMs = this.dataObject.retrogradeShadowStart.getTime();
        const shadowEndMs = this.dataObject.retrogradeShadowEnd.getTime();
        const totalDurationMs = shadowEndMs - shadowStartMs;
        const dateMs = date.getTime();
        const fraction = (dateMs - shadowStartMs) / totalDurationMs;
        const x = margin.left + arcRadius + fraction * activeWidth;
        if (this.dataObject.debug === true) console.log('toPosition:', { date: date.toISOString(), fraction, x });
        return x;
    }

    createTooltip(ball, event) {
        // Remove existing tooltip
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
            this.isMouseOverTooltip = false;
            clearTimeout(this.tooltipCloseTimeout);
            if (this.dataObject.debug === true) {
                console.log('Existing tooltip removed');
            }
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'info-tooltip retro-tracker-tooltip';
        tooltip.id = 'info-tooltip-' + Date.now();

        // Set content
        let content = '';
        if (ball.type === 'planet') {
            content = `${ball.date.toLocaleDateString()}\nPlanet: ${planets[this.dataObject.planet]} ${this.dataObject.planet.charAt(0).toUpperCase() + this.dataObject.planet.slice(1)}`;
        } else {
            content = `${ball.date.toLocaleDateString()}\nPlanet: ${planets[this.dataObject.planet]} ${this.dataObject.planet.charAt(0).toUpperCase() + this.dataObject.planet.slice(1)}\nEnters: ${signs[ball.sign]} ${ball.sign.charAt(0).toUpperCase() + ball.sign.slice(1)}`;
        }
        tooltip.textContent = content;

        // Position tooltip (50% overlap)
        try {
            const activeCanvas = this.buffer[this.activeBuffer];
            const canvasRect = activeCanvas.getBoundingClientRect();
            const containerRect = this.parentContainer.getBoundingClientRect();
            const offsetX = ball.x;
            const offsetY = ball.y;
            const radius = ball.radius; // 15px for planet, ~10px for transit
            const overlap = radius * 0.5; // Overlap by 50%
            let tooltipLeft, tooltipTop;
            let placement = 'right';

            const tooltipWidth = 200;
            const tooltipHeight = 80;
            const componentRight = containerRect.right - containerRect.left; // 800px
            const componentBottom = containerRect.bottom - containerRect.top; // 200px

            // Try right placement (tooltip’s left edge overlaps ball)
            tooltipLeft = canvasRect.left + offsetX - tooltipWidth / 2 + overlap;
            tooltipTop = canvasRect.top + offsetY - tooltipHeight / 2; // Center vertically
            if (tooltipLeft + tooltipWidth > containerRect.right) {
                // Try left placement
                placement = 'left';
                tooltipLeft = canvasRect.left + offsetX + tooltipWidth / 2 - overlap - tooltipWidth; // Right edge overlaps ball
            }
            // Adjust vertical position
            if (tooltipTop + tooltipHeight > containerRect.bottom) {
                tooltipTop = containerRect.bottom - tooltipHeight - 2;
            }
            if (tooltipTop < containerRect.top) {
                tooltipTop = containerRect.top + 2;
            }
            // If left placement is outside, revert to right with viewport bounds
            if (placement === 'left' && tooltipLeft < containerRect.left) {
                placement = 'right';
                tooltipLeft = canvasRect.left + offsetX - tooltipWidth / 2 + overlap;
                if (tooltipLeft + tooltipWidth > window.innerWidth) {
                    tooltipLeft = window.innerWidth - tooltipWidth - 2;
                }
            }

            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${tooltipTop}px`;

            if (this.dataObject.debug === true) {
                console.log('Tooltip placement:', {
                    placement,
                    ballX: offsetX,
                    ballY: offsetY,
                    radius,
                    overlap,
                    canvasRect: { left: canvasRect.left, top: canvasRect.top },
                    containerRect: { left: containerRect.left, right: containerRect.right, top: containerRect.top, bottom: containerRect.bottom }
                });
            }
        } catch (error) {
            console.error('Tooltip positioning failed, using fallback:', error);
            tooltip.style.left = '100px';
            tooltip.style.top = '100px';
        }

        // Append to document.body
        try {
            document.body.appendChild(tooltip);
            this.currentTooltip = tooltip;
            if (this.dataObject.debug === true) {
                const tooltipRect = tooltip.getBoundingClientRect();
                console.log('Tooltip created:', {
                    id: tooltip.id,
                    content,
                    left: tooltip.style.left,
                    top: tooltip.style.top,
                    tooltipRect: {
                        left: tooltipRect.left,
                        top: tooltipRect.top,
                        width: tooltipRect.width,
                        height: tooltipRect.height
                    },
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    ball: {
                        type: ball.type,
                        x: ball.x,
                        y: ball.y,
                        radius: ball.radius,
                        sign: ball.sign
                    },
                    domChildren: Array.from(document.body.children).map(child => child.id || child.tagName)
                });
            }
        } catch (error) {
            console.error('Failed to append tooltip to document.body:', error);
            return;
        }

        // Verify tooltip in DOM
        if (this.dataObject.debug === true) {
            const domTooltip = document.getElementById(tooltip.id);
            console.log('Tooltip in DOM (immediate):', {
                found: !!domTooltip,
                id: tooltip.id,
                parent: domTooltip ? domTooltip.parentNode.tagName : null,
                computedStyle: domTooltip ? {
                    display: window.getComputedStyle(domTooltip).display,
                    opacity: window.getComputedStyle(domTooltip).opacity,
                    visibility: window.getComputedStyle(domTooltip).visibility
                } : null
            });
        }

        // Mouse handlers for tooltip
        tooltip.addEventListener('mouseover', () => {
            this.isMouseOverTooltip = true;
            clearTimeout(this.tooltipCloseTimeout);
            if (this.dataObject.debug === true) {
                console.log('Tooltip mouseover; keeping open');
            }
        });

        tooltip.addEventListener('mouseout', (event) => {
            const relatedTarget = event.relatedTarget;
            const activeCanvas = this.buffer[this.activeBuffer];
            this.isMouseOverTooltip = false;
            if (relatedTarget !== activeCanvas && !activeCanvas.contains(relatedTarget)) {
                this.updateTooltipState();
            }
            if (this.dataObject.debug === true) {
                console.log('Tooltip mouseout', {
                    relatedTarget: relatedTarget ? relatedTarget.id || relatedTarget.tagName : 'null',
                    clientX: event.clientX,
                    clientY: event.clientY
                });
            }
        });
    }

    detectHover(mouseX, mouseY) {
        let newHoveredBall = null;

        // Check planet ball
        if (this.planetBall) {
            const dx = mouseX - this.planetBall.x;
            const dy = mouseY - this.planetBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.planetBall.radius) {
                newHoveredBall = { type: 'planet', index: null };
                if (this.dataObject.debug === true) {
                    console.log('Hover detected on planet ball:', {
                        mouseX,
                        mouseY,
                        planetX: this.planetBall.x,
                        planetY: this.planetBall.y,
                        distance,
                        radius: this.planetBall.radius
                    });
                }
            }
        }

        // Check transit balls
        this.transitBalls.forEach((ball, index) => {
            const dx = mouseX - ball.x;
            const dy = mouseY - ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= ball.radius) {
                newHoveredBall = { type: 'transit', index };
                if (this.dataObject.debug === true) {
                    console.log('Hover detected on transit ball:', {
                        index,
                        mouseX,
                        mouseY,
                        ballX: ball.x,
                        ballY: ball.y,
                        distance,
                        radius: ball.radius,
                        sign: ball.sign
                    });
                }
            }
        });

        // Update hover state
        if (newHoveredBall?.type !== this.hoveredBall?.type || newHoveredBall?.index !== this.hoveredBall?.index) {
            this.hoveredBall = newHoveredBall;
            const canvas = this.buffer[this.activeBuffer];
            canvas.style.cursor = newHoveredBall ? 'pointer' : 'default';
            if (this.dataObject.debug === true) {
                console.log('Hover state changed:', { newHoveredBall, canvasCursor: canvas.style.cursor });
            }
            this.render();
        }
    }

    render() {
        const canvas = this.buffer[this.activeBuffer];
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Reset canvas state
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const margin = this.margin;
        const lineWidth = 3;
        const arrowSize = this.arrowSize;
        const rulerHeight = 20;
        const rulerMargin = this.rulerMargin;
        const topLineY = margin.top + rulerHeight + rulerMargin;
        const bottomLineY = height - margin.bottom - arrowSize / 2;
        const lineSpacing = (bottomLineY - topLineY) / 2;
        const arcRadius = lineSpacing / 2;
        const middleLineY = topLineY + lineSpacing;
        const activeWidth = width - margin.left - margin.right - 2 * arcRadius;

        const planetColor = colorPalette.planet[this.dataObject.planet].computed.average;
        const planetHighlightColor = lightenColor(planetColor, 50);

        const shadowStartX = margin.left + arcRadius;
        const retrogradeStartX = this.toPosition(this.dataObject.retrogradeStart);
        const retrogradeEndX = this.toPosition(this.dataObject.retrogradeEnd);
        const shadowEndX = width - margin.right - arcRadius;

        const topArrowX = shadowStartX + 64;
        const originalBottomArrowX = shadowEndX - 64;
        const bottomArrowX = originalBottomArrowX + arrowSize;
        const bottomArrowLeftX = bottomArrowX - arrowSize;

        const adjustedLeftEndpoint = topArrowX + arcRadius;
        const adjustedRightEndpoint = bottomArrowLeftX - arcRadius;

        const rulerStartX = topArrowX - arrowSize;
        const rulerEndX = bottomArrowX;

        // Store ruler bounds for mouse tracking
        this.rulerStartX = rulerStartX;
        this.rulerEndX = rulerEndX;

        const ticks = this.rulerScale(
            this.dataObject.retrogradeStartDegree,
            this.dataObject.retrogradeEndDegree,
            bottomArrowLeftX,
            topArrowX,
            rulerStartX,
            rulerEndX
        );

        const zeroDegreeTick = ticks.find(tick => tick.label && tick.label.includes('0° ♈︎'));
        if (this.dataObject.debug === true) console.log('0° Aries tick:', zeroDegreeTick ? zeroDegreeTick.tickmarkX : 'Not found');

        // Draw ruler background
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(bottomArrowLeftX, margin.top, topArrowX - bottomArrowLeftX, 18);
        ctx.stroke();

        // Draw ruler line
        ctx.beginPath();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.moveTo(rulerStartX, margin.top + 18);
        ctx.lineTo(rulerEndX, margin.top + 18);
        ctx.stroke();

        // Draw ruler ticks
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ticks.forEach(({ tickmarkX, tickmarkType, label }) => {
            if (tickmarkX >= rulerStartX && tickmarkX <= rulerEndX) {
                ctx.beginPath();
                if (tickmarkType === 'major') {
                    ctx.moveTo(tickmarkX, margin.top + 18);
                    ctx.lineTo(tickmarkX, margin.top);
                    if (label) {
                        ctx.font = '12px Arial'; // Explicitly set font
                        ctx.fillStyle = '#000';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'alphabetic';
                        const labelY = margin.top - 6;
                        ctx.fillText(label, tickmarkX, labelY);
                        if (this.dataObject.debug === true) {
                            console.log('Drawing ruler label:', {
                                label,
                                x: tickmarkX,
                                y: labelY,
                                font: ctx.font,
                                textBaseline: ctx.textBaseline
                            });
                        }
                    }
                } else {
                    const tickLength = tickmarkType === 'half' ? 12 : 6;
                    ctx.moveTo(tickmarkX, margin.top);
                    ctx.lineTo(tickmarkX, margin.top + tickLength);
                }
                ctx.stroke();
            }
        });

        // Draw lines and arcs
        ctx.strokeStyle = planetColor;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        ctx.moveTo(adjustedLeftEndpoint, middleLineY);
        ctx.lineTo(adjustedRightEndpoint, middleLineY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin.left, topLineY);
        ctx.lineTo(adjustedRightEndpoint, topLineY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(adjustedRightEndpoint, topLineY + arcRadius, arcRadius, -Math.PI / 2, Math.PI / 2, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(adjustedLeftEndpoint, middleLineY + arcRadius, arcRadius, Math.PI / 2, -Math.PI / 2, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(adjustedLeftEndpoint, bottomLineY);
        ctx.lineTo(width - margin.right, bottomLineY);
        ctx.stroke();

        // Draw arrows
        ctx.fillStyle = planetColor;

        ctx.beginPath();
        ctx.moveTo(topArrowX, topLineY);
        ctx.lineTo(topArrowX - arrowSize, topLineY - arrowSize / 2);
        ctx.lineTo(topArrowX - arrowSize, topLineY + arrowSize / 2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(bottomArrowX, bottomLineY);
        ctx.lineTo(bottomArrowX - arrowSize, bottomLineY - arrowSize / 2);
        ctx.lineTo(bottomArrowX - arrowSize, bottomLineY + arrowSize / 2);
        ctx.closePath();
        ctx.fill();

        // Draw ruler tracker line
        if (this.trackerX !== null) {
            const highlightColor = this.dataObject.highlightColor || '#00FF00';
            ctx.beginPath();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.moveTo(this.trackerX - 1, margin.top);
            ctx.lineTo(this.trackerX - 1, height - margin.bottom);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = highlightColor;
            ctx.lineWidth = 1;
            ctx.moveTo(this.trackerX, margin.top);
            ctx.lineTo(this.trackerX, height - margin.bottom);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.moveTo(this.trackerX + 1, margin.top);
            ctx.lineTo(this.trackerX + 1, height - margin.bottom);
            ctx.stroke();

            if (this.dataObject.debug === true) {
                console.log('Drawing ruler tracker:', {
                    trackerX: this.trackerX,
                    highlightColor
                });
            }
        }

        // Draw vertical lines and text
        const topRightLineX = this.topRightArcCenterX + arcRadius;
        const bottomLeftLineX = this.bottomLeftArcCenterX - arcRadius;
        const topRightBottomY = (topLineY + middleLineY) / 2;
        const bottomLeftTopY = (bottomLineY + middleLineY) / 2;
        const lineTopY = margin.top + rulerHeight;
        const lineLength = topRightBottomY - lineTopY;
        const bottomLeftBottomY = bottomLeftTopY + lineLength;
        const topRightMidY = (lineTopY + topRightBottomY) / 2;
        const bottomLeftMidY = (bottomLeftTopY + bottomLeftBottomY) / 2;

        // Top-right vertical line
        ctx.beginPath();
        ctx.strokeStyle = this.annotationColor;
        ctx.lineWidth = 1;
        ctx.moveTo(topRightLineX, topRightBottomY);
        ctx.lineTo(topRightLineX, lineTopY);
        ctx.stroke();

        // Bottom-left vertical line
        ctx.beginPath();
        ctx.strokeStyle = this.annotationColor;
        ctx.lineWidth = 1;
        ctx.moveTo(bottomLeftLineX, bottomLeftTopY);
        ctx.lineTo(bottomLeftLineX, bottomLeftBottomY);
        ctx.stroke();

        // Draw text labels
        ctx.font = '12px Arial';
        ctx.fillStyle = this.annotationColor;
        ctx.textBaseline = 'alphabetic';

        // Top-right text (left-aligned, to the right, 4px closer)
        ctx.textAlign = 'left';
        const topRightTextX = topRightLineX + (this.degreeTextMargin - 4);
        ctx.fillText(this.dataObject.retrogradeStartDegree, topRightTextX, topRightMidY - 8);
        ctx.fillText(this.dataObject.retrogradeStart.toLocaleDateString(), topRightTextX, topRightMidY + 8);

        // Bottom-left text (right-aligned, to the left, 4px closer)
        ctx.textAlign = 'right';
        const bottomLeftTextX = bottomLeftLineX - (this.degreeTextMargin - 4);
        ctx.fillText(this.dataObject.retrogradeEndDegree, bottomLeftTextX, bottomLeftMidY - 8);
        ctx.fillText(this.dataObject.retrogradeEnd.toLocaleDateString(), bottomLeftTextX, bottomLeftMidY + 8);

        if (this.dataObject.debug === true) {
            console.log('Drawing vertical lines and text:', {
                topRightLine: { x: topRightLineX, topY: lineTopY, bottomY: topRightBottomY },
                bottomLeftLine: { x: bottomLeftLineX, topY: bottomLeftTopY, bottomY: bottomLeftBottomY },
                text: {
                    topRight: {
                        x: topRightTextX,
                        y: topRightMidY,
                        degree: this.dataObject.retrogradeStartDegree,
                        date: this.dataObject.retrogradeStart.toLocaleDateString(),
                        font: '12px Arial'
                    },
                    bottomLeft: {
                        x: bottomLeftTextX,
                        y: bottomLeftMidY,
                        degree: this.dataObject.retrogradeEndDegree,
                        date: this.dataObject.retrogradeEnd.toLocaleDateString(),
                        font: '12px Arial'
                    }
                },
                degreeTextMargin: this.degreeTextMargin,
                adjustedTextOffset: this.degreeTextMargin - 4,
                annotationColor: this.annotationColor
            });
        }

        // Draw planet ball
        const currentDate = this.dataObject.planetDate || new Date();
        const { x: planetX, y: planetY } = this.plotDate(currentDate, 0, 1);
        if (this.dataObject.debug === true) console.log('Planet position:', { date: currentDate.toISOString(), planetX, planetY });

        const planetBallRadius = arrowSize / 2;
        this.planetBall = { x: planetX, y: planetY, radius: planetBallRadius, date: currentDate };

        const isPlanetHovered = this.hoveredBall && this.hoveredBall.type === 'planet';
        const planetGradient = ctx.createRadialGradient(
            planetX - planetBallRadius * 0.3, planetY - planetBallRadius * 0.3, 0,
            planetX, planetY, planetBallRadius
        );
        planetGradient.addColorStop(0, planetHighlightColor);
        planetGradient.addColorStop(1, planetColor);

        if (isPlanetHovered) {
            const hoverGradient = ctx.createRadialGradient(
                planetX, planetY, 0,
                planetX, planetY, planetBallRadius * 1.5
            );
            hoverGradient.addColorStop(0, colorPalette.planet[this.dataObject.planet].computed.average);
            hoverGradient.addColorStop(1, colorPalette.planet[this.dataObject.planet].computed.lightest);
            ctx.beginPath();
            ctx.arc(planetX, planetY, planetBallRadius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = hoverGradient;
            ctx.fill();
            if (this.dataObject.debug === true) {
                console.log('Rendering planet hover effect:', { planetX, planetY, radius: planetBallRadius * 1.5 });
            }
        }

        ctx.beginPath();
        ctx.arc(planetX, planetY, planetBallRadius, 0, Math.PI * 2);
        ctx.fillStyle = planetGradient;
        ctx.fill();

        const baseSymbolSize = (planetBallRadius * 2 - 4) * 0.7;
        const previousSymbolSize = baseSymbolSize * 1.5;
        const planetSymbolSize = previousSymbolSize * 1.2;
        ctx.font = `bold ${planetSymbolSize}px Arial`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const verticalOffset = 2;
        ctx.fillText(planets[this.dataObject.planet], planetX, planetY + verticalOffset);

        // Draw transit balls
        this.transitBalls = [];
        const transitGroups = {
            beforeShadowStart: [],
            shadowStartToStart: [],
            startToEnd: [],
            endToShadowEnd: [],
            afterShadowEnd: []
        };

        this.dataObject.transits.forEach((transit, index) => {
            const transitMs = transit.date.getTime();
            const shadowStartMs = this.dataObject.retrogradeShadowStart.getTime();
            const retroStartMs = this.dataObject.retrogradeStart.getTime();
            const retroEndMs = this.dataObject.retrogradeEnd.getTime();
            const shadowEndMs = this.dataObject.retrogradeShadowEnd.getTime();

            if (transitMs < shadowStartMs) {
                transitGroups.beforeShadowStart.push({ ...transit, originalIndex: index });
            } else if (transitMs >= shadowStartMs && transitMs < retroStartMs) {
                transitGroups.shadowStartToStart.push({ ...transit, originalIndex: index });
            } else if (transitMs >= retroStartMs && transitMs < retroEndMs) {
                transitGroups.startToEnd.push({ ...transit, originalIndex: index });
            } else if (transitMs >= retroEndMs && transitMs <= shadowEndMs) {
                transitGroups.endToShadowEnd.push({ ...transit, originalIndex: index });
            } else {
                transitGroups.afterShadowEnd.push({ ...transit, originalIndex: index });
            }
        });

        const transitBallRadius = planetBallRadius * (2 / 3);
        const planetPosition = { x: planetX, y: planetY, radius: planetBallRadius };

        const allTransits = [];
        Object.keys(transitGroups).forEach(group => {
            const transits = transitGroups[group];
            transits.forEach((transit, idx) => {
                const { x: initialX, y: initialY } = this.plotDate(transit.date, idx, transits.length);
                allTransits.push({ ...transit, initialX, initialY });
            }, this);
        });

        allTransits.sort((a, b) => a.date - b.date);

        allTransits.forEach((transit, index) => {
            let transitX = transit.initialX;
            let transitY = transit.initialY;
            const orbiter = {
                x: transitX,
                y: transitY,
                radius: transitBallRadius,
                initialY: transit.initialY,
                transitDate: transit.date
            };
            const adjustment = this.spaceBalls(planetPosition, orbiter, 1);
            if (adjustment.type === 'x') {
                transitX += adjustment.value;
            } else if (adjustment.type === 'y') {
                transitY = adjustment.value;
            }

            if (isNaN(transitX) || isNaN(transitY)) {
                if (this.dataObject.debug === true) console.log('Skipping transit due to invalid coordinates:', { transitDate: transit.date.toISOString(), transitX, transitY });
                return;
            }

            this.transitBalls.push({ x: transitX, y: transitY, radius: transitBallRadius, sign: transit.sign, date: transit.date });

            const signColor = colorPalette.sign[transit.sign].computed.average;
            const signHighlightColor = lightenColor(signColor, 50);
            const isTransitHovered = this.hoveredBall && this.hoveredBall.type === 'transit' && this.hoveredBall.index === index;

            if (isTransitHovered) {
                const hoverGradient = ctx.createRadialGradient(
                    transitX, transitY, 0,
                    transitX, transitY, transitBallRadius * 1.5
                );
                hoverGradient.addColorStop(0, colorPalette.sign[transit.sign].computed.average);
                hoverGradient.addColorStop(1, colorPalette.sign[transit.sign].computed.lightest);
                ctx.beginPath();
                ctx.arc(transitX, transitY, transitBallRadius * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = hoverGradient;
                ctx.fill();
                if (this.dataObject.debug === true) {
                    console.log('Rendering transit hover effect:', { index, sign: transit.sign, transitX, transitY, radius: transitBallRadius * 1.5 });
                }
            }

            const transitGradient = ctx.createRadialGradient(
                transitX - transitBallRadius * 0.3, transitY - transitBallRadius * 0.3, 0,
                transitX, transitY, transitBallRadius
            );
            transitGradient.addColorStop(0, signHighlightColor);
            transitGradient.addColorStop(1, signColor);

            ctx.beginPath();
            ctx.arc(transitX, transitY, transitBallRadius, 0, Math.PI * 2);
            ctx.fillStyle = transitGradient;
            ctx.fill();

            const baseTransitSymbolSize = (transitBallRadius * 2 - 4) * 0.7;
            const currentTransitSymbolSize = baseTransitSymbolSize * (2 / 3);
            const transitSymbolSize = currentTransitSymbolSize * 2;
            ctx.font = `bold ${transitSymbolSize}px Arial`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const isSpecialSign = ['virgo', 'libra', 'scorpio'].includes(transit.sign);
            const textVerticalOffset = isSpecialSign ? 1 : 2;
            ctx.fillText(signs[transit.sign], transitX, transitY + textVerticalOffset);
        });

        this.swapBuffers();
    }

    swapBuffers() {
        this.buffer[this.activeBuffer].style.zIndex = 2;
        this.activeBuffer = 1 - this.activeBuffer;
        this.buffer[this.activeBuffer].style.zIndex = 1;
    }
}