function getOneYearWindow(inputDate) {
    const minus6Months = new Date(inputDate);
    const plus6Months = new Date(inputDate);

    minus6Months.setMonth(inputDate.getMonth() - 6);
    plus6Months.setMonth(inputDate.getMonth() + 6);

    return { minus6Months, plus6Months };
}

function getAbsolutePosition(element) {
    let rect = element.getBoundingClientRect();
    let scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
        x: rect.left + scrollLeft,
        y: rect.top + scrollTop,
        width: rect.width,
        height: rect.height
    };
}

const shadeCache = new Map();
function getColorShades(color) {
    if (shadeCache.has(color)) return shadeCache.get(color);
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgbMatch) {
        console.warn('Invalid color format: ' + color + ', defaulting to grey shades');
        return ['rgba(204, 204, 204, 0.8)', 'rgba(0, 0, 0, 0.15)'];
    }

    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);

    const primaryR = Math.round(r * 0.8);
    const primaryG = Math.round(g * 0.8);
    const primaryB = Math.round(b * 0.8);
    const primaryShade = 'rgba(' + primaryR + ', ' + primaryG + ', ' + primaryB + ', 0.8)';

    const secondaryR = Math.round(r * 0.5);
    const secondaryG = Math.round(g * 0.5);
    const secondaryB = Math.round(b * 0.5);
    const secondaryShade = 'rgba(' + secondaryR + ', ' + secondaryG + ', ' + secondaryB + ', 0.5)';

    shadeCache.set(color, [primaryShade, secondaryShade]);
    return [primaryShade, secondaryShade];
}

class RetroGradeAndTransitGraphClass {
    constructor(config) {
        const {
            targetDOMElement,
            startDate = new Date(),
            endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000),
            highlightDate = new Date(),
            items,
            debug = false,
            background = '#20262E',
            chartBackground = '#f0f0f0'
        } = config;

        if (!(targetDOMElement instanceof HTMLElement)) {
            console.error('Target DOM element must be an HTMLElement');
            return;
        }
        if (!(startDate instanceof Date) || isNaN(startDate)) {
            console.error('Invalid startDate');
            this.startDate = new Date();
        } else {
            this.startDate = startDate;
        }
        if (!(endDate instanceof Date) || isNaN(endDate)) {
            console.error('Invalid endDate');
            this.endDate = new Date(this.startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        } else {
            this.endDate = endDate;
        }
        if (highlightDate !== null && (!(highlightDate instanceof Date) || isNaN(highlightDate))) {
            console.error('Invalid highlightDate');
            this.highlightDate = new Date();
        } else {
            this.highlightDate = highlightDate;
        }
        if (!Array.isArray(items) || items.length === 0) {
            console.error('Items must be a non-empty array');
            this.items = [];
        } else {
            this.items = items;
        }
        this.debug = debug;
        this.background = background;
        this.chartBackground = chartBackground;

        this.targetDOMElement = targetDOMElement;
        this.oneDay = 24 * 60 * 60 * 1000;
        this.planets = {
            sun: '☉', moon: '☾', mars: '♂', mercury: '☿', jupiter: '♃', venus: '♀',
            saturn: '♄', uranus: '♅', neptune: '♆', pluto: '⯓', ceres: '⚳', chiron: '⚷'
        };
        this.signs = {
            aries: '♈︎', taurus: '♉︎', gemini: '♊︎', cancer: '♋︎', leo: '♌︎', virgo: '♍︎',
            libra: '♎︎', scorpio: '♏︎', sagittarius: '♐︎', capricorn: '♑︎', aquarius: '♒︎', pisces: '♓︎'
        };

        this.isDragging = false;
        this.initialX = 0;
        this.initialStartDate = null;

        this.targetDOMElement.style.backgroundColor = this.background;

        if (this.debug) {
            console.log('Initializing with:', { startDate, endDate, highlightDate, items, debug, background, chartBackground });
        }
        requestAnimationFrame(() => this.render());
    }

    getAbsoluteHeight(element) {
        if (!element) return 0;
        const style = window.getComputedStyle(element);
        const height = element.offsetHeight;
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        return height + marginTop + marginBottom;
    }

    nearestRetroPrior(item, dt) {
        let ret = item.retrogrades[0].retrograde;
        for (let i = 1; i < item.retrogrades.length; i++) {
            let id = new Date(item.retrogrades[i].date);
            if (id > dt) break;
            ret = item.retrogrades[i].retrograde;
        }
        return ret;
    }

    applyStyles(element, styles) {
        for (let prop in styles) {
            element.style[prop] = styles[prop];
        }
    }

    render() {
        let removeAfter = [];
        try {
            if (this.debug) {
                console.log('Rendering graph...');
            }
            for (let child of this.targetDOMElement.children) {
                removeAfter.push(child);
            }
            this.targetDOMElement.offsetHeight;

            const labelWidth = 75;
            const paddingRight = 5;
            const containerStyle = window.getComputedStyle(this.targetDOMElement);
            const containerPaddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
            const containerPaddingRight = parseFloat(containerStyle.paddingRight) || 0;
            const containerWidth = Math.max(800, this.targetDOMElement.offsetWidth) - containerPaddingLeft - containerPaddingRight;
            const availableWidth = Math.max(0, containerWidth - labelWidth - paddingRight);

            const scale = Math.round((this.endDate - this.startDate) / this.oneDay);
            const pixelsPerDay = availableWidth / scale;

            if (this.debug) {
                console.log('Container offsetWidth: ' + this.targetDOMElement.offsetWidth);
                console.log('Container width (adjusted): ' + containerWidth);
                console.log('Container padding-left: ' + containerPaddingLeft + ', padding-right: ' + containerPaddingRight);
                console.log('Available width for timeline: ' + availableWidth);
                console.log('Scale calculated (days): ' + scale);
                console.log('Pixels per day: ' + pixelsPerDay);
                console.log('Date range: ' + this.startDate.toISOString() + ' to ' + this.endDate.toISOString());
            }

            const wrapperDiv = document.createElement('div');
            this.applyStyles(wrapperDiv, {
                paddingLeft: '0px',
                paddingRight: '0px',
                position: 'relative',
                width: '100%',
                boxSizing: 'border-box'
            });
            const ul = document.createElement('ul');

            const yearLi = document.createElement('li');
            const yearLabel = document.createElement('label');
            const yearNameDiv = document.createElement('div');
            this.applyStyles(yearNameDiv, {
                display: 'block',
                width: labelWidth + 'px',
                textAlign: 'right',
                paddingRight: paddingRight + 'px',
                whiteSpace: 'nowrap',
                zIndex: '5',
                fontSize: '12px'
            });
            yearNameDiv.textContent = 'Year';
            const yearTimelineDiv = document.createElement('div');
            yearTimelineDiv.className = 'timeline first';
            this.applyStyles(yearTimelineDiv, {
                display: 'block',
                position: 'relative',
                backgroundColor: this.chartBackground,
                width: availableWidth + 'px',
                height: '16px',
                cursor: 'grab'
            });

            const handleMouseDown = (event) => {
                event.preventDefault();
                this.isDragging = true;
                this.initialX = event.clientX;
                this.initialStartDate = new Date(this.startDate);
                yearTimelineDiv.style.cursor = 'grabbing';

                const handleMouseMove = (moveEvent) => {
                    if (!this.isDragging) return;
                    const deltaX = moveEvent.clientX - this.initialX;
                    const daysOffset = -deltaX / pixelsPerDay;
                    const newStartDate = new Date(this.initialStartDate.getTime() + Math.round(daysOffset * this.oneDay));
                    const rangeDuration = this.endDate - this.startDate;
                    const newEndDate = new Date(newStartDate.getTime() + rangeDuration);

                    this.startDate = newStartDate;
                    this.endDate = newEndDate;

                    if (this.debug) {
                        console.log('Dragging: deltaX=' + deltaX + 'px, daysOffset=' + daysOffset);
                    }

                    requestAnimationFrame(() => this.render());
                };

                const handleMouseUp = () => {
                    this.isDragging = false;
                    yearTimelineDiv.style.cursor = 'grab';
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    window.removeEventListener('blur', handleBlur);
                };

                const handleBlur = () => {
                    handleMouseUp();
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                window.addEventListener('blur', handleBlur);
            };

            yearTimelineDiv.addEventListener('mousedown', handleMouseDown);

            let currentYearStart = new Date(this.startDate.getFullYear(), 0, 1);
            while (currentYearStart <= this.endDate) {
                const yearEnd = new Date(currentYearStart.getFullYear() + 1, 0, 1);
                const renderStart = currentYearStart < this.startDate ? this.startDate : currentYearStart;
                const renderEnd = yearEnd > this.endDate ? this.endDate : yearEnd;
                let spanStart = Math.floor((renderStart - this.startDate) / this.oneDay);
                let scaleSpan = Math.floor((renderEnd - renderStart) / this.oneDay);

                if (spanStart + scaleSpan > scale) {
                    scaleSpan = scale - spanStart;
                }

                if (scaleSpan > 0 && spanStart >= 0) {
                    const barLeft = Math.round(spanStart * pixelsPerDay);
                    let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                    if (barLeft + barWidth >= availableWidth) {
                        barWidth = Math.max(0, availableWidth - barLeft);
                    }
                    const yearBarStyle = {
                        display: 'block',
                        position: 'absolute',
                        backgroundColor: 'white',
                        color: 'black',
                        border: 'solid 1px black',
                        margin: '0px',
                        left: barLeft + 'px',
                        top: '0px',
                        textAlign: 'center',
                        width: barWidth + 'px',
                        zIndex: '1',
                        fontSize: '12px',
                        overflow: 'hidden',
                        textOverflow: 'clip',
                        whiteSpace: 'nowrap'
                    };
                    const yearBarDiv = document.createElement('div');
                    this.applyStyles(yearBarDiv, yearBarStyle);
                    yearBarDiv.textContent = barWidth < 10 ? '\u00A0' : currentYearStart.getFullYear().toString();
                    yearTimelineDiv.appendChild(yearBarDiv);
                }

                currentYearStart = yearEnd;
            }

            yearLabel.appendChild(yearNameDiv);
            yearLabel.appendChild(yearTimelineDiv);
            yearLi.appendChild(yearLabel);
            ul.appendChild(yearLi);

            this.items.forEach((item, index) => {
                if (this.debug) {
                    console.log('Rendering item: ' + item.text);
                }
                const li = document.createElement('li');
                const label = document.createElement('label');
                const nameDiv = document.createElement('div');
                this.applyStyles(nameDiv, {
                    display: 'block',
                    width: labelWidth + 'px',
                    textAlign: 'right',
                    paddingRight: paddingRight + 'px',
                    whiteSpace: 'nowrap',
                    zIndex: '5',
                    fontSize: '12px'
                });
                const labelText = (this.planets[item.id] || '') + ' ' + item.text;
                nameDiv.textContent = labelText;
                if (this.debug) {
                    console.log('Label for ' + item.id + ': ' + labelText);
                }

                const timelineDiv = document.createElement('div');
                timelineDiv.className = 'timeline';
                this.applyStyles(timelineDiv, {
                    display: 'block',
                    position: 'relative',
                    backgroundColor: this.chartBackground,
                    width: availableWidth + 'px',
                    height: '16px',
                    cursor: 'grab'
                });

                timelineDiv.addEventListener('mousedown', handleMouseDown);

                if (item.id !== 'month' && this.highlightDate !== null) {
                    const xCurrent = (this.highlightDate - this.startDate) / this.oneDay;
                    if (this.debug) {
                        console.log('Highlight line at x: ' + xCurrent);
                    }
                    if (xCurrent >= 0 && xCurrent <= scale) {
                        const lineContainerStyle = {
                            display: 'block',
                            position: 'absolute',
                            left: (xCurrent * pixelsPerDay) + 'px',
                            top: '0px',
                            width: '3px',
                            zIndex: '4'
                        };
                        const whiteLineStyle = {
                            display: 'inline-block',
                            position: 'absolute',
                            backgroundColor: '#000000',
                            width: '1px',
                            height: '100%'
                        };
                        const blackLineStyle = {
                            display: 'inline-block',
                            position: 'absolute',
                            backgroundColor: item.highlightColor,
                            width: '1px',
                            height: '100%',
                            left: '1px'
                        };

                        const lineContainer = document.createElement('div');
                        const containerHeight = this.getAbsoluteHeight(timelineDiv);
                        this.applyStyles(lineContainer, { ...lineContainerStyle, height: containerHeight + 17 + 'px' });

                        const whiteLineLeft = document.createElement('div');
                        this.applyStyles(whiteLineLeft, whiteLineStyle);

                        const blackLine = document.createElement('div');
                        this.applyStyles(blackLine, blackLineStyle);

                        const whiteLineRight = document.createElement('div');
                        this.applyStyles(whiteLineRight, { ...whiteLineStyle, left: '2px' });

                        lineContainer.appendChild(whiteLineLeft);
                        lineContainer.appendChild(blackLine);
                        lineContainer.appendChild(whiteLineRight);
                        timelineDiv.appendChild(lineContainer);
                    }
                }

                let earliestRetroDate = null;
                let latestRetroDate = null;
                if (item.retrogrades.length > 0) {
                    earliestRetroDate = new Date(item.retrogrades[0].date);
                    latestRetroDate = new Date(item.retrogrades[item.retrogrades.length - 1].date);
                }

                if (item.retrogrades.length > 0 && earliestRetroDate > this.startDate) {
                    const fillerStart = new Date(this.startDate);
                    const fillerEnd = earliestRetroDate;
                    if (item.id === 'month') {
                        let currentDate = new Date(fillerStart.getFullYear(), fillerStart.getMonth(), 1);
                        let monthStart = fillerStart;
                        let currentMonth = monthStart.toLocaleString('en-US', { month: 'short' }).toUpperCase();

                        while (monthStart < fillerEnd) {
                            const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                            const monthEnd = nextMonthStart < fillerEnd ? nextMonthStart : fillerEnd;
                            let spanStart = (monthStart - this.startDate) / this.oneDay;
                            let scaleSpan = (monthEnd - monthStart) / this.oneDay;

                            if (monthStart < this.startDate) {
                                spanStart = 0;
                                scaleSpan = (monthEnd - this.startDate) / this.oneDay;
                            }

                            if (spanStart + scaleSpan > scale) {
                                scaleSpan = scale - spanStart;
                            }

                            if (scaleSpan > 0) {
                                const barLeft = Math.round(spanStart * pixelsPerDay);
                                let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                                if (barLeft + barWidth >= availableWidth) {
                                    barWidth = Math.max(0, availableWidth - barLeft);
                                }
                                const fillerBarStyle = {
                                    display: 'block',
                                    position: 'absolute',
                                    backgroundColor: item.keepFormattingWhenDynamic ? item.color : '#cccccc',
                                    backgroundImage: item.keepFormattingWhenDynamic ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                                    color: item.keepFormattingWhenDynamic ? item.foreColor : 'black',
                                    border: 'solid 1px black',
                                    margin: '0px',
                                    left: barLeft + 'px',
                                    top: '0px',
                                    textAlign: 'center',
                                    width: barWidth + 'px',
                                    zIndex: '1',
                                    fontSize: '12px',
                                    overflow: 'hidden',
                                    textOverflow: 'clip',
                                    whiteSpace: 'nowrap'
                                };
                                const fillerBarDiv = document.createElement('div');
                                this.applyStyles(fillerBarDiv, fillerBarStyle);
                                fillerBarDiv.textContent = barWidth < 10 ? '\u00A0' : currentMonth;
                                timelineDiv.appendChild(fillerBarDiv);
                                if (this.debug) {
                                    console.log('Month filler before: month=' + currentMonth);
                                }
                            }

                            currentDate = nextMonthStart;
                            monthStart = new Date(currentDate);
                            currentMonth = currentDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                        }
                    } else {
                        let spanStart = (fillerStart - this.startDate) / this.oneDay;
                        let scaleSpan = (fillerEnd - fillerStart) / this.oneDay;
                        if (spanStart + scaleSpan > scale) {
                            scaleSpan = scale - spanStart;
                        }
                        if (scaleSpan > 0 && spanStart >= 0) {
                            const barLeft = Math.round(spanStart * pixelsPerDay);
                            let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                            if (barLeft + barWidth >= availableWidth) {
                                barWidth = Math.max(0, availableWidth - barLeft);
                            }
                            const fillerBarStyle = {
                                display: 'block',
                                position: 'absolute',
                                backgroundColor: '#cccccc',
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                                color: 'black',
                                border: 'solid 1px black',
                                margin: '0px',
                                left: barLeft + 'px',
                                top: '0px',
                                textAlign: 'center',
                                width: barWidth + 'px',
                                zIndex: '1',
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'clip',
                                whiteSpace: 'nowrap'
                            };
                            const fillerBarDiv = document.createElement('div');
                            this.applyStyles(fillerBarDiv, fillerBarStyle);
                            fillerBarDiv.textContent = '\u00A0';
                            timelineDiv.appendChild(fillerBarDiv);
                            if (this.debug) {
                                console.log('Filler before first retrograde');
                            }
                        }
                    }
                }

                item.retrogrades.forEach((retrograde, rIndex) => {
                    let startDate = new Date(retrograde.date);
                    if (isNaN(startDate)) {
                        if (this.debug) {
                            console.warn('Invalid retrograde date: ' + retrograde.date);
                        }
                        return;
                    }
                    let endDate;
                    if (item.id === 'month') {
                        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
                        if (endDate > this.endDate) {
                            endDate = this.endDate;
                        }
                    } else {
                        if (rIndex + 1 < item.retrogrades.length) {
                            endDate = new Date(item.retrogrades[rIndex + 1].date);
                        } else {
                            endDate = new Date(Math.min(startDate.getTime() + this.oneDay, this.endDate.getTime()));
                        }
                    }
                    if (startDate > this.endDate || endDate <= this.startDate) {
                        if (this.debug) {
                            console.log('Skipping retrograde outside range: ' + retrograde.date);
                        }
                        return;
                    }

                    let spanStart = (startDate - this.startDate) / this.oneDay;
                    let scaleSpan = (endDate - startDate) / this.oneDay;
                    if (startDate < this.startDate) {
                        spanStart = 0;
                        scaleSpan = (endDate - this.startDate) / this.oneDay;
                    }
                    if (endDate > this.endDate) {
                        scaleSpan = (this.endDate - startDate) / this.oneDay;
                    }
                    if (spanStart + scaleSpan > scale) {
                        scaleSpan = scale - spanStart;
                    }
                    if (spanStart < 0 || scaleSpan <= 0) {
                        if (this.debug) {
                            console.log('Skipping retrograde with invalid span: ' + retrograde.date);
                        }
                        return;
                    }

                    const barLeft = Math.round(spanStart * pixelsPerDay);
                    let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                    if (barLeft + barWidth >= availableWidth) {
                        barWidth = Math.max(0, availableWidth - barLeft);
                    }
                    let barStyle;
                    const isRetrograde = retrograde.retrograde === true || retrograde.retrograde === 'true';
                    if (isRetrograde) {
                        const [primaryShade, secondaryShade] = getColorShades(item.color);
                        barStyle = {
                            display: 'block',
                            position: 'absolute',
                            backgroundColor: primaryShade,
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, ' + secondaryShade + ' 2px, ' + secondaryShade + ' 5px)',
                            color: 'black',
                            border: 'solid 1px black',
                            margin: '0px',
                            left: barLeft + 'px',
                            top: '0px',
                            textAlign: 'center',
                            width: barWidth + 'px',
                            zIndex: '3',
                            fontSize: '12px',
                            overflow: 'hidden',
                            textOverflow: 'clip',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                        };
                    } else {
                        barStyle = {
                            display: 'block',
                            position: 'absolute',
                            backgroundColor: item.color,
                            color: item.foreColor,
                            border: 'solid 1px black',
                            margin: '0px',
                            left: barLeft + 'px',
                            top: '0px',
                            textAlign: 'center',
                            width: barWidth + 'px',
                            zIndex: '3',
                            fontSize: '12px',
                            overflow: 'hidden',
                            textOverflow: 'clip',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                        };
                    }
                    const lineStyle = {
                        display: 'block',
                        position: 'absolute',
                        backgroundColor: 'black',
                        left: '0px',
                        top: '0px',
                        width: '1px',
                        height: '100%'
                    };

                    const barDiv = document.createElement('div');
                    this.applyStyles(barDiv, barStyle);
                    barDiv.className = isRetrograde ? 'retrograde-bar' : 'direct-bar';
                    if (this.debug) {
                        console.log(`Applied class to bar: ${barDiv.className}`);
                    }

                    const lineDiv = document.createElement('div');
                    this.applyStyles(lineDiv, lineStyle);

                    barDiv.appendChild(lineDiv);
                    barDiv.textContent = barWidth < 10 ? '\u00A0' : (this.signs[retrograde.sign] || retrograde.sign || '\u00A0');

                    let isHighlighted = false;
                    let popup = null;

                    const createPopup = (event) => {
                        if (item.id === 'month') return;
                        isHighlighted = !isHighlighted;
                        barDiv.style.boxShadow = isHighlighted ? '0 0 5px 2px yellow' : 'none';

                        if (popup) {
                            popup.remove();
                            popup = null;
                        }

                        if (isHighlighted) {
                            if (this.debug) {
                                console.log('Creating popup for bar at left=' + barLeft + ', width=' + barWidth);
                            }
                            popup = document.createElement('div');
                            popup.className = 'info-popup';

                            const containerRect = this.targetDOMElement.getBoundingClientRect();
                            const clickX = event.clientX;
                            const clickY = event.clientY;

                            this.applyStyles(popup, {
                                position: 'fixed',
                                left: clickX + 'px',
                                top: (clickY + 5) + 'px', // Closer to bar
                                transform: 'translateX(-50%)'
                            });

                            const transitsInRange = item.transits
                                .filter(transit => {
                                    const transitDate = new Date(transit.date);
                                    return transitDate >= startDate && transitDate <= endDate;
                                })
                                .map(transit => new Date(transit.date).toLocaleDateString() + ' enters ' + this.signs[transit.sign] + ' ' + transit.sign.charAt(0).toUpperCase() + transit.sign.slice(1));

                            const stateLabel = item.id === 'moon'
                                ? (isRetrograde ? 'Waning' : 'Waxing')
                                : (isRetrograde ? 'Retrograde' : 'Direct');
                            let popupContent = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\nPlanet: ${this.planets[item.id]} ${item.id.charAt(0).toUpperCase() + item.id.slice(1)}\nState: ${stateLabel}`;
                            if (transitsInRange.length > 0) {
                                popupContent += `\nTransits:\n${transitsInRange.join('\n')}`;
                            }

                            popup.textContent = popupContent;
                            this.targetDOMElement.appendChild(popup);

                            const popupRect = popup.getBoundingClientRect();
                            const availableLeft = containerRect.left + labelWidth + paddingRight;
                            const availableRight = containerRect.right;
                            const availableTop = containerRect.top;
                            const availableBottom = containerRect.bottom;

                            if (popupRect.right > availableRight) {
                                popup.style.left = (availableRight - popupRect.width / 2) + 'px';
                            }
                            if (popupRect.left < availableLeft) {
                                popup.style.left = (availableLeft + popupRect.width / 2) + 'px';
                            }
                            if (popupRect.top < availableTop) {
                                popup.style.top = (availableTop + 20) + 'px';
                            }
                            if (popupRect.bottom > availableBottom) {
                                popup.style.top = (availableBottom - popupRect.height - 20) + 'px';
                            }

                            if (this.debug) {
                                console.log('Popup positioned at left=' + popup.style.left + ', top=' + popup.style.top);
                            }

                            popup.addEventListener('mouseleave', (event) => {
                                const relatedTarget = event.relatedTarget;
                                if (!relatedTarget || (relatedTarget !== barDiv && !barDiv.contains(relatedTarget))) {
                                    removePopup();
                                }
                            });

                            popup.addEventListener('mouseenter', () => {
                                // Prevent removal while hovering
                            });
                        }
                    };

                    const removePopup = () => {
                        if (isHighlighted) {
                            isHighlighted = false;
                            barDiv.style.boxShadow = 'none';
                            if (popup) {
                                popup.remove();
                                popup = null;
                            }
                        }
                    };

                    barDiv.addEventListener('click', (event) => {
                        event.stopPropagation();
                        createPopup(event);
                    });

                    barDiv.addEventListener('mouseleave', (event) => {
                        if (!popup) return;
                        const relatedTarget = event.relatedTarget;
                        if (!relatedTarget || (relatedTarget !== popup && !popup.contains(relatedTarget))) {
                            removePopup();
                        }
                    });

                    timelineDiv.appendChild(barDiv);
                });

                if (item.retrogrades.length > 0 && latestRetroDate < this.endDate) {
                    let fillerStart = latestRetroDate;
                    let fillerEnd = this.endDate;
                    if (item.id === 'month') {
                        let currentDate = new Date(fillerStart.getFullYear(), fillerStart.getMonth(), 1);
                        let monthStart = fillerStart;
                        let currentMonth = monthStart.toLocaleString('en-US', { month: 'short' }).toUpperCase();

                        while (monthStart < fillerEnd) {
                            const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                            const monthEnd = nextMonthStart < fillerEnd ? nextMonthStart : fillerEnd;
                            let spanStart = (monthStart - this.startDate) / this.oneDay;
                            let scaleSpan = (monthEnd - monthStart) / this.oneDay;

                            if (spanStart + scaleSpan > scale) {
                                scaleSpan = scale - spanStart;
                            }

                            if (scaleSpan > 0) {
                                const barLeft = Math.round(spanStart * pixelsPerDay);
                                let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                                if (barLeft + barWidth >= availableWidth) {
                                    barWidth = Math.max(0, availableWidth - barLeft);
                                }
                                const fillerBarStyle = {
                                    display: 'block',
                                    position: 'absolute',
                                    backgroundColor: item.keepFormattingWhenDynamic ? item.color : '#cccccc',
                                    backgroundImage: item.keepFormattingWhenDynamic ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                                    color: item.keepFormattingWhenDynamic ? item.foreColor : 'black',
                                    border: 'solid 1px black',
                                    margin: '0px',
                                    left: barLeft + 'px',
                                    top: '0px',
                                    textAlign: 'center',
                                    width: barWidth + 'px',
                                    zIndex: '1',
                                    fontSize: '12px',
                                    overflow: 'hidden',
                                    textOverflow: 'clip',
                                    whiteSpace: 'nowrap'
                                };
                                const fillerBarDiv = document.createElement('div');
                                this.applyStyles(fillerBarDiv, fillerBarStyle);
                                fillerBarDiv.textContent = barWidth < 10 ? '\u00A0' : currentMonth;
                                timelineDiv.appendChild(fillerBarDiv);
                                if (this.debug) {
                                    console.log('Month filler after: month=' + currentMonth);
                                }
                            }

                            currentDate = nextMonthStart;
                            monthStart = new Date(currentDate);
                            currentMonth = currentDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                        }
                    } else {
                        let spanStart = (fillerStart - this.startDate) / this.oneDay;
                        let scaleSpan = (fillerEnd - fillerStart) / this.oneDay;
                        if (spanStart + scaleSpan > scale) {
                            scaleSpan = scale - spanStart;
                        }
                        if (scaleSpan > 0) {
                            const barLeft = Math.round(spanStart * pixelsPerDay);
                            let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                            if (barLeft + barWidth >= availableWidth) {
                                barWidth = Math.max(0, availableWidth - barLeft);
                            }
                            const fillerBarStyle = {
                                display: 'block',
                                position: 'absolute',
                                backgroundColor: '#cccccc',
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                                color: 'black',
                                border: 'solid 1px black',
                                margin: '0px',
                                left: barLeft + 'px',
                                top: '0px',
                                textAlign: 'center',
                                width: barWidth + 'px',
                                zIndex: '1',
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'clip',
                                whiteSpace: 'nowrap'
                            };
                            const fillerBarDiv = document.createElement('div');
                            this.applyStyles(fillerBarDiv, fillerBarStyle);
                            fillerBarDiv.textContent = '\u00A0';
                            timelineDiv.appendChild(fillerBarDiv);
                            if (this.debug) {
                                console.log('Filler after last retrograde');
                            }
                        }
                    }
                }

                if (item.retrogrades.length === 0) {
                    const fillerStart = new Date(this.startDate);
                    const fillerEnd = this.endDate;
                    if (item.id === 'month') {
                        let currentDate = new Date(fillerStart.getFullYear(), fillerStart.getMonth(), 1);
                        let monthStart = fillerStart;
                        let currentMonth = monthStart.toLocaleString('en-US', { month: 'short' }).toUpperCase();

                        while (monthStart < fillerEnd) {
                            const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                            const monthEnd = nextMonthStart < fillerEnd ? nextMonthStart : fillerEnd;
                            let spanStart = (monthStart - this.startDate) / this.oneDay;
                            let scaleSpan = (monthEnd - monthStart) / this.oneDay;

                            if (monthStart < this.startDate) {
                                spanStart = 0;
                                scaleSpan = (monthEnd - this.startDate) / this.oneDay;
                            }

                            if (spanStart + scaleSpan > scale) {
                                scaleSpan = scale - spanStart;
                            }

                            if (scaleSpan > 0) {
                                const barLeft = Math.round(spanStart * pixelsPerDay);
                                let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                                if (barLeft + barWidth >= availableWidth) {
                                    barWidth = Math.max(0, availableWidth - barLeft);
                                }
                                const fillerBarStyle = {
                                    display: 'block',
                                    position: 'absolute',
                                    backgroundColor: item.keepFormattingWhenDynamic ? item.color : '#cccccc',
                                    backgroundImage: item.keepFormattingWhenDynamic ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                                    color: item.keepFormattingWhenDynamic ? item.foreColor : 'black',
                                    border: 'solid 1px black',
                                    margin: '0px',
                                    left: barLeft + 'px',
                                    top: '0px',
                                    textAlign: 'center',
                                    width: barWidth + 'px',
                                    zIndex: '1',
                                    fontSize: '12px',
                                    overflow: 'hidden',
                                    textOverflow: 'clip',
                                    whiteSpace: 'nowrap'
                                };
                                const fillerBarDiv = document.createElement('div');
                                this.applyStyles(fillerBarDiv, fillerBarStyle);
                                fillerBarDiv.textContent = barWidth < 10 ? '\u00A0' : currentMonth;
                                timelineDiv.appendChild(fillerBarDiv);
                                if (this.debug) {
                                    console.log('Month filler entire range: month=' + currentMonth);
                                }
                            }

                            currentDate = nextMonthStart;
                            monthStart = new Date(currentDate);
                            currentMonth = currentDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                        }
                    } else {
                        let spanStart = (fillerStart - this.startDate) / this.oneDay;
                        let scaleSpan = (fillerEnd - fillerStart) / this.oneDay;
                        if (spanStart + scaleSpan > scale) {
                            scaleSpan = scale - spanStart;
                        }
                        if (scaleSpan > 0 && spanStart >= 0) {
                            const barLeft = Math.round(spanStart * pixelsPerDay);
                            let barWidth = Math.round(scaleSpan * pixelsPerDay) + 1;
                            if (barLeft + barWidth >= availableWidth) {
                                barWidth = Math.max(0, availableWidth - barLeft);
                            }
                            const fillerBarStyle = {
                                display: 'block',
                                position: 'absolute',
                                backgroundColor: '#cccccc',
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                                color: 'black',
                                border: 'solid 1px black',
                                margin: '0px',
                                left: barLeft + 'px',
                                top: '0px',
                                textAlign: 'center',
                                width: barWidth + 'px',
                                zIndex: '1',
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'clip',
                                whiteSpace: 'nowrap'
                            };
                            const fillerBarDiv = document.createElement('div');
                            this.applyStyles(fillerBarDiv, fillerBarStyle);
                            fillerBarDiv.textContent = '\u00A0';
                            timelineDiv.appendChild(fillerBarDiv);
                            if (this.debug) {
                                console.log('Filler entire range');
                            }
                        }
                    }
                }

                item.transits.forEach((transit) => {
                    let dt = new Date(transit.date);
                    if (isNaN(dt)) {
                        if (this.debug) {
                            console.warn('Invalid transit date: ' + transit.date);
                        }
                        return;
                    }
                    if (dt < this.startDate || dt > this.endDate) {
                        if (this.debug) {
                            console.log('Skipping transit outside range: ' + transit.date);
                        }
                        return;
                    }
                    let x = (dt - this.startDate) / this.oneDay;
                    if (x < 0 || x > scale) {
                        if (this.debug) {
                            console.log('Skipping transit with invalid position: ' + transit.date);
                        }
                        return;
                    }

                    const glyphText = this.signs[transit.sign] || '\u00A0';
                    const glyphWidth = glyphText.length * 12;
                    const dayCenter = x * pixelsPerDay;
                    let glyphLeft = Math.round(dayCenter - glyphWidth / 2);

                    const glyphStyle = {
                        display: 'block',
                        position: 'absolute',
                        color: item.foreColor,
                        border: '0px',
                        margin: '0px',
                        padding: '0px',
                        left: glyphLeft + 'px',
                        top: '2px',
                        zIndex: '3',
                        fontSize: '12px',
                        cursor: 'pointer'
                    };

                    const glyphDiv = document.createElement('div');
                    this.applyStyles(glyphDiv, glyphStyle);
                    glyphDiv.className = 'transit-glyph';
                    glyphDiv.textContent = glyphText;

                    let isGlyphHighlighted = false;
                    let popup = null;

                    const createPopup = (event) => {
                        isGlyphHighlighted = !isGlyphHighlighted;
                        glyphDiv.style.textShadow = isGlyphHighlighted ? '0 0 5px yellow' : 'none';

                        if (popup) {
                            popup.remove();
                            popup = null;
                        }

                        if (isGlyphHighlighted) {
                            if (this.debug) {
                                console.log('Creating popup for glyph at left=' + glyphLeft);
                            }
                            popup = document.createElement('div');
                            popup.className = 'info-popup';

                            const containerRect = this.targetDOMElement.getBoundingClientRect();
                            const clickX = event.clientX;
                            const clickY = event.clientY;

                            this.applyStyles(popup, {
                                position: 'fixed',
                                left: clickX + 'px',
                                top: (clickY + 5) + 'px', // Closer to glyph
                                transform: 'translateX(-50%)'
                            });

                            popup.textContent = `${dt.toLocaleDateString()}\nPlanet: ${this.planets[item.id]} ${item.text.charAt(0).toUpperCase() + item.text.slice(1)}\nEnters: ${this.signs[transit.sign]} ${transit.sign.charAt(0).toUpperCase() + transit.sign.slice(1)}`;

                            this.targetDOMElement.appendChild(popup);

                            const popupRect = popup.getBoundingClientRect();
                            const availableLeft = containerRect.left + labelWidth + paddingRight;
                            const availableRight = containerRect.right;
                            const availableTop = containerRect.top;
                            const availableBottom = containerRect.bottom;

                            if (popupRect.right > availableRight) {
                                popup.style.left = (availableRight - popupRect.width / 2) + 'px';
                            }
                            if (popupRect.left < availableLeft) {
                                popup.style.left = (availableLeft + popupRect.width / 2) + 'px';
                            }
                            if (popupRect.top < availableTop) {
                                popup.style.top = (availableTop + 20) + 'px';
                            }
                            if (popupRect.bottom > availableBottom) {
                                popup.style.top = (availableBottom - popupRect.height - 20) + 'px';
                            }

                            if (this.debug) {
                                console.log('Popup positioned at left=' + popup.style.left + ', top=' + popup.style.top);
                            }

                            popup.addEventListener('mouseleave', (event) => {
                                const relatedTarget = event.relatedTarget;
                                if (!relatedTarget || (relatedTarget !== glyphDiv && !glyphDiv.contains(relatedTarget))) {
                                    removePopup();
                                }
                            });

                            popup.addEventListener('mouseenter', () => {
                                // Prevent removal while hovering
                            });
                        }
                    };

                    const removePopup = () => {
                        if (isGlyphHighlighted) {
                            isGlyphHighlighted = false;
                            glyphDiv.style.textShadow = 'none';
                            if (popup) {
                                popup.remove();
                                popup = null;
                            }
                        }
                    };

                    glyphDiv.addEventListener('click', (event) => {
                        event.stopPropagation();
                        createPopup(event);
                    });

                    glyphDiv.addEventListener('mouseleave', (event) => {
                        if (!popup) return;
                        const relatedTarget = event.relatedTarget;
                        if (!relatedTarget || (relatedTarget !== popup && !popup.contains(relatedTarget))) {
                            removePopup();
                        }
                    });

                    timelineDiv.appendChild(glyphDiv);
                });

                if (this.debug) {
                    setTimeout(() => {
                        console.log('TimelineDiv absolute position:', getAbsolutePosition(timelineDiv));
                        if (timelineDiv.children.length > 0) {
                            console.log('First barDiv absolute position:', getAbsolutePosition(timelineDiv.children[0]));
                        }
                    }, 0);
                }

                label.appendChild(nameDiv);
                label.appendChild(timelineDiv);
                li.appendChild(label);
                ul.appendChild(li);
            });

            wrapperDiv.appendChild(ul);
            this.targetDOMElement.appendChild(wrapperDiv);
            if (this.debug) {
                console.log('Render complete');
            }
        } catch (error) {
            console.error('Render error:', JSON.stringify({ data: error, message: error.toString() }));
        }
        for (let i = removeAfter.length - 1; i >= 0; i--) {
            this.targetDOMElement.removeChild(removeAfter[i]);
            delete removeAfter[i];
        }
    }

    setDateRange(startDate, endDate) {
        if (!(startDate instanceof Date) || isNaN(startDate) || !(endDate instanceof Date) || isNaN(endDate)) {
            console.error('Invalid date range');
            return;
        }
        this.startDate = startDate;
        this.endDate = endDate;
        this.render();
    }

    setStartDate(startDate) {
        if (!(startDate instanceof Date) || isNaN(startDate)) {
            console.error('Invalid startDate');
            return;
        }
        this.startDate = startDate;
        this.render();
    }

    setEndDate(endDate) {
        if (!(endDate instanceof Date) || isNaN(endDate)) {
            console.error('Invalid endDate');
            return;
        }
        this.endDate = endDate;
        this.render();
    }

    setHighlightDate(date) {
        if (date !== null && (!(date instanceof Date) || isNaN(date))) {
            console.error('Invalid highlightDate');
            return;
        }
        this.highlightDate = date;
        this.render();
    }
}