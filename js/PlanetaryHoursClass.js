const signs = {
    aries: '♈︎', taurus: '♉︎', gemini: '♊︎', cancer: '♋︎', leo: '♌︎', virgo: '♍︎',
    libra: '♎︎', scorpio: '♏︎', sagittarius: '♐︎', capricorn: '♑︎', aquarius: '♒︎', pisces: '♓︎'
};

const planets = {
    mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
    uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷'
};

class PlanetaryHoursClass {
    constructor(config) {
        this.config = {
            data: {
                date: new Date(),
                location: "Topsham, ME, USA",
                planetRetrogrades: [],
                planetTransits: [],
                debug: false,
                colorPalette: colorPalette
            },
            parentContainer: null,
            margin: { left: 0, top: 0, right: 0, bottom: 0 },
            ...config
        };

        // Normalize margins if a single number is provided
        if (typeof this.config.margin === 'number') {
            this.config.margin = {
                left: this.config.margin,
                top: this.config.margin,
                right: this.config.margin,
                bottom: this.config.margin
            };
        }

        this.daysOfWeek = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
        ];
        this.planetaryOrder = [
            'saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'
        ];
        this.dayToPlanet = {
            'Sunday': 'sun',
            'Monday': 'moon',
            'Tuesday': 'mars',
            'Wednesday': 'mercury',
            'Thursday': 'jupiter',
            'Friday': 'venus',
            'Saturday': 'saturn'
        };

        this.currentTooltip = null;
        this.tooltipBall = null;
        this.isMouseOverBall = false;
        this.isMouseOverTooltip = false;
        this.tooltipCloseTimeout = null;

        this.initialize();
    }

    logDebug(message) {
        if (this.config.data.debug) {
            console.log(`[PlanetaryHours] ${message}`);
        }
    }

    initialize() {
        this.logDebug('Initializing PlanetaryHoursClass');
        if (!this.config.parentContainer) {
            console.error('Parent container not specified');
            return;
        }

        // Clear parent container
        this.config.parentContainer.innerHTML = '';

        // Create main container
        const container = document.createElement('div');
        container.className = 'planetary-hours-container';
        container.style.margin = `${this.config.margin.top}px ${this.config.margin.right}px ${this.config.margin.bottom}px ${this.config.margin.left}px`;
        this.config.parentContainer.appendChild(container);

        // Calculate planetary hours
        const planetaryHours = this.calculatePlanetaryHours();

        // Render component
        this.renderHeader(container, planetaryHours);
        this.renderTables(container, planetaryHours);

        // Global click handler to close tooltips
        const handleClick = (event) => {
            if (this.currentTooltip && !event.target.closest('.info-tooltip') && !event.target.classList.contains('modifier-ball')) {
                this.currentTooltip.remove();
                this.currentTooltip = null;
                this.tooltipBall = null;
                this.isMouseOverTooltip = false;
                this.isMouseOverBall = false;
                clearTimeout(this.tooltipCloseTimeout);
                this.logDebug('Tooltip removed on outside click');
            }
        };

        // Remove existing handler if present
        if (this.config.parentContainer._clickHandler) {
            document.removeEventListener('click', this.config.parentContainer._clickHandler);
        }
        this.config.parentContainer._clickHandler = handleClick;
        document.addEventListener('click', handleClick);
        this.logDebug('Global click handler attached');
    }

    calculatePlanetaryHours() {
        this.logDebug('Calculating planetary hours');
        const date = new Date(this.config.data.date);
        const dayOfWeek = this.daysOfWeek[date.getDay()];
        const planetOfDay = this.dayToPlanet[dayOfWeek];

        // Mock sunrise/sunset times (replace with real astronomical data)
        const sunrise = new Date(date);
        sunrise.setHours(5, 49, 0, 0); // 5:49 AM
        const sunset = new Date(date);
        sunset.setHours(18, 58, 0, 0); // 6:58 PM
        const nextSunrise = new Date(date);
        nextSunrise.setDate(date.getDate() + 1);
        nextSunrise.setHours(5, 48, 0, 0); // Next day's sunrise

        // Calculate day and night durations
        const dayDuration = (sunset - sunrise) / 1000 / 60; // Minutes
        const nightDuration = (nextSunrise - sunset) / 1000 / 60; // Minutes
        const dayHourLength = dayDuration / 12;
        const nightHourLength = nightDuration / 12;

        // Current time for header
        const currentTime = date;

        // Generate planetary hours
        const dayHours = [];
        const nightHours = [];
        let currentPlanetIndex = this.planetaryOrder.indexOf(planetOfDay);

        // Day hours
        for (let i = 0; i < 12; i++) {
            const start = new Date(sunrise.getTime() + i * dayHourLength * 60 * 1000);
            const end = new Date(sunrise.getTime() + (i + 1) * dayHourLength * 60 * 1000);
            const planet = this.planetaryOrder[currentPlanetIndex % 7];
            const modifiers = this.getModifiers(start, planetOfDay);
            dayHours.push({ start, end, planet, modifiers });
            currentPlanetIndex++;
        }

        // Night hours
        for (let i = 0; i < 12; i++) {
            const start = new Date(sunset.getTime() + i * nightHourLength * 60 * 1000);
            const end = new Date(sunset.getTime() + (i + 1) * nightHourLength * 60 * 1000);
            const planet = this.planetaryOrder[currentPlanetIndex % 7];
            const modifiers = this.getModifiers(start, planetOfDay);
            nightHours.push({ start, end, planet, modifiers });
            currentPlanetIndex++;
        }

        // Determine ruler of the hour
        let rulerOfHour = 'unknown';
        let currentHour = null;

        // Check day hours
        currentHour = dayHours.find(
            hour => currentTime >= hour.start && currentTime < hour.end
        );
        if (currentHour) {
            rulerOfHour = currentHour.planet;
            this.logDebug(`Current time ${this.formatTime(currentTime)} is in day hour, ruler: ${rulerOfHour}`);
        } else {
            // Check night hours
            currentHour = nightHours.find(
                hour => currentTime >= hour.start && currentTime < hour.end
            );
            if (currentHour) {
                rulerOfHour = currentHour.planet;
                this.logDebug(`Current time ${this.formatTime(currentTime)} is in night hour, ruler: ${rulerOfHour}`);
            } else {
                this.logDebug(`Current time ${this.formatTime(currentTime)} is outside day/night hours`);
            }
        }

        return {
            dayOfWeek,
            planetOfDay,
            rulerOfHour,
            currentTime,
            dayHourLength,
            nightHourLength,
            dayHours,
            nightHours
        };
    }

    getModifiers(date, planetOfDay) {
        const modifiers = [];

        // Check retrogrades
        this.config.data.planetRetrogrades.forEach(retro => {
            if (date >= retro.retrogradeStart && date <= retro.retrogradeEnd) {
                modifiers.push({ type: 'retrograde', planet: retro.planet, date });
            }
        });

        // Check transits for planet of the day
        this.config.data.planetTransits.forEach(transit => {
            if (
                transit.date.toDateString() === date.toDateString() &&
                this.config.data.planetRetrogrades.some(
                    retro => retro.planet === planetOfDay
                )
            ) {
                modifiers.push({ type: 'transit', sign: transit.sign, date: transit.date });
            }
        });

        return modifiers;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}:${mins.toString().padStart(2, '0')} hrs`;
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
        this.logDebug(`Creating tooltip for ${ball.type} ${ball[ball.type === 'retrograde' ? 'planet' : 'sign']}`);

        // Remove existing tooltip
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
            this.isMouseOverTooltip = false;
            clearTimeout(this.tooltipCloseTimeout);
            this.logDebug('Existing tooltip removed');
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'info-tooltip';
        tooltip.id = `tooltip-${Date.now()}`;

        // Set content
        let content = '';
        if (ball.type === 'retrograde') {
            content = `${ball.date.toLocaleDateString()}\n${planets[ball.planet]} ${ball.planet.charAt(0).toUpperCase() + ball.planet.slice(1)}\nState: Retrograde`;
        } else {
            content = `${ball.date.toLocaleDateString()}\nTransit: ${signs[ball.sign]} ${ball.sign.charAt(0).toUpperCase() + ball.sign.slice(1)}`;
        }
        tooltip.textContent = content;

        // Position tooltip (50% overlap, viewport-relative)
        try {
            const ballRect = event.target.getBoundingClientRect();
            const radius = ballRect.width / 2; // 10px (half of 20px ball)
            const overlap = radius * 0.5; // 50% overlap (5px)
            let tooltipLeft, tooltipTop;
            let placement = 'right';

            const tooltipWidth = 200;
            const tooltipHeight = 80;

            // Calculate position relative to viewport
            tooltipLeft = ballRect.left + radius + overlap; // Right placement: left edge overlaps ball
            tooltipTop = ballRect.top + radius - tooltipHeight / 2; // Center vertically

            // Adjust for viewport boundaries
            if (tooltipLeft + tooltipWidth > window.innerWidth) {
                // Left placement: right edge overlaps ball
                placement = 'left';
                tooltipLeft = ballRect.left - tooltipWidth / 2 - overlap - radius; // Right edge at ball's left + radius - overlap
            }
            if (tooltipTop + tooltipHeight > window.innerHeight) {
                tooltipTop = window.innerHeight - tooltipHeight - 2;
            }
            if (tooltipTop < 0) {
                tooltipTop = 2;
            }
            if (placement === 'left' && tooltipLeft < 0) {
                // Revert to right if left placement is off-screen
                placement = 'right';
                tooltipLeft = ballRect.left + radius + overlap;
                if (tooltipLeft + tooltipWidth > window.innerWidth) {
                    tooltipLeft = window.innerWidth - tooltipWidth - 2;
                }
            }

            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${tooltipTop}px`;

            // Calculate and log the tooltip's right edge for verification
            const tooltipRight = tooltipLeft + tooltipWidth;
            const expectedRight = placement === 'left' ? ballRect.left - overlap : undefined;
            this.logDebug(`Tooltip positioned: placement=${placement}, left=${tooltipLeft}, top=${tooltipTop}, right=${tooltipRight}, expectedRight=${expectedRight}, ballRect=${JSON.stringify({
                left: ballRect.left,
                top: ballRect.top,
                width: ballRect.width,
                height: ballRect.height
            })}, viewport=${JSON.stringify({
                width: window.innerWidth,
                height: window.innerHeight
            })}`);
        } catch (error) {
            console.error('Tooltip positioning failed:', error);
            tooltip.style.left = '100px';
            tooltip.style.top = '100px';
            this.logDebug('Using fallback tooltip position: left=100px, top=100px');
        }

        // Append to document.body
        try {
            document.body.appendChild(tooltip);
            this.currentTooltip = tooltip;
            this.tooltipBall = ball;
            this.logDebug(`Tooltip appended: id=${tooltip.id}`);
        } catch (error) {
            console.error('Failed to append tooltip to document.body:', error);
            this.logDebug('Tooltip append failed');
            return;
        }

        // Mouse handlers for tooltip
        tooltip.addEventListener('mouseover', () => {
            this.isMouseOverTooltip = true;
            clearTimeout(this.tooltipCloseTimeout);
            this.logDebug('Tooltip mouseover; keeping open');
        });

        tooltip.addEventListener('mouseout', () => {
            this.isMouseOverTooltip = false;
            this.updateTooltipState();
            this.logDebug('Tooltip mouseout');
        });
    }

    updateTooltipState() {
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
                this.logDebug('Tooltip removed; mouse outside ball and tooltip');
            }
        }, 100); // 100ms debounce
    }

    renderHeader(container, planetaryHours) {
        this.logDebug('Rendering header');
        const header = document.createElement('div');
        header.className = 'planetary-hours-header';
        header.style.backgroundColor =
            this.config.data.colorPalette.planet[planetaryHours.planetOfDay].computed.average;

        const title = document.createElement('h2');
        title.textContent = `Planetary Hours for ${this.config.data.location} for ${planetaryHours.dayOfWeek}, ${planetaryHours.currentTime.toLocaleDateString()}`;
        header.appendChild(title);

        const info = document.createElement('div');
        info.className = 'planetary-hours-info';
        info.innerHTML = `
      Current Time: ${this.formatTime(planetaryHours.currentTime)}<br>
      Ruler of the Day: ${planetaryHours.planetOfDay.charAt(0).toUpperCase() + planetaryHours.planetOfDay.slice(1)}<br>
      Ruler of the Hour: ${planetaryHours.rulerOfHour.charAt(0).toUpperCase() + planetaryHours.rulerOfHour.slice(1)}<br>
      Length of Planetary Hours (day): ${this.formatDuration(planetaryHours.dayHourLength)}<br>
      Length of Planetary Hours (night): ${this.formatDuration(planetaryHours.nightHourLength)}
    `;
        header.appendChild(info);

        container.appendChild(header);
    }

    renderTables(container, planetaryHours) {
        this.logDebug('Rendering tables');

        const tablesContainer = document.createElement('div');
        tablesContainer.className = 'planetary-hours-tables';

        // Find current hour for highlighting
        const currentTime = this.config.data.date;
        const currentDayHour = planetaryHours.dayHours.find(
            hour => currentTime >= hour.start && currentTime < hour.end
        );
        const currentNightHour = planetaryHours.nightHours.find(
            hour => currentTime >= hour.start && currentTime < hour.end
        );

        // Day table
        const dayTableContainer = document.createElement('div');
        dayTableContainer.className = 'planetary-hours-table-container';
        const dayTitle = document.createElement('h3');
        dayTitle.textContent = 'Planetary Hours of the Day';
        dayTableContainer.appendChild(dayTitle);

        const dayTable = document.createElement('table');
        dayTable.className = 'planetary-hours-table day';
        const dayTbody = document.createElement('tbody');
        dayTable.innerHTML = `
      <thead>
        <tr>
          <th>Hour</th>
          <th>Start - End</th>
          <th>Ruler of Hour</th>
          <th>Modifiers</th>
        </tr>
      </thead>
    `;
        planetaryHours.dayHours.forEach((hour, index) => {
            const isCurrent = currentDayHour && hour.start.getTime() === currentDayHour.start.getTime();
            const tr = document.createElement('tr');
            if (isCurrent) tr.className = 'current-row';
            tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${this.formatTime(hour.start)} - ${this.formatTime(hour.end)}</td>
        <td>${hour.planet.charAt(0).toUpperCase() + hour.planet.slice(1)}</td>
        <td class="modifiers">
          ${hour.modifiers.map((mod, modIndex) => {
                const isRetrograde = mod.type === 'retrograde';
                const key = isRetrograde ? mod.planet : mod.sign;
                const paletteType = isRetrograde ? 'planet' : 'sign';
                const baseColor = this.config.data.colorPalette[paletteType][key]?.computed?.average || '#eee';
                const highlightColor = this.lightenColor(baseColor, 50);
                const gradient = `radial-gradient(circle at 30% 30%, ${highlightColor}, ${baseColor})`;
                const hoverGradient = !isRetrograde ? `radial-gradient(circle at center, ${baseColor}, ${this.config.data.colorPalette.sign[key]?.computed?.lightest || '#fff'})` : '';
                return `
              <span 
                class="modifier-ball ${isRetrograde ? 'retrograde' : 'transit'}"
                id="modifier-ball-${index}-${modIndex}-day"
                title="${isRetrograde ? `${mod.planet} retrograde` : `Transit to ${mod.sign}`}"
                style="background: ${gradient}; ${!isRetrograde ? `--hover-gradient: ${hoverGradient};` : ''}"
                data-type="${mod.type}"
                data-key="${key}"
                data-date="${mod.date.toISOString()}"
              >
                ${isRetrograde ? planets[mod.planet] : signs[mod.sign]}
              </span>
            `;
            }).join('')}
        </td>
      `;
            dayTbody.appendChild(tr);
        });
        dayTable.appendChild(dayTbody);
        dayTableContainer.appendChild(dayTable);
        tablesContainer.appendChild(dayTableContainer);

        // Night table
        const nightTableContainer = document.createElement('div');
        nightTableContainer.className = 'planetary-hours-table-container';
        const nightTitle = document.createElement('h3');
        nightTitle.textContent = 'Planetary Hours of the Night';
        nightTableContainer.appendChild(nightTitle);

        const nightTable = document.createElement('table');
        nightTable.className = 'planetary-hours-table night';
        const nightTbody = document.createElement('tbody');
        nightTable.innerHTML = `
      <thead>
        <tr>
          <th>Hour</th>
          <th>Start - End</th>
          <th>Ruler of Hour</th>
          <th>Modifiers</th>
        </tr>
      </thead>
    `;
        planetaryHours.nightHours.forEach((hour, index) => {
            const isCurrent = currentNightHour && hour.start.getTime() === currentNightHour.start.getTime();
            const tr = document.createElement('tr');
            if (isCurrent) tr.className = 'current-row';
            tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${this.formatTime(hour.start)} - ${this.formatTime(hour.end)}</td>
        <td>${hour.planet.charAt(0).toUpperCase() + hour.planet.slice(1)}</td>
        <td class="modifiers">
          ${hour.modifiers.map((mod, modIndex) => {
                const isRetrograde = mod.type === 'retrograde';
                const key = isRetrograde ? mod.planet : mod.sign;
                const paletteType = isRetrograde ? 'planet' : 'sign';
                const baseColor = this.config.data.colorPalette[paletteType][key]?.computed?.average || '#eee';
                const highlightColor = this.lightenColor(baseColor, 50);
                const gradient = `radial-gradient(circle at 30% 30%, ${highlightColor}, ${baseColor})`;
                const hoverGradient = !isRetrograde ? `radial-gradient(circle at center, ${baseColor}, ${this.config.data.colorPalette.sign[key]?.computed?.lightest || '#fff'})` : '';
                return `
              <span 
                class="modifier-ball ${isRetrograde ? 'retrograde' : 'transit'}"
                id="modifier-ball-${index}-${modIndex}-night"
                title="${isRetrograde ? `${mod.planet} retrograde` : `Transit to ${mod.sign}`}"
                style="background: ${gradient}; ${!isRetrograde ? `--hover-gradient: ${hoverGradient};` : ''}"
                data-type="${mod.type}"
                data-key="${key}"
                data-date="${mod.date.toISOString()}"
              >
                ${isRetrograde ? planets[mod.planet] : signs[mod.sign]}
              </span>
            `;
            }).join('')}
        </td>
      `;
            nightTbody.appendChild(tr);
        });
        nightTable.appendChild(nightTbody);
        nightTableContainer.appendChild(nightTable);
        tablesContainer.appendChild(nightTableContainer);

        // Add event listeners to modifier balls using event delegation
        tablesContainer.addEventListener('click', (event) => {
            const ball = event.target.closest('.modifier-ball');
            if (ball) {
                event.stopPropagation(); // Prevent global click handler from closing tooltip immediately
                const type = ball.dataset.type;
                const key = ball.dataset.key;
                const date = new Date(ball.dataset.date);
                this.createTooltip({ type, [type === 'retrograde' ? 'planet' : 'sign']: key, date, id: ball.id }, event);
                this.isMouseOverBall = true;
                this.tooltipBall = { type, [type === 'retrograde' ? 'planet' : 'sign']: key, date, id: ball.id };
                this.logDebug(`Ball clicked: ${type} ${key}, id=${ball.id}`);
            }
        });

        tablesContainer.addEventListener('mouseover', (event) => {
            const ball = event.target.closest('.modifier-ball');
            if (ball) {
                const type = ball.dataset.type;
                const key = ball.dataset.key;
                const date = new Date(ball.dataset.date);
                const ballId = ball.id;
                const isTooltipBall = this.tooltipBall &&
                    this.tooltipBall.id === ballId &&
                    this.tooltipBall.type === type &&
                    this.tooltipBall[type === 'retrograde' ? 'planet' : 'sign'] === key &&
                    this.tooltipBall.date.getTime() === date.getTime();
                this.isMouseOverBall = isTooltipBall;
                this.logDebug(`Mouse over ball: id=${ballId}, isTooltipBall=${isTooltipBall}`);
                if (!isTooltipBall && this.currentTooltip) {
                    this.updateTooltipState();
                }
            }
        });

        tablesContainer.addEventListener('mouseout', (event) => {
            const ball = event.target.closest('.modifier-ball');
            if (ball) {
                this.isMouseOverBall = false;
                this.logDebug(`Mouse out of ball: id=${ball.id}`);
                this.updateTooltipState();
            }
        });

        // Append tablesContainer to container
        try {
            container.appendChild(tablesContainer);
            this.logDebug('Tables container appended to main container');
        } catch (error) {
            console.error('Failed to append tablesContainer:', error);
            this.logDebug('Tables container append failed');
        }
    }
}