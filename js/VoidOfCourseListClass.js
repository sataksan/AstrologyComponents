const signs = {
    aries: '♈︎', taurus: '♉︎', gemini: '♊︎', cancer: '♋︎', leo: '♌︎', virgo: '♍︎',
    libra: '♎︎', scorpio: '♏︎', sagittarius: '♐︎', capricorn: '♑︎', aquarius: '♒︎', pisces: '♓︎'
};

const planets = {
    mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
    uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷'
};

// Utility function to format dates
const formatDate = (date) => {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).replace(',', '');
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

class VoidOfCourseListClass {
    constructor(config) {
        this.config = {
            data: {
                colorPalette,
                date: new Date(),
                voidsOfCourse: [],
                debug: false,
                duration: 30 // Default to 30 days
            },
            parentContainer: null,
            margin: { left: 0, top: 0, right: 0, bottom: 0 },
            ...config
        };

        // Normalize margin if a single number is provided
        if (typeof this.config.margin === 'number') {
            this.config.margin = {
                left: this.config.margin,
                top: this.config.margin,
                right: this.config.margin,
                bottom: this.config.margin
            };
        }

        // Ensure margin properties are numbers
        this.config.margin = {
            left: this.config.margin.left || 0,
            top: this.config.margin.top || 0,
            right: this.config.margin.right || 0,
            bottom: this.config.margin.bottom || 0
        };

        // Debug log
        if (this.config.data.debug) {
            console.log('VoidOfCourseListClass initialized with config:', this.config);
        }

        // Tooltip state
        this.currentTooltip = null;
        this.isMouseOverTooltip = false;

        // Render the component
        this.render();
    }

    createTooltip(ball, event) {
        // Remove existing tooltip
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
            this.isMouseOverTooltip = false;
            if (this.config.data.debug) {
                console.log('Existing tooltip removed');
            }
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'info-tooltip';
        tooltip.id = 'info-tooltip-' + Date.now();

        // Determine state
        const now = new Date();
        let state;
        if (ball.date > now) {
            state = 'Future Transit';
        } else if (ball.isBefore && ball.dateStart <= now && now <= ball.dateEnd) {
            state = 'Void of Course';
        } else if (!ball.isBefore && ball.dateStart <= now && now <= ball.dateEnd) {
            state = 'Void of Course';
        } else {
            state = 'In Transit';
        }

        // Set content
        const content = `${formatDate(ball.date)}\n${signs[ball.sign]} ${ball.sign.charAt(0).toUpperCase() + ball.sign.slice(1)}\nState: ${state}`;
        tooltip.textContent = content;

        // Position tooltip (50% overlap)
        try {
            const containerRect = this.config.parentContainer.getBoundingClientRect();
            const ballRect = ball.element.getBoundingClientRect();
            const radius = 10; // Half of 20px ball
            const overlap = radius * 0.5; // 50% overlap
            const tooltipWidth = 200;
            const tooltipHeight = 80;
            let tooltipLeft, tooltipTop;
            let placement = 'right';

            // Right placement
            tooltipLeft = ballRect.left + radius - tooltipWidth / 2 + overlap;
            tooltipTop = ballRect.top + radius - tooltipHeight / 2;
            if (tooltipLeft + tooltipWidth > containerRect.right) {
                // Left placement
                placement = 'left';
                tooltipLeft = ballRect.left - radius + tooltipWidth / 2 - overlap - tooltipWidth;
            }
            // Adjust vertical position
            if (tooltipTop + tooltipHeight > containerRect.bottom) {
                tooltipTop = containerRect.bottom - tooltipHeight - 2;
            }
            if (tooltipTop < containerRect.top) {
                tooltipTop = containerRect.top + 2;
            }
            if (placement === 'left' && tooltipLeft < containerRect.left) {
                placement = 'right';
                tooltipLeft = ballRect.left + radius - tooltipWidth / 2 + overlap;
                if (tooltipLeft + tooltipWidth > window.innerWidth) {
                    tooltipLeft = window.innerWidth - tooltipWidth - 2;
                }
            }

            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${tooltipTop}px`;

            if (this.config.data.debug) {
                console.log('Tooltip placement:', {
                    placement,
                    ballX: ballRect.left,
                    ballY: ballRect.top,
                    radius,
                    overlap,
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
            if (this.config.data.debug) {
                console.log('Tooltip created:', { id: tooltip.id, content });
            }
        } catch (error) {
            console.error('Failed to append tooltip:', error);
            return;
        }

        // Mouse handlers for tooltip
        tooltip.addEventListener('mouseover', () => {
            this.isMouseOverTooltip = true;
            if (this.config.data.debug) {
                console.log('Tooltip mouseover; keeping open');
            }
        });

        tooltip.addEventListener('mouseout', (event) => {
            this.isMouseOverTooltip = false;
            setTimeout(() => {
                if (!this.isMouseOverTooltip && this.currentTooltip) {
                    this.currentTooltip.remove();
                    this.currentTooltip = null;
                    if (this.config.data.debug) {
                        console.log('Tooltip removed on mouseout');
                    }
                }
            }, 100);
        });
    }

    render() {
        if (!this.config.parentContainer) {
            console.error('Parent container not specified');
            return;
        }

        // Clear the container
        this.config.parentContainer.innerHTML = '';

        // Create main container
        const container = document.createElement('div');
        container.className = 'void-of-course-container';
        container.style.margin = `${this.config.margin.top}px ${this.config.margin.right}px ${this.config.margin.bottom}px ${this.config.margin.left}px`;

        // Create header
        const header = document.createElement('div');
        header.className = 'void-of-course-header';
        header.textContent = 'Voids of Course';
        header.style.backgroundColor = this.config.data.colorPalette.planet.moon.computed.average;

        // Create table
        const table = document.createElement('table');
        table.className = 'void-of-course-table';

        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Start - End', 'Transition'].forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement('tbody');
        const startDate = new Date(this.config.data.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + this.config.data.duration);
        const now = new Date();

        // Filter voids of course within the date range
        const filteredVoids = this.config.data.voidsOfCourse.filter(voc => {
            const start = new Date(voc.dateStart);
            return start >= startDate && start <= endDate;
        });

        // Find current or most recent void of course
        let highlightIndex = -1;
        let mostRecentEnd = null;
        filteredVoids.forEach((voc, index) => {
            const start = new Date(voc.dateStart);
            const end = new Date(voc.dateEnd);
            if (start <= now && now <= end) {
                highlightIndex = index; // Current void
            } else if (end < now && (!mostRecentEnd || end > mostRecentEnd)) {
                mostRecentEnd = end;
                highlightIndex = index; // Most recent ended void
            }
        });

        filteredVoids.forEach((voc, index) => {
            const row = document.createElement('tr');
            if (index === highlightIndex) {
                row.className = 'highlight-row';
            }

            // Start - End column
            const dateCell = document.createElement('td');
            dateCell.textContent = `${formatDate(new Date(voc.dateStart))} - ${formatDate(new Date(voc.dateEnd))}`;

            // Transition column
            const transitionCell = document.createElement('td');
            transitionCell.style.display = 'flex';
            transitionCell.style.alignItems = 'center';
            transitionCell.style.gap = '5px';

            // Sign Before ball
            const signBeforeBall = document.createElement('div');
            signBeforeBall.className = 'sign-ball';
            signBeforeBall.textContent = signs[voc.signBefore];
            const signBeforeColor = this.config.data.colorPalette.sign[voc.signBefore].computed.average;
            const signBeforeHighlight = lightenColor(signBeforeColor, 50);
            signBeforeBall.style.background = `radial-gradient(circle at 30% 30%, ${signBeforeHighlight}, ${signBeforeColor})`;
            signBeforeBall.addEventListener('click', (event) => {
                this.createTooltip({
                    element: signBeforeBall,
                    sign: voc.signBefore,
                    date: new Date(voc.dateStart),
                    dateStart: new Date(voc.dateStart),
                    dateEnd: new Date(voc.dateEnd),
                    isBefore: true
                }, event);
            });

            // Arrow
            const arrow = document.createElement('span');
            arrow.textContent = ' --> ';
            arrow.style.margin = '0 5px';

            // Sign After ball
            const signAfterBall = document.createElement('div');
            signAfterBall.className = 'sign-ball';
            if (index === highlightIndex && mostRecentEnd && new Date(voc.dateEnd) <= now) {
                signAfterBall.classList.add('highlight-ball');
                const lighterHighlight = lightenColor(this.config.data.colorPalette.sign[voc.signAfter].computed.lightest, 20);
                signAfterBall.style.background = `radial-gradient(circle at 30% 30%, ${lighterHighlight}, ${this.config.data.colorPalette.sign[voc.signAfter].computed.lightest})`;
            } else {
                const signAfterColor = this.config.data.colorPalette.sign[voc.signAfter].computed.average;
                const signAfterHighlight = lightenColor(signAfterColor, 50);
                signAfterBall.style.background = `radial-gradient(circle at 30% 30%, ${signAfterHighlight}, ${signAfterColor})`;
            }
            signAfterBall.textContent = signs[voc.signAfter];
            signAfterBall.addEventListener('click', (event) => {
                this.createTooltip({
                    element: signAfterBall,
                    sign: voc.signAfter,
                    date: new Date(voc.dateEnd),
                    dateStart: new Date(voc.dateStart),
                    dateEnd: new Date(voc.dateEnd),
                    isBefore: false
                }, event);
            });

            // Hover effects
            [signBeforeBall, signAfterBall].forEach(ball => {
                ball.addEventListener('mouseenter', () => {
                    if (!ball.classList.contains('highlight-ball')) {
                        ball.style.transform = 'scale(1.2)';
                    }
                });
                ball.addEventListener('mouseleave', () => {
                    if (!ball.classList.contains('highlight-ball')) {
                        ball.style.transform = 'scale(1)';
                    }
                });
            });

            transitionCell.appendChild(signBeforeBall);
            transitionCell.appendChild(arrow);
            transitionCell.appendChild(signAfterBall);

            // Append cells to row
            row.appendChild(dateCell);
            row.appendChild(transitionCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        // Append elements to container
        container.appendChild(header);
        container.appendChild(table);
        this.config.parentContainer.appendChild(container);

        // Click handler to close tooltip when clicking outside
        const handleClickOutside = (event) => {
            if (this.currentTooltip && !this.currentTooltip.contains(event.target) && !event.target.classList.contains('sign-ball')) {
                this.currentTooltip.remove();
                this.currentTooltip = null;
                this.isMouseOverTooltip = false;
                if (this.config.data.debug) {
                    console.log('Tooltip removed on outside click');
                }
            }
        };

        this.config.parentContainer.removeEventListener('click', this.config.parentContainer._clickHandler);
        this.config.parentContainer._clickHandler = handleClickOutside;
        this.config.parentContainer.addEventListener('click', handleClickOutside);

        // Debug log
        if (this.config.data.debug) {
            console.log('Rendered voids of course:', filteredVoids, 'Highlighted index:', highlightIndex);
        }
    }
}