const signs = {
    aries: '♈︎', taurus: '♉︎', gemini: '♊︎', cancer: '♋︎', leo: '♌︎', virgo: '♍︎',
    libra: '♎︎', scorpio: '♏︎', sagittarius: '♐︎', capricorn: '♑︎', aquarius: '♒︎', pisces: '♓︎'
};
const planets = {
    mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
    uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷'
};

function getCoordinatesToParent(child, parent) {
    let ele = child;
    let x = 0;
    let y = 0;
    while (ele = ele.parentElement) {
        if (ele === parent) break;
        let rect = ele.getBoundingClientRect();
        x += rect.left;
        y += rect.top;
    }
    return { x: x, y: y };
}

class LunarPhaseClass {
    constructor(config) {
        this.config = config;
        this.data = config.data;
        this.container = config.parentContainer;
        this.margin = this.parseMargins(config.margin || 0);
        const moonInfoKeys = [
            'nextNewMoon', 'previousNewMoon', 'nextFirstQuarter', 'previousFirstQuarter',
            'nextFullMoon', 'previousFullMoon', 'nextThirdQuarter', 'previousThirdQuarter'
        ];
        moonInfoKeys.forEach(key => {
            if (this.data.moonInfo[key] && typeof this.data.moonInfo[key] === 'string') {
                this.data.moonInfo[key] = new Date(this.data.moonInfo[key]);
                if (isNaN(this.data.moonInfo[key].getTime())) {
                    console.warn(`Invalid date for moonInfo.${key}: ${this.data.moonInfo[key]}`);
                    this.data.moonInfo[key] = null;
                }
            }
        });

        // Convert transits date strings to Date objects
        if (this.data.transits) {
            this.data.transits = this.data.transits.map(transit => ({
                ...transit,
                date: typeof transit.date === 'string' ? new Date(transit.date) : transit.date,
                voidOfCourseStart: transit.voidOfCourseStart && typeof transit.voidOfCourseStart === 'string'
                    ? new Date(transit.voidOfCourseStart)
                    : transit.voidOfCourseStart
            })).map(transit => ({
                ...transit,
                date: isNaN(transit.date?.getTime()) ? null : transit.date,
                voidOfCourseStart: transit.voidOfCourseStart && isNaN(transit.voidOfCourseStart.getTime()) ? null : transit.voidOfCourseStart
            }));
        }

        // Convert data.date to Date object if it's a string
        if (this.data.date && typeof this.data.date === 'string') {
            this.data.date = new Date(this.data.date);
            if (isNaN(this.data.date.getTime())) {
                console.warn(`Invalid date for data.date: ${this.data.date}`);
                this.data.date = new Date(); // Fallback to current date
            }
        }

        this.init();

        // Tooltip state
        this.currentTooltip = null;
        this.isMouseOverTooltip = false;
    }

    parseMargins(margin) {
        if (typeof margin === 'number') {
            return { left: margin, top: margin, right: margin, bottom: margin };
        }
        return {
            left: margin.left || 0,
            top: margin.top || 0,
            right: margin.right || 0,
            bottom: margin.bottom || 0
        };
    }

    formatDate(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).replace(',', '');
    }

    lightenColor(hex, percent) {
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

    createTooltip(ball, event) {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
            this.isMouseOverTooltip = false;
            this.isMouseOverBall = false; // Reset ball hover state
            if (this.data.debug) {
                console.log('Existing tooltip removed');
            }
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'info-tooltip';
        tooltip.id = 'info-tooltip-' + Date.now();

        const now = new Date();
        let state;
        if (ball.date > now) {
            state = 'Future Transit';
        } else if (ball.dateEnd <= now && now <= ball.dateEnd) {
            state = 'In Transit';
        } else if (ball.dateEnd <= now) {
            if (!ball.isVoid && ball.nextTransit && ball.nextTransit.voidOfCourseStart > now) {
                state = 'In Transit';
            } else {
                state = 'Past Transit';
            }
        } else {
            state = ball.isVoid ? 'Void of Course' : 'In Transit';
        }
        let vocSystem = 'Modern';
        if (ball.hellenistic) {
            vocSystem = 'Hellenistic';
        }

        const content = ball.isVoid
            ? `${this.formatDate(ball.date)}\nVoid of Course\nSystem: ${vocSystem}\nState: ${state}`
            : `${this.formatDate(ball.date)}\n${signs[ball.sign]} ${ball.sign.charAt(0).toUpperCase() + ball.sign.slice(1)}\nSystem: ${vocSystem}\nState: ${state}`;
        tooltip.textContent = content;

        try {
            const containerRect = this.container.getBoundingClientRect();
            const ballRect = ball.element.getBoundingClientRect();
            const isVoid = ball.isVoid;
            const ballSize = isVoid ? 16 : 24; // Void marker: 16px, Transit marker: 24px
            const overlapPx = ballSize * 0.4; // 40% overlap (6.4px for void, 9.6px for transit)
            const tooltipWidth = 200;
            const tooltipHeight = 80;

            // Define control boundaries (accounting for margins)
            const marginLeft = this.margin.left || 0;
            const marginRight = this.margin.right || 0;
            const marginTop = this.margin.top || 0;
            const marginBottom = this.margin.bottom || 0;
            const minX = containerRect.left + marginLeft;
            const maxX = containerRect.right - tooltipWidth * 0.75;
            const minY = containerRect.top + marginTop;
            const maxY = containerRect.bottom - marginBottom - tooltipHeight;

            // Calculate ball center
            const ballCenterX = ballRect.left + ballSize / 2;
            const ballCenterY = ballRect.top + ballSize / 2;

            // Try preferred placements: right, left, above, below
            let tooltipLeft, tooltipTop, placement = 'right';

            // Right: Align left edge of tooltip with 40% overlap
            tooltipLeft = ballCenterX + overlapPx;
            tooltipTop = ballCenterY - tooltipHeight / 2;
            if (tooltipLeft > maxX) {
                // Try left: Align right edge of tooltip with 40% overlap
                placement = 'left';
                tooltipLeft = ballCenterX - tooltipWidth - overlapPx; // Fixed to position right edge correctly
                if (tooltipLeft < minX) {
                    // Try above: Align bottom edge of tooltip with 40% overlap
                    placement = 'above';
                    tooltipLeft = ballCenterX - tooltipWidth / 2;
                    tooltipTop = ballCenterY - tooltipHeight + overlapPx;
                    if (tooltipTop < minY) {
                        // Try below: Align top edge of tooltip with 40% overlap
                        placement = 'below';
                        tooltipLeft = ballCenterX - tooltipWidth / 2;
                        tooltipTop = ballCenterY - overlapPx;
                        if (tooltipTop > maxY) {
                            // Fallback: Center within control
                            placement = 'center';
                            tooltipLeft = containerRect.left + (containerRect.width - tooltipWidth) / 2;
                            tooltipTop = containerRect.top + (containerRect.height - tooltipHeight) / 2;
                        }
                    }
                }
            }

            // Clamp to ensure tooltip stays within control
            tooltipLeft = Math.max(minX, Math.min(tooltipLeft, maxX));
            tooltipTop = Math.max(minY, Math.min(tooltipTop, maxY));

            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${tooltipTop}px`;

            if (this.data.debug) {
                console.log('Tooltip placement:', {
                    placement,
                    ballCenterX,
                    ballCenterY,
                    ballSize,
                    overlapPx,
                    tooltipLeft,
                    tooltipTop,
                    tooltipWidth,
                    tooltipHeight,
                    containerRect: {
                        left: containerRect.left,
                        right: containerRect.right,
                        top: containerRect.top,
                        bottom: containerRect.bottom
                    },
                    controlBounds: { minX, maxX, minY, maxY }
                });
            }
        } catch (error) {
            console.error('Tooltip positioning failed, using fallback:', error);
            tooltip.style.left = '100px';
            tooltip.style.top = '100px';
        }

        try {
            document.body.appendChild(tooltip);
            this.currentTooltip = tooltip;
            this.isMouseOverBall = true; // Assume mouse is over the ball when tooltip is created
            if (this.data.debug) {
                console.log('Tooltip created:', { id: tooltip.id, content });
            }
        } catch (error) {
            console.error('Failed to append tooltip:', error);
            return;
        }

        // Track hover state for the tooltip
        tooltip.addEventListener('mouseover', () => {
            this.isMouseOverTooltip = true;
            if (this.data.debug) {
                console.log('Tooltip mouseover; keeping open');
            }
        });

        tooltip.addEventListener('mouseout', () => {
            this.isMouseOverTooltip = false;
            setTimeout(() => {
                if (!this.isMouseOverTooltip && !this.isMouseOverBall && this.currentTooltip) {
                    this.currentTooltip.remove();
                    this.currentTooltip = null;
                    this.isMouseOverBall = false;
                    if (this.data.debug) {
                        console.log('Tooltip removed: mouse left both tooltip and ball');
                    }
                }
            }, 100);
        });

        // Track hover state for the ball
        ball.element.addEventListener('mouseover', () => {
            this.isMouseOverBall = true;
            if (this.data.debug) {
                console.log('Ball mouseover; keeping tooltip open');
            }
        });

        ball.element.addEventListener('mouseout', () => {
            this.isMouseOverBall = false;
            setTimeout(() => {
                if (!this.isMouseOverTooltip && !this.isMouseOverBall && this.currentTooltip) {
                    this.currentTooltip.remove();
                    this.currentTooltip = null;
                    this.isMouseOverBall = false;
                    if (this.data.debug) {
                        console.log('Tooltip removed: mouse left both ball and tooltip');
                    }
                }
            }, 100);
        });

        // Handle click to remove tooltip
        tooltip.addEventListener('click', () => {
            if (this.currentTooltip) {
                this.currentTooltip.remove();
                this.currentTooltip = null;
                this.isMouseOverTooltip = false;
                this.isMouseOverBall = false;
                if (this.data.debug) {
                    console.log('Tooltip removed on click');
                }
            }
        });
    }

    dateToX(date, firstCenterX, lastCenterX, xStartWaypoint, xEndWaypoint, timelineLeft, timelineRight) {
        // Use UTC timestamps to avoid timezone issues
        const dateTime = date.getTime();
        const startTime = xStartWaypoint.getTime();
        const endTime = xEndWaypoint.getTime();

        const totalTime = endTime - startTime;
        const adjustedTimelineWidth = lastCenterX - firstCenterX;
        const pixelsPerMs = totalTime > 0 ? adjustedTimelineWidth / totalTime : 0;
        const timeOffset = dateTime - startTime;
        let xPos = firstCenterX + (timeOffset * pixelsPerMs);
        xPos = Math.max(timelineLeft, Math.min(xPos, timelineRight));

        if (this.data.debug) {
            console.log('dateToX:', {
                dateLocal: date.toString(),
                dateUTC: date.toUTCString(),
                dateTime,
                startTime,
                endTime,
                timeOffset,
                xPos,
                firstCenterX,
                lastCenterX,
                timelineLeft,
                timelineRight
            });
        }

        return xPos;
    }

    xToDate(x, firstCenterX, lastCenterX, xStartWaypoint, xEndWaypoint, timelineLeft, timelineRight) {
        if (!xStartWaypoint || !xEndWaypoint || isNaN(xStartWaypoint) || isNaN(xEndWaypoint)) {
            return new Date();
        }
        const totalTime = xEndWaypoint.getTime() - xStartWaypoint.getTime();
        const adjustedTimelineWidth = lastCenterX - firstCenterX;
        const pixelsPerMs = totalTime > 0 ? adjustedTimelineWidth / totalTime : 0;
        const xClamped = Math.max(timelineLeft, Math.min(x, timelineRight));
        const timeOffset = (xClamped - firstCenterX) / pixelsPerMs;
        return new Date(xStartWaypoint.getTime() + timeOffset);
    }

    init() {
        this.container.innerHTML = '';
        this.container.style.padding = `${this.margin.top}px ${this.margin.right}px ${this.margin.bottom}px ${this.margin.left}px`;

        const phases = this.calculatePhases();
        const dateRange = this.getDateRange(phases);

        this.renderHeader(dateRange);
        this.renderPhaseBlocks(phases);
        this.renderTimeline(phases, dateRange);

        const handleClickOutside = (event) => {
            if (this.currentTooltip && !this.currentTooltip.contains(event.target) && !event.target.classList.contains('transit-marker') && !event.target.classList.contains('void-marker')) {
                this.currentTooltip.remove();
                this.currentTooltip = null;
                this.isMouseOverTooltip = false;
                if (this.data.debug) {
                    console.log('Tooltip removed on outside click');
                }
            }
        };

        this.container.removeEventListener('click', this.container._clickHandler);
        this.container._clickHandler = handleClickOutside;
        this.container.addEventListener('click', handleClickOutside);
    }

    calculatePhases() {
        const { moonInfo } = this.data;
        const currentDate = this.data.date;
        const phases = [];

        const fullMoonNames = {
            0: 'Wolf Moon', 1: 'Snow Moon', 2: 'Worm Moon', 3: 'Pink Moon',
            4: 'Flower Moon', 5: 'Strawberry Moon', 6: 'Buck Moon', 7: 'Sturgeon Moon',
            8: 'Corn Moon', 9: 'Hunter’s Moon', 10: 'Beaver Moon', 11: 'Cold Moon'
        };

        const getFullMoonName = (date) => {
            if (!(date instanceof Date) || isNaN(date)) return null;
            return fullMoonNames[date.getMonth()];
        };

        const validDate = (date) => date instanceof Date && !isNaN(date);

        const phaseDates = [
            { name: 'Third Quarter', date: validDate(moonInfo.previousThirdQuarter) ? moonInfo.previousThirdQuarter : null, fullMoonName: null },
            { name: 'New Moon', date: validDate(moonInfo.previousNewMoon) ? moonInfo.previousNewMoon : null, fullMoonName: null },
            { name: 'First Quarter', date: validDate(moonInfo.previousFirstQuarter) ? moonInfo.previousFirstQuarter : null, fullMoonName: null },
            { name: 'Full Moon', date: validDate(moonInfo.previousFullMoon) ? moonInfo.previousFullMoon : null, fullMoonName: validDate(moonInfo.previousFullMoon) ? getFullMoonName(moonInfo.previousFullMoon) : null },
            { name: 'Third Quarter', date: validDate(moonInfo.nextThirdQuarter) ? moonInfo.nextThirdQuarter : null, fullMoonName: null },
            { name: 'New Moon', date: validDate(moonInfo.nextNewMoon) ? moonInfo.nextNewMoon : null, fullMoonName: null },
            { name: 'First Quarter', date: validDate(moonInfo.nextFirstQuarter) ? moonInfo.nextFirstQuarter : null, fullMoonName: null },
            { name: 'Full Moon', date: validDate(moonInfo.nextFullMoon) ? moonInfo.nextFullMoon : null, fullMoonName: validDate(moonInfo.nextFullMoon) ? getFullMoonName(moonInfo.nextFullMoon) : null }
        ].filter(p => p.date !== null);

        if (phaseDates.length === 0) {
            console.error('No valid phase dates found in moonInfo');
            return [];
        }

        const lastPhase = phaseDates
            .filter(p => p.date <= currentDate)
            .reduce((latest, phase) => (!latest || phase.date > latest.date) ? phase : latest, null);

        if (!lastPhase) {
            console.error('No phase found before current date');
            return [];
        }

        const futurePhases = phaseDates
            .filter(p => p.date > lastPhase.date)
            .sort((a, b) => a.date - b.date)
            .slice(0, 3);

        phases.push(lastPhase);
        phases.push(...futurePhases);

        const sortedPhases = phases.sort((a, b) => a.date - b.date);

        if (this.data.debug) {
            console.log('Calculated Phases:', sortedPhases.map(p => ({
                name: p.name,
                date: p.date.toString(),
                fullMoonName: p.fullMoonName
            })));
        }

        return sortedPhases;
    }

    getDateRange(phases) {
        if (!phases?.length || phases.length < 2) {
            if (this.data.debug) {
                console.error('getDateRange: Insufficient phases', { phases });
            }
            return { startDate: this.data.date, endDate: this.data.date };
        }
        const startDate = phases[0].date;
        const latestPhaseDate = phases[phases.length - 1].date;
        const latestTransitDate = this.data.transits.reduce((latest, transit) => {
            const transitDate = new Date(transit.date);
            return transitDate > latest ? transitDate : latest;
        }, startDate);
        const endDate = latestTransitDate > latestPhaseDate ? latestTransitDate : latestPhaseDate;
        return { startDate, endDate };
    }

    calculateCurrentMoonPhase() {
        const { moonInfo, date } = this.data;

        const allPhases = [
            { name: 'New Moon', date: moonInfo.previousNewMoon },
            { name: 'First Quarter', date: moonInfo.previousFirstQuarter },
            { name: 'Full Moon', date: moonInfo.previousFullMoon },
            { name: 'Third Quarter', date: moonInfo.previousThirdQuarter },
            { name: 'New Moon', date: moonInfo.nextNewMoon },
            { name: 'First Quarter', date: moonInfo.nextFirstQuarter },
            { name: 'Full Moon', date: moonInfo.nextFullMoon },
            { name: 'Third Quarter', date: moonInfo.nextThirdQuarter }
        ].filter(p => p.date).sort((a, b) => a.date - b.date);

        let lastPhaseIndex = -1;
        for (let i = 0; i < allPhases.length; i++) {
            if (allPhases[i].date <= date) {
                lastPhaseIndex = i;
            } else {
                break;
            }
        }

        if (lastPhaseIndex === -1 || lastPhaseIndex === allPhases.length - 1) {
            return 'Unknown';
        }

        const lastPhase = allPhases[lastPhaseIndex];
        const nextPhase = allPhases[lastPhaseIndex + 1];

        const timeBetween = nextPhase.date - lastPhase.date;
        const halfwayTime = lastPhase.date.getTime() + timeBetween / 2;
        const halfwayDate = new Date(halfwayTime);

        const cycle = [
            'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
            'Full Moon', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'
        ];

        const phaseToIndex = {
            'New Moon': 0,
            'First Quarter': 2,
            'Full Moon': 4,
            'Third Quarter': 6
        };

        const lastIndex = phaseToIndex[lastPhase.name];
        const nextIndex = phaseToIndex[nextPhase.name];

        if (date < halfwayDate) {
            return lastPhase.name;
        } else {
            const intermediateIndex = (lastIndex + 1) % 8;
            return cycle[intermediateIndex];
        }
    }

    renderHeader(dateRange) {
        const { location, date } = this.data;
        const currentPhase = this.calculateCurrentMoonPhase();
        const { moonInfo } = this.data;

        const formatter = new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
        });

        const header = document.createElement('div');
        header.className = 'lunar-phase-header';
        header.innerHTML = `
            <h2>Lunar Phases for ${location}, ${formatter.format(dateRange.startDate)} - ${formatter.format(dateRange.endDate)}</h2>
            <p>Current Time: ${formatter.format(date)} at ${timeFormatter.format(date)}</p>
            <p>Moon Phase: ${currentPhase}</p>
            <p>New Moon: ${formatter.format(moonInfo.nextNewMoon)} at ${timeFormatter.format(moonInfo.nextNewMoon)} (Next Phase)</p>
            <p>Third Quarter: ${formatter.format(moonInfo.previousThirdQuarter)} at ${timeFormatter.format(moonInfo.previousThirdQuarter)} (Previous Phase)</p>
        `;
        this.container.appendChild(header);
    }

    renderMajorPhaseBlock(phase, formatter, timeFormatter, majorPhaseSymbols) {
        const block = document.createElement('div');
        block.className = 'lunar-phase-block';
        const graphicClass = phase.name.toLowerCase().replace(' ', '-');
        block.innerHTML = `
            <p>${phase.name}</p>
            <div class="lunar-phase-graphic ${graphicClass}">${majorPhaseSymbols[phase.name]}</div>
            <p>${formatter.format(phase.date)}</p>
            <p>${timeFormatter.format(phase.date)}</p>
            ${phase.name === 'Full Moon' && phase.fullMoonName ? `<p>${phase.fullMoonName}</p>` : ''}
        `;
        return block;
    }

    renderPhaseBlocks(phases) {
        const blocksContainer = document.createElement('div');
        blocksContainer.className = 'lunar-phase-blocks';

        const majorPhasesContainer = document.createElement('div');
        majorPhasesContainer.className = 'major-phases-container';
        blocksContainer.appendChild(majorPhasesContainer);

        const formatter = new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric'
        });
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', hour12: true
        });

        // Map of intermediate phases to Unicode symbols
        const intermediatePhaseSymbols = {
            'Waning Crescent': '🌘',
            'Waxing Crescent': '🌒',
            'Waxing Gibbous': '🌔',
            'Waning Gibbous': '🌖'
        };

        // Map of major phases to Unicode symbols
        const majorPhaseSymbols = {
            'Third Quarter': '🌗',
            'New Moon': '🌑',
            'First Quarter': '🌓',
            'Full Moon': '🌕'
        };

        // Determine intermediate phases between each pair of major phases
        const cycle = [
            'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
            'Full Moon', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'
        ];
        const phaseToIndex = {
            'New Moon': 0,
            'First Quarter': 2,
            'Full Moon': 4,
            'Third Quarter': 6
        };

        // Array to store the major phase blocks for positioning
        const majorBlocks = [];

        // Compute scaling parameters for major phases
        const paddingLeft = parseFloat(this.container.style.paddingLeft) || 0;
        const paddingRight = parseFloat(this.container.style.paddingRight) || 0;
        const containerWidth = this.container.offsetWidth - paddingLeft - paddingRight;
        const timelineLeft = this.margin.left;
        const timelineRight = containerWidth - this.margin.right;
        const blockWidth = 80; // Width of each major phase block
        const firstCenterX = timelineLeft + blockWidth / 2; // Center of first glyph
        const lastCenterX = timelineRight - blockWidth / 2; // Center of last glyph
        const xStartWaypoint = phases[0].date;
        const xEndWaypoint = phases[phases.length - 1].date; // Use last phase date for phase positioning

        // Render major phase blocks (flexbox)
        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            const block = document.createElement('div');
            block.className = 'lunar-phase-block';
            const graphicClass = phase.name.toLowerCase().replace(' ', '-');
            block.innerHTML = `
            <p>${phase.name}</p>
            <div class="lunar-phase-graphic ${graphicClass}">${majorPhaseSymbols[phase.name]}</div>
            <p>${formatter.format(phase.date)}</p>
            <p>${timeFormatter.format(phase.date)}</p>
            ${phase.name === 'Full Moon' && phase.fullMoonName ? `<p>${phase.fullMoonName}</p>` : ''}
        `;
            majorPhasesContainer.appendChild(block);
            majorBlocks.push(block);

            // Reposition all blocks to align with tick marks
            const xPos = this.dateToX(phase.date, firstCenterX, lastCenterX, xStartWaypoint, xEndWaypoint, timelineLeft, timelineRight);
            const leftPos = xPos - blockWidth / 2; // Center glyph at xPos

            // Log before positioning
            const graphic = block.querySelector('.lunar-phase-graphic');
            let preRect = graphic.getBoundingClientRect();
            let containerRect = this.container.getBoundingClientRect();
            const preCenterX = preRect.left - containerRect.left - paddingLeft + preRect.width / 2;
            const computedStyle = window.getComputedStyle(block);
            const blockStyles = {
                position: computedStyle.position,
                left: computedStyle.left,
                right: computedStyle.right,
                margin: computedStyle.margin,
                marginLeft: computedStyle.marginLeft,
                padding: computedStyle.padding,
                paddingLeft: computedStyle.paddingLeft,
                transform: computedStyle.transform,
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                boxSizing: computedStyle.boxSizing,
                float: computedStyle.float,
                clear: computedStyle.clear
            };
            const parentStyles = {
                blocks: window.getComputedStyle(blocksContainer),
                majorPhases: window.getComputedStyle(majorPhasesContainer)
            };

            // Set position with requestAnimationFrame
            requestAnimationFrame(() => {
                block.style.position = 'absolute';
                block.style.left = `${leftPos}px`;
                block.style.right = 'auto';
                block.style.margin = '0';
                block.style.padding = '0';
                block.style.transform = 'none';
                block.style.boxSizing = 'border-box';
                block.style.float = 'none';
                block.style.clear = 'none';

                // Check DOM position and adjust if needed
                const postRect = graphic.getBoundingClientRect();
                const postCenterX = postRect.left - containerRect.left - paddingLeft + postRect.width / 2;
                const expectedCenterX = xPos;

                let adjustedLeftPos = leftPos;
                if (Math.abs(postCenterX - expectedCenterX) > 1) {
                    adjustedLeftPos = leftPos + (expectedCenterX - postCenterX);
                    block.style.left = `${adjustedLeftPos}px`;
                }

                // Log after positioning
                const finalRect = graphic.getBoundingClientRect();
                const finalCenterX = finalRect.left - containerRect.left - paddingLeft + finalRect.width / 2;

                if (this.data.debug) {
                    console.log(`Repositioning Major Phase Block ${i + 1}:`, {
                        phase: phase.name,
                        dateLocal: phase.date.toString(),
                        xPos,
                        leftPos,
                        adjustedLeftPos: Math.abs(postCenterX - expectedCenterX) > 1 ? adjustedLeftPos : null,
                        glyphCenterX: expectedCenterX,
                        preCenterX,
                        postCenterX,
                        finalCenterX,
                        blockWidth,
                        timelineLeft,
                        timelineRight,
                        containerOffsetWidth: this.container.offsetWidth,
                        containerWidth,
                        paddingLeft,
                        paddingRight,
                        parentOffsetLeft: blocksContainer.offsetLeft,
                        blockStyles,
                        parentStyles: {
                            blocks: {
                                margin: parentStyles.blocks.margin,
                                marginLeft: parentStyles.blocks.marginLeft,
                                padding: parentStyles.blocks.padding,
                                paddingLeft: parentStyles.blocks.paddingLeft,
                                transform: parentStyles.blocks.transform,
                                position: parentStyles.blocks.position,
                                left: parentStyles.blocks.left
                            },
                            majorPhases: {
                                margin: parentStyles.majorPhases.margin,
                                marginLeft: parentStyles.majorPhases.marginLeft,
                                padding: parentStyles.majorPhases.padding,
                                paddingLeft: parentStyles.majorPhases.paddingLeft,
                                transform: parentStyles.majorPhases.transform,
                                position: parentStyles.majorPhases.position,
                                left: parentStyles.majorPhases.left
                            }
                        },
                        note: 'Compare glyphCenterX and finalCenterX with debugLeft in renderScale. If misaligned, check blockStyles (left, marginLeft, transform) and parentStyles for offsets (marginLeft, paddingLeft, transform).'
                    });
                }
            });
        }

        // After rendering major blocks, position the intermediate phase blocks
        this.container.appendChild(blocksContainer);

        // Define containerRect and blocksPaddingTop for positioning
        const containerRect = this.container.getBoundingClientRect();
        const blocksPaddingTop = parseFloat(getComputedStyle(blocksContainer).paddingTop) || 0;

        // Compute actual glyph centers for debug logging
        const phaseGraphics = majorPhasesContainer.querySelectorAll('.lunar-phase-graphic');
        const phaseCenters = Array.from(phaseGraphics).map(graphic => {
            const rect = graphic.getBoundingClientRect();
            return rect.left - containerRect.left - paddingLeft + rect.width / 2;
        });

        for (let i = 0; i < majorBlocks.length - 1; i++) {
            const phase = phases[i];
            const nextPhase = phases[i + 1];
            const midDate = new Date((phase.date.getTime() + nextPhase.date.getTime()) / 2);
            const intermediateX = this.dateToX(midDate, firstCenterX, lastCenterX, xStartWaypoint, xEndWaypoint, timelineLeft, timelineRight);

            const currentGraphic = majorBlocks[i].querySelector('.lunar-phase-graphic');
            const majorGraphicTop = currentGraphic.offsetTop;
            const majorGraphicHeight = currentGraphic.offsetHeight;
            const intermediateHeight = 53;
            const intermediateTop = majorGraphicTop + (majorGraphicHeight / 2) - (intermediateHeight / 2) + blocksPaddingTop;

            if (this.data.debug) {
                console.log(`Intermediate ${i}:`, {
                    phase: phase.name,
                    nextPhase: nextPhase.name,
                    midDate: midDate.toString(),
                    intermediateX,
                    intermediateLeft: intermediateX,
                    currentCenterX: phaseCenters[i],
                    nextCenterX: phaseCenters[i + 1],
                    majorGraphicTop,
                    majorCenterlineY: majorGraphicTop + majorGraphicHeight / 2 + blocksPaddingTop,
                    intermediateTop,
                    intermediateCenterlineY: intermediateTop + intermediateHeight / 2,
                    blocksPaddingTop,
                    timelineLeft,
                    timelineRight,
                    containerWidth
                });
            }

            const lastIndex = phaseToIndex[phase.name];
            const intermediateIndex = (lastIndex + 1) % 8;
            const intermediatePhase = cycle[intermediateIndex];

            if (intermediatePhaseSymbols[intermediatePhase]) {
                const intermediateBlock = document.createElement('div');
                intermediateBlock.className = 'intermediate-phase-block';
                intermediateBlock.style.left = `${intermediateX}px`;
                intermediateBlock.style.top = `${intermediateTop}px`;
                intermediateBlock.style.transform = 'translateX(-50%)';
                intermediateBlock.innerHTML = `
                <div class="intermediate-phase-graphic">${intermediatePhaseSymbols[intermediatePhase]}</div>
            `;
                blocksContainer.appendChild(intermediateBlock);
            }
        }
    }

    renderTransitsAndVoids(phases, firstCenterX, lastCenterX, xStartWaypoint, xEndWaypoint, timelineLeft, timelineRight, transitMarkerTop, voidMarkerTop, transitLineTop, transitLineHeight, voidLineTop, voidLineHeight, marginLineWidth, pixelsPerMs, rulerStartDate, rulerEndDate) {
        const blocksContainer = this.container.querySelector('.lunar-phase-blocks');
        const ruler = this.container.querySelector('.ruler');
        const rulerHeight = ruler ? ruler.offsetHeight : 20; // Match ruler height
        const paddingLeft = parseFloat(this.container.style.paddingLeft) || 0;
        const blocksPaddingTop = parseFloat(getComputedStyle(blocksContainer).paddingTop) || 0;
        const currentDateLine = this.container.querySelector('.current-date-line');
        const containerHeight = this.container?.offsetHeight || 400;
        const header = this.container.querySelector('.lunar-phase-header');
        const headerHeight = header ? header.offsetHeight : 0;
        const adjustedHeight = containerHeight - headerHeight - 2 * rulerHeight - 2 * this.margin.bottom;
        const rulerTop = blocksPaddingTop + adjustedHeight;

        // Find current or most recent transit/void-of-course
        let highlightTransitIndex = -1;
        let highlightVoidIndex = -1;
        let mostRecentTransitEnd = null;
        let mostRecentVoidEnd = null;
        const now = new Date();

        this.data.transits.forEach((transit, index) => {
            const transitDate = new Date(transit.date);
            if (transitDate <= now && (!mostRecentTransitEnd || transitDate > mostRecentTransitEnd)) {
                mostRecentTransitEnd = transitDate;
                highlightTransitIndex = index;
            }
            if (transit.voidOfCourseStart) {
                const voidDate = new Date(transit.voidOfCourseStart);
                if (voidDate <= now && (!mostRecentVoidEnd || voidDate > mostRecentVoidEnd)) {
                    mostRecentVoidEnd = voidDate;
                    highlightVoidIndex = index;
                }
            }
        });

        // Render transits within ruler's date range and position bounds
        this.data.transits.forEach((transit, index) => {
            const transitDate = new Date(transit.date);
            // Skip transits before rulerStartDate or after rulerEndDate
            if (transitDate < rulerStartDate || transitDate > rulerEndDate) {
                if (this.data.debug) {
                    console.log(`Transit ${index + 1} Skipped:`, {
                        transitDateLocal: transitDate.toString(),
                        reason: transitDate < rulerStartDate ? 'Before rulerStartDate' : 'After rulerEndDate',
                        rulerStartDate: rulerStartDate.toString(),
                        rulerEndDate: rulerEndDate.toString()
                    });
                }
                return;
            }

            const baseTransitMarkerHeight = 24;
            const baseVoidMarkerHeight = 16;

            // Calculate transit position using the extended timeline
            const timeOffset = transitDate.getTime() - xStartWaypoint.getTime();
            const transitPos = firstCenterX + (timeOffset * pixelsPerMs);

            // Skip transit if position is beyond timelineRight
            if (transitPos > timelineRight) {
                if (this.data.debug) {
                    console.log(`Transit ${index + 1} Skipped:`, {
                        transitDateLocal: transitDate.toString(),
                        transitPos,
                        reason: 'Position beyond timelineRight',
                        timelineRight
                    });
                }
                return;
            }

            const clampedTransitPos = Math.max(timelineLeft, Math.min(transitPos, timelineRight));

            // Add vertical line for zodiac sign marker
            const transitLine = document.createElement('div');
            transitLine.className = 'marker-line' + (transit.hellenistic === true ? '.hellenistic' : '');
            transitLine.style.left = `${clampedTransitPos}px`;
            transitLine.style.top = `${transitLineTop + blocksPaddingTop - (transit.hellenistic === true ? 28 : 0)}px`;
            transitLine.style.height = `${transitLineHeight}px`;
            transitLine.style.zIndex = '1';
            blocksContainer.appendChild(transitLine);

            // Add debug line for transit marker
            const transitDebugLine = document.createElement('div');
            transitDebugLine.className = 'debug-line-transit';
            transitDebugLine.style.left = `${clampedTransitPos}px`;
            transitDebugLine.style.top = `${rulerTop}px`;
            transitDebugLine.style.height = `${rulerHeight}px`;
            transitDebugLine.style.background = this.data.colorPalette.sign[transit.sign].computed.average;
            transitDebugLine.style.zIndex = '10';
            blocksContainer.appendChild(transitDebugLine);

            // Add zodiac sign marker (centered)
            const marker = document.createElement('div');
            marker.className = 'transit-marker';
            if (index === highlightTransitIndex) {
                marker.classList.add('highlight-ball');
                const lighterHighlight = this.lightenColor(this.data.colorPalette.sign[transit.sign].computed.lightest, 20);
                marker.style.background = `radial-gradient(circle at 30% 30%, ${lighterHighlight}, ${this.data.colorPalette.sign[transit.sign].computed.lightest})`;
            } else {
                const signColor = this.data.colorPalette.sign[transit.sign].computed.average;
                const signHighlight = this.lightenColor(signColor, 50);
                marker.style.background = `radial-gradient(circle at 30% 30%, ${signHighlight}, ${signColor})`;
            }
            let nextTransit = (index + 1 < this.data.transits.length ? this.data.transits[index + 1] : null);
            marker.style.left = `${clampedTransitPos - baseTransitMarkerHeight / 2}px`;
            marker.style.top = `${transitMarkerTop + blocksPaddingTop - (transit.hellenistic === true ? 28 : 0)}px`;
            marker.style.zIndex = '2';
            marker.textContent = signs[transit.sign];
            marker.addEventListener('click', (event) => {
                this.createTooltip({
                    element: marker,
                    sign: transit.sign,
                    hellenistic: transit.hellenistic === true,
                    nextTransit: nextTransit,
                    date: transitDate,
                    dateStart: transitDate,
                    dateEnd: transit.voidOfCourseStart ? new Date(transit.voidOfCourseStart) : transitDate,
                    isVoid: false
                }, event);
            });
            blocksContainer.appendChild(marker);

            if (transit.voidOfCourseStart) {
                const voidDate = new Date(transit.voidOfCourseStart);
                // Skip void markers before rulerStartDate or after rulerEndDate
                if (voidDate < rulerStartDate || voidDate > rulerEndDate) {
                    if (this.data.debug) {
                        console.log(`Void ${index + 1} Skipped:`, {
                            voidDateLocal: voidDate.toString(),
                            reason: voidDate < rulerStartDate ? 'Before rulerStartDate' : 'After rulerEndDate',
                            rulerStartDate: rulerStartDate.toString(),
                            rulerEndDate: rulerEndDate.toString()
                        });
                    }
                    return;
                }

                const voidTimeOffset = voidDate.getTime() - xStartWaypoint.getTime();
                const voidPos = firstCenterX + (voidTimeOffset * pixelsPerMs);

                // Skip void if position is beyond timelineRight
                if (voidPos > timelineRight) {
                    if (this.data.debug) {
                        console.log(`Void ${index + 1} Skipped:`, {
                            voidDateLocal: voidDate.toString(),
                            voidPos,
                            reason: 'Position beyond timelineRight',
                            timelineRight
                        });
                    }
                    return;
                }

                const clampedVoidPos = Math.max(timelineLeft, Math.min(voidPos, timelineRight));

                // Add vertical line for void-of-course marker with specific class
                const voidLine = document.createElement('div');
                voidLine.className = 'void-marker-line';
                voidLine.style.left = `${clampedVoidPos}px`;
                voidLine.style.top = `${voidLineTop + blocksPaddingTop - (transit.hellenistic === true ? 28 : 0)}px`;
                voidLine.style.height = `${voidLineHeight + 8}px`;
                voidLine.style.zIndex = '1';
                blocksContainer.appendChild(voidLine);

                // Add debug line for void-of-course marker
                const voidDebugLine = document.createElement('div');
                voidDebugLine.className = 'debug-line-void';
                voidDebugLine.style.left = `${clampedVoidPos}px`;
                voidDebugLine.style.top = `${rulerTop}px`;
                voidDebugLine.style.height = `${rulerHeight}px`;
                voidDebugLine.style.zIndex = '10';
                blocksContainer.appendChild(voidDebugLine);

                // Add void-of-course marker (centered)
                const voidMarker = document.createElement('div');
                voidMarker.className = 'void-marker';
                if (index === highlightVoidIndex) {
                    voidMarker.classList.add('highlight-ball');
                }
                voidMarker.style.left = `${clampedVoidPos - baseVoidMarkerHeight / 2}px`;
                voidMarker.style.top = `${voidMarkerTop + blocksPaddingTop - (transit.hellenistic === true ? 28 : 0)}px`;
                voidMarker.style.zIndex = '1';
                voidMarker.addEventListener('click', (event) => {
                    this.createTooltip({
                        element: voidMarker,
                        hellenistic: transit.hellenistic === true,
                        date: voidDate,
                        dateStart: voidDate,
                        dateEnd: transitDate,
                        isVoid: true
                    }, event);
                });
                blocksContainer.appendChild(voidMarker);

                if (this.data.debug) {
                    console.log(`Transit/Void ${index + 1} Rendered:`, {
                        transitDateLocal: transitDate.toString(),
                        transitPos: clampedTransitPos,
                        transitCenter: clampedTransitPos - baseTransitMarkerHeight / 2,
                        transitMarkerTop: transitMarkerTop + blocksPaddingTop,
                        transitLineTop: transitLineTop + blocksPaddingTop,
                        transitDebugTop: rulerTop,
                        voidDateLocal: voidDate.toString(),
                        voidPos: clampedVoidPos,
                        voidCenter: clampedVoidPos - baseVoidMarkerHeight / 2,
                        voidMarkerTop: voidMarkerTop + blocksPaddingTop,
                        voidLineTop: voidLineTop + blocksPaddingTop,
                        voidLineHeight: voidLineHeight + 8,
                        voidDebugTop: rulerTop,
                        blocksPaddingTop,
                        paddingLeft,
                        timelineLeft,
                        timelineRight,
                        pixelsPerMs
                    });
                }
            } else {
                if (this.data.debug) {
                    console.log(`Transit ${index + 1} Rendered (No Void):`, {
                        transitDateLocal: transitDate.toString(),
                        transitPos: clampedTransitPos,
                        transitCenter: clampedTransitPos - baseTransitMarkerHeight / 2,
                        transitMarkerTop: transitMarkerTop + blocksPaddingTop,
                        transitLineTop: transitLineTop + blocksPaddingTop,
                        transitDebugTop: rulerTop,
                        blocksPaddingTop,
                        paddingLeft,
                        timelineLeft,
                        timelineRight,
                        pixelsPerMs
                    });
                }
            }
        });
    }

    renderTimeline(phases, dateRange) {
        const containerHeight = this.container?.offsetHeight || 400;
        const blocksContainer = this.container.querySelector('.lunar-phase-blocks');

        // Get the lunar phase blocks to determine their positions
        const phaseBlocks = this.container.querySelectorAll('.lunar-phase-block');
        const firstBlock = phaseBlocks[0];
        const lastBlock = phaseBlocks[phaseBlocks.length - 1];

        // Get the blocks container to adjust for relative positioning
        const blocksRect = blocksContainer.getBoundingClientRect();

        // Calculate the x-coordinates of the centers of the first and last phase glyphs
        const firstGraphic = firstBlock.querySelector('.lunar-phase-graphic');
        const lastGraphic = lastBlock.querySelector('.lunar-phase-graphic');

        // Compute scaling parameters
        const paddingLeft = parseFloat(this.container.style.paddingLeft) || 0;
        const paddingRight = parseFloat(this.container.style.paddingRight) || 0;
        const containerWidth = this.container.offsetWidth - paddingLeft - paddingRight;
        const timelineLeft = this.margin.left;
        const timelineRight = containerWidth - this.margin.right;
        const blockWidth = 80; // Width of each major phase block
        const firstCenterX = timelineLeft + blockWidth / 2; // Center of first glyph
        const lastCenterX = timelineRight - blockWidth / 2; // Center of last glyph
        const xStartWaypoint = phases[0].date;
        const phaseXEndWaypoint = phases[phases.length - 1].date; // Use last phase date for phase positioning

        // Calculate extended timeline for transits and ruler
        const latestTransitDate = this.data.transits.reduce((latest, transit) => {
            const transitDate = new Date(transit.date);
            return transitDate > latest ? transitDate : latest;
        }, xStartWaypoint);
        const totalTime = phaseXEndWaypoint.getTime() - xStartWaypoint.getTime();
        const adjustedTimelineWidth = lastCenterX - firstCenterX;
        const pixelsPerMs = totalTime > 0 ? adjustedTimelineWidth / totalTime : 0;
        const pixelsBefore = firstCenterX - timelineLeft;
        const timeBefore = pixelsBefore / pixelsPerMs;
        const pixelsAfter = timelineRight - lastCenterX;
        const timeAfter = pixelsAfter / pixelsPerMs;
        const extendedXEndWaypoint = new Date(phaseXEndWaypoint.getTime() + timeAfter);

        // Ensure extendedXEndWaypoint covers all transits
        const finalXEndWaypoint = latestTransitDate > extendedXEndWaypoint ? latestTransitDate : extendedXEndWaypoint;

        // Calculate ruler's date bounds
        const startTime = xStartWaypoint.getTime() - timeBefore;
        const startDate = new Date(startTime);
        startDate.setHours(0, 0, 0, 0); // Set to midnight
        const rulerStartDate = new Date(startDate.getTime());
        const localHours = rulerStartDate.getHours();
        const hoursToPrevious6Hour = localHours % 6;
        if (hoursToPrevious6Hour !== 0) {
            rulerStartDate.setHours(localHours - hoursToPrevious6Hour, 0, 0, 0);
        }
        const rulerEndDate = new Date(finalXEndWaypoint.getTime() + timeAfter);

        // Compute actual glyph centers for debug logging
        const containerRect = this.container.getBoundingClientRect();
        const phaseGraphics = this.container.querySelectorAll('.lunar-phase-graphic');
        const phaseCenters = Array.from(phaseGraphics).map(graphic => {
            const rect = graphic.getBoundingClientRect();
            return rect.left - containerRect.left - paddingLeft + rect.width / 2;
        });

        // Debug: Log layout details for both blocks
        if (this.data.debug) {
            const firstGraphicRect = firstGraphic.getBoundingClientRect();
            const lastGraphicRect = lastGraphic.getBoundingClientRect();
            const computedFirstCenterX = firstGraphicRect.left - blocksRect.left + firstGraphicRect.width / 2;
            const computedLastCenterX = lastGraphicRect.left - blocksRect.left + firstGraphicRect.width / 2;
            const paddingTop = parseFloat(this.container.style.paddingTop) || 0;
            const paddingBottom = parseFloat(this.container.style.paddingBottom) || 0;
            const header = this.container.querySelector('.lunar-phase-header');
            const headerHeight = header ? header.offsetHeight : 0;
            const blocksPaddingTop = blocksContainer ? parseFloat(getComputedStyle(blocksContainer).paddingTop) || 0 : 0;
            const blocksPaddingBottom = blocksContainer ? parseFloat(getComputedStyle(blocksContainer).paddingBottom) || 0 : 0;
            const currentDateLine = this.container.querySelector('.current-date-line');
            const currentDateLineHeight = currentDateLine ? currentDateLine.offsetHeight : 0;
            const trackerBar = this.container.querySelector('.tracker-bar');
            const trackerBarRect = trackerBar && trackerBar.style.display !== 'none' ? trackerBar.getBoundingClientRect() : null;
            const trackerBarHeight = trackerBarRect ? trackerBarRect.height : 0;
            const trackerBarBottom = trackerBarRect ? trackerBarRect.bottom - this.container.getBoundingClientRect().top : containerHeight;
            console.log('Block Layout:', {
                firstBlockOffsetLeft: firstBlock.offsetLeft,
                firstGraphicOffsetLeft: firstGraphic.offsetLeft,
                firstGraphicOffsetWidth: firstGraphic.offsetWidth,
                firstCenterX: computedFirstCenterX,
                lastBlockOffsetLeft: lastBlock.offsetLeft,
                lastGraphicOffsetLeft: lastGraphic.offsetLeft,
                lastGraphicOffsetWidth: lastGraphic.offsetWidth,
                lastCenterX: computedLastCenterX,
                containerWidth: this.container.offsetWidth,
                containerHeight,
                contentWidth: this.container.offsetWidth - paddingLeft - paddingRight,
                contentHeight: containerHeight - paddingTop - paddingBottom,
                paddingLeft,
                paddingRight,
                paddingTop,
                paddingBottom,
                blocksRectLeft: blocksRect.left,
                firstGraphicRectLeft: firstGraphicRect.left,
                lastGraphicRectLeft: lastGraphicRect.left,
                headerHeight,
                blocksPaddingTop,
                blocksPaddingBottom,
                currentDateLineHeight,
                trackerBarHeight,
                trackerBarBottom,
                phaseCenters
            });
            console.log('Timeline Parameters:', {
                xStartWaypoint: xStartWaypoint.toString(),
                phaseXEndWaypoint: phaseXEndWaypoint.toString(),
                finalXEndWaypoint: finalXEndWaypoint.toString(),
                rulerStartDate: rulerStartDate.toString(),
                rulerEndDate: rulerEndDate.toString(),
                pixelsPerMs,
                timeBefore,
                timeAfter
            });
        }

        // Compute the center y-coordinate of the major phase graphics, adjusted for 8px upward shift
        const majorGraphicTop = firstGraphic.offsetTop - 8;
        const majorGraphicHeight = firstGraphic.offsetHeight;
        const majorCenterY = majorGraphicTop + majorGraphicHeight / 2;

        // Heights of the markers and extension distance
        const baseTransitMarkerHeight = 24;
        const baseVoidMarkerHeight = 16;
        const config = { vocMarkerHeight: 8 };

        // Compute the top positions to center each element at majorCenterY
        const transitMarkerTop = majorCenterY - (baseTransitMarkerHeight / 2) + 12;
        const voidMarkerTop = majorCenterY - (baseVoidMarkerHeight / 2) + 4;

        // Compute the top and height for the vertical lines
        const transitLineTop = transitMarkerTop - config.vocMarkerHeight;
        const transitLineHeight = baseTransitMarkerHeight + 2 * config.vocMarkerHeight;
        const voidLineTop = voidMarkerTop - config.vocMarkerHeight;
        const voidLineHeight = baseVoidMarkerHeight + 2 * config.vocMarkerHeight;

        // Debug: Log marker positions
        if (this.data.debug) {
            console.log('Marker Positions:', {
                transitMarkerTop,
                voidMarkerTop,
                transitLineTop,
                transitLineHeight,
                voidLineTop,
                voidLineHeight,
                majorCenterY,
                majorGraphicTop,
                majorGraphicHeight
            });
        }

        // Width of the vertical lines for centering
        const marginLineWidth = 2;

        // Calculate ruler top to determine current date line height
        const blocksPaddingTop = blocksContainer ? parseFloat(getComputedStyle(blocksContainer).paddingTop) || 0 : 0;
        const header = this.container.querySelector('.lunar-phase-header');
        const headerHeight = header ? header.offsetHeight : 0;
        const rulerHeight = 20; // Match ruler height
        const currentDateLineHeight = containerHeight; // Retain original for other calculations
        const adjustedHeight = currentDateLineHeight - headerHeight - 2 * rulerHeight - 2 * this.margin.bottom;
        const rulerTop = blocksPaddingTop + adjustedHeight;
        const currentLineHeight = rulerTop; // Height to reach ruler top

        // Render current date line
        const currentPos = this.dateToX(this.data.date, firstCenterX, lastCenterX, xStartWaypoint, phaseXEndWaypoint, timelineLeft, timelineRight - 3);
        const currentLine = document.createElement('div');
        currentLine.className = 'current-date-line';
        currentLine.style.left = `${currentPos}px`;
        requestAnimationFrame(() => {
            currentLine.style.height = `${currentLineHeight}px`; // Set height to reach ruler top
            if (this.data.debug) {
                const computedStyle = getComputedStyle(currentLine);
                const rect = currentLine.getBoundingClientRect();
                console.log('Current Date Line Rendered:', {
                    styleHeight: currentLine.style.height,
                    computedHeight: computedStyle.height,
                    currentLineHeight,
                    rulerTop,
                    blocksPaddingTop,
                    containerHeight,
                    headerHeight,
                    bottomEdge: rect.top - containerRect.top + parseFloat(computedStyle.height)
                });
            }
        });
        currentLine.innerHTML = `
        <div class="current-date-line-outer left"></div>
        <div class="current-date-line-inner"></div>
        <div class="current-date-line-outer right"></div>
    `;
        blocksContainer.appendChild(currentLine);

        // Render transits and void-of-course markers
        this.renderTransitsAndVoids(phases, firstCenterX, lastCenterX, xStartWaypoint, finalXEndWaypoint, timelineLeft, timelineRight, transitMarkerTop, voidMarkerTop, transitLineTop, transitLineHeight, voidLineTop, voidLineHeight, marginLineWidth, pixelsPerMs, rulerStartDate, rulerEndDate);

        // Render the tracker bar before the ruler
        this.renderTrackerBar();

        // Render the ruler scale
        this.renderScale(phases, {
            timelineLeft,
            timelineRight,
            rulerWidth: timelineRight - timelineLeft,
            firstCenterX,
            lastCenterX,
            xStartWaypoint,
            xEndWaypoint: finalXEndWaypoint,
            pixelsPerMs
        });
    }

    renderTrackerBar() {
        let trackerBar = this.container.querySelector('.tracker-bar');
        if (!trackerBar) {
            trackerBar = document.createElement('div');
            trackerBar.className = 'tracker-bar';
            this.container.appendChild(trackerBar);
        }

        const header = this.container.querySelector('.lunar-phase-header');
        const blocksContainer = this.container.querySelector('.lunar-phase-blocks');
        const currentDateLine = this.container.querySelector('.current-date-line');
        const containerRect = this.container.getBoundingClientRect();
        const currentDateLineHeight = currentDateLine ? currentDateLine.offsetHeight : 0;
        const blocksPaddingTop = blocksContainer ? parseFloat(getComputedStyle(blocksContainer).paddingTop) || 0 : 0;
        const containerHeight = this.container?.offsetHeight || 400;

        if (this.data.debug) {
            const headerRect = header.getBoundingClientRect();
            const blocksRect = blocksContainer.getBoundingClientRect();
            console.log('Tracker Bar Setup:', {
                containerRectLeft: containerRect.left,
                containerRectTop: containerRect.top,
                containerRectWidth: containerRect.width,
                containerRectHeight: containerHeight,
                headerRectBottom: headerRect.bottom,
                blocksRectTop: blocksRect.top,
                blocksRectBottom: blocksRect.bottom,
                blocksPaddingTop,
                blocksPaddingBottom: currentDateLineHeight
            });
        }

        const updateTrackerPosition = (mouseX, mouseY) => {
            const headerRect = header.getBoundingClientRect();
            const blocksRect = blocksContainer.getBoundingClientRect();
            const top = blocksRect.top - containerRect.top;
            const height = containerHeight - top - blocksPaddingTop - 10;
            trackerBar.style.top = `${top}px`;
            trackerBar.style.height = `${height}px`;

            let xPos = mouseX - containerRect.left;
            xPos = Math.max(this.margin.left, Math.min(xPos, containerRect.width - this.margin.right - 2));
            trackerBar.style.left = `${xPos}px`;

            const isInArea =
                mouseY > headerRect.bottom &&
                mouseY < containerRect.top + containerHeight &&
                mouseX > containerRect.left + this.margin.left - 1 &&
                mouseX < containerRect.right - this.margin.right;

            trackerBar.style.display = isInArea ? 'block' : 'none';

            if (this.data.debug) {
                console.log('Tracker Bar Position:', {
                    mouseX,
                    mouseY,
                    xPos,
                    top,
                    height,
                    isInArea,
                    headerBottom: headerRect.bottom,
                    containerBottom: containerRect.top + containerHeight,
                    leftMargin: containerRect.left + this.margin.left,
                    rightMargin: containerRect.right - this.margin.right
                });
            }
        };

        const onMouseMove = (event) => {
            updateTrackerPosition(event.clientX, event.clientY);
        };

        const onMouseLeave = () => {
            trackerBar.style.display = 'none';
        };

        this.container.removeEventListener('mousemove', this.container._trackerMouseMove);
        this.container.removeEventListener('mouseleave', this.container._trackerMouseLeave);
        this.container._trackerMouseMove = onMouseMove;
        this.container._trackerMouseLeave = onMouseLeave;
        this.container.addEventListener('mousemove', onMouseMove);
        this.container.addEventListener('mouseleave', onMouseLeave);
    }

    renderScale(phases, { timelineLeft, timelineRight, rulerWidth, firstCenterX, lastCenterX, xStartWaypoint, xEndWaypoint, pixelsPerMs }) {
        const containerHeight = this.container?.offsetHeight || 400;
        const paddingLeft = parseFloat(this.container.style.paddingLeft) || 0;
        const containerRect = this.container.getBoundingClientRect();
        const blocksContainer = this.container.querySelector('.lunar-phase-blocks');
        const blocksPaddingTop = blocksContainer ? parseFloat(getComputedStyle(blocksContainer).paddingTop) || 0 : 0;
        const currentDateLine = this.container.querySelector('.current-date-line');
        const currentDateLineHeight = currentDateLine ? currentDateLine.offsetHeight : containerHeight;

        // Calculate header height
        const header = this.container.querySelector('.lunar-phase-header');
        const headerHeight = header ? header.offsetHeight : 0;

        // Render ruler
        const ruler = document.createElement('div');
        ruler.className = 'ruler';
        ruler.style.position = 'absolute';
        ruler.style.left = `0px`;
        ruler.style.right = `0px`;
        const rulerHeight = 20; // Match ruler height
        const adjustedHeight = containerHeight - headerHeight - 2 * rulerHeight - 2 * this.margin.bottom;
        const rulerTop = blocksPaddingTop + adjustedHeight;
        requestAnimationFrame(() => {
            ruler.style.top = `${rulerTop}px`;
            ruler.style.height = `${rulerHeight}px`;
            ruler.style.background = '#ccc';
            if (this.data.debug) {
                const computedStyle = getComputedStyle(ruler);
                console.log('Ruler Rendered:', {
                    styleTop: ruler.style.top,
                    computedTop: computedStyle.top,
                    rulerTop,
                    rulerHeight,
                    adjustedHeight,
                    headerHeight,
                    blocksPaddingTop,
                    containerHeight,
                    computedMargin: computedStyle.margin,
                    computedPadding: computedStyle.padding
                });
            }
        });
        blocksContainer.appendChild(ruler);

        if (this.data.debug) {
            const rulerRect = ruler.getBoundingClientRect();
            console.log('Ruler Positioning:', {
                containerWidth: this.container.offsetWidth,
                containerHeight,
                blocksPaddingTop,
                currentDateLineHeight,
                rulerTop,
                rulerHeight,
                headerHeight,
                rulerRectLeft: rulerRect.left - containerRect.left,
                rulerRectWidth: rulerRect.width,
                rulerRectTop: rulerRect.top - containerRect.top,
                paddingLeft
            });
        }

        // Compute actual glyph centers for debug logging
        const phaseGraphics = this.container.querySelectorAll('.lunar-phase-graphic');
        const phaseCenters = Array.from(phaseGraphics).map(graphic => {
            const rect = graphic.getBoundingClientRect();
            return rect.left - containerRect.left - paddingLeft + rect.width / 2;
        });

        // Draw vertical debug lines for major phases
        phases.forEach((phase, index) => {
            const xPos = this.dateToX(phase.date, firstCenterX, lastCenterX, xStartWaypoint, phases[phases.length - 1].date, timelineLeft, timelineRight);
            const debugLine = document.createElement('div');
            debugLine.className = 'debug-line';
            const debugLeft = xPos - timelineLeft + paddingLeft; // Add paddingLeft to align with content
            debugLine.style.left = `${debugLeft}px`;
            debugLine.style.height = `${rulerHeight}px`;
            debugLine.style.top = '0';
            debugLine.style.background = 'red';
            debugLine.style.width = '1px';
            debugLine.style.position = 'absolute';
            ruler.appendChild(debugLine);

            if (this.data.debug) {
                const debugRect = debugLine.getBoundingClientRect();
                console.log(`Phase ${index + 1} Centerpoint:`, {
                    phase: phase.name,
                    dateLocal: phase.date.toString(),
                    dateUTC: phase.date.toUTCString(),
                    centerX: phaseCenters[index],
                    timeLinearX: xPos,
                    debugLeft,
                    debugRectLeft: debugRect.left - containerRect.left
                });
            }
        });

        // Calculate tick marks at 6-hour intervals in local time
        const sixHours = 6 * 60 * 60 * 1000;
        const totalTime = xEndWaypoint.getTime() - xStartWaypoint.getTime();
        const pixelsBefore = firstCenterX - timelineLeft;
        const timeBefore = pixelsBefore / pixelsPerMs;
        const pixelsAfter = timelineRight - lastCenterX;
        const timeAfter = pixelsAfter / pixelsPerMs;

        // Find the first midnight before xStartWaypoint - timeBefore
        const startTime = xStartWaypoint.getTime() - timeBefore;
        const startDate = new Date(startTime);
        startDate.setHours(0, 0, 0, 0); // Set to midnight of the same day
        let currentTick = new Date(startDate.getTime());
        const endTickTime = xEndWaypoint.getTime() + timeAfter;

        // Adjust currentTick to the first 6-hour interval (00:00, 06:00, 12:00, or 18:00)
        const localHours = currentTick.getHours();
        const hoursToPrevious6Hour = localHours % 6;
        if (hoursToPrevious6Hour !== 0) {
            currentTick.setHours(localHours - hoursToPrevious6Hour, 0, 0, 0);
        }

        if (this.data.debug) {
            console.log('Ruler Scaling:', {
                totalTimeDays: totalTime / (1000 * 60 * 60 * 24),
                pixelsPerMs,
                startTickLocal: currentTick.toString(),
                startTickUTC: currentTick.toUTCString(),
                endTickLocal: new Date(endTickTime).toString(),
                endTickUTC: new Date(endTickTime).toUTCString(),
                localHours,
                hoursToPrevious6Hour
            });
        }

        // Generate ticks at 6-hour intervals
        const labels = [];
        while (currentTick.getTime() <= endTickTime) {
            const timeOffset = currentTick.getTime() - xStartWaypoint.getTime();
            const tickPos = firstCenterX + (timeOffset * pixelsPerMs);

            // Skip tick if position is beyond timelineRight
            if (tickPos > timelineRight) {
                if (this.data.debug) {
                    console.log(`Tick Skipped:`, {
                        dateLocal: currentTick.toString(),
                        tickPos,
                        reason: 'Position beyond timelineRight',
                        timelineRight
                    });
                }
                currentTick = new Date(currentTick.getTime() + sixHours);
                continue;
            }

            const clampedTickPos = Math.max(timelineLeft, Math.min(tickPos, timelineRight));
            const tick = document.createElement('div');
            tick.className = 'ruler-tick';
            const tickLeft = clampedTickPos - timelineLeft + paddingLeft; // Add paddingLeft to align with content
            tick.style.left = `${tickLeft}px`;
            tick.style.width = '1px';
            const localHour = currentTick.getHours();
            tick.style.height = localHour === 0 ? '16px' : localHour === 12 ? '8px' : '4px';
            tick.style.background = '#000';
            tick.style.top = '0';
            tick.style.position = 'absolute';
            ruler.appendChild(tick);

            if (localHour === 12) {
                const label = document.createElement('div');
                label.className = 'ruler-tick-label';
                label.style.left = `${tickLeft}px`;
                label.style.transform = 'translateX(-50%)';
                label.style.top = '6px';
                label.style.fontSize = '10px';
                label.style.whiteSpace = 'nowrap';
                label.textContent = currentTick.getDate();
                ruler.appendChild(label);
                labels.push({ element: label, pos: clampedTickPos + paddingLeft });
            }

            if (this.data.debug) {
                const tickRect = tick.getBoundingClientRect();
                console.log('Tick:', {
                    dateLocal: currentTick.toString(),
                    dateUTC: currentTick.toUTCString(),
                    tickPos: clampedTickPos,
                    tickLeft,
                    tickRectLeft: tickRect.left - containerRect.left,
                    tickHeight: tick.style.height,
                    localHour
                });
            }

            currentTick = new Date(currentTick.getTime() + sixHours);
        }

        // Check label bounds after rendering
        requestAnimationFrame(() => {
            const rulerRect = ruler.getBoundingClientRect();
            labels.forEach(({ element, pos }) => {
                const labelRect = element.getBoundingClientRect();
                const labelWidth = labelRect.width;
                const labelLeft = pos - labelWidth / 2;
                const labelRight = pos + labelWidth / 2;
                if (labelLeft < rulerRect.left - 5 || labelRight > rulerRect.right + 5) {
                    ruler.removeChild(element);
                }
            });
        });

        // Debug: Log specific dates
        if (this.data.debug) {
            const april20 = new Date('2025-04-20T21:35:00-04:00');
            const april20TimeOffset = april20.getTime() - xStartWaypoint.getTime();
            const april20Pos = firstCenterX + (april20TimeOffset * pixelsPerMs);
            console.log('April 20, 2025 21:35 Position:', {
                dateLocal: april20.toString(),
                dateUTC: april20.toUTCString(),
                april20Pos,
                relativePos: april20Pos - timelineLeft,
                expectedPos: firstCenterX
            });

            const may12 = new Date('2025-05-12T12:55:00-04:00');
            const may12TimeOffset = may12.getTime() - xStartWaypoint.getTime();
            const may12Pos = firstCenterX + (may12TimeOffset * pixelsPerMs);
            console.log('May 12, 2025 12:55 Position:', {
                dateLocal: may12.toString(),
                dateUTC: may12.toUTCString(),
                may12Pos,
                relativePos: may12Pos - timelineLeft,
                expectedPos: lastCenterX
            });

            const may20 = new Date('2025-05-20T08:28:00-04:00');
            const may20TimeOffset = may20.getTime() - xStartWaypoint.getTime();
            const may20Pos = firstCenterX + (may20TimeOffset * pixelsPerMs);
            console.log('May 20, 2025 08:28 Position:', {
                dateLocal: may20.toString(),
                dateUTC: may20.toUTCString(),
                may20Pos,
                relativePos: may20Pos - timelineLeft,
                expectedPos: 'Close to timelineRight'
            });
        }
    }
}