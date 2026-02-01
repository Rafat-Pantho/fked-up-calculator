/* =============================================================================
   THE USELESS CALCULATOR - Frontend Logic
   sioca - 911ab Edition
   ============================================================================= */

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Session ID for the Global Memory feature (random per browser session)
const SESSION_ID = 'session_' + Math.random().toString(36).substring(2, 15);

// =============================================================================
// PRANK CONFIGURATION
// =============================================================================

const PRANK_CONFIG = {
    runawayButton: {
        enabled: true,
        chance: 0.10  // 10% chance on mouseover
    },
    calculatorSneeze: {
        enabled: true,
        chance: 0.05  // 5% chance after calculation
    },
    fakePremium: {
        enabled: true,
        chance: 0.10  // 10% chance on any button click
    },
    fakeBSOD: {
        enabled: true,
        chance: 0.01  // 1% chance on calculation
    },
    // New Visual Pranks
    upsideDown: {
        enabled: true,
        chance: 0.03  // 3% chance after calculation
    },
    discoMode: {
        enabled: true,
        chance: 0.02  // 2% chance after calculation
    },
    shrinking: {
        enabled: true,
        chance: 0.02  // 2% chance after calculation
    },
    buttonSwap: {
        enabled: true,
        chance: 0.05  // 5% chance after calculation
    },
    cursors: {
        enabled: true,
        chance: 0.03  // 3% chance after calculation
    },
    // Audio Pranks
    divisionFart: {
        enabled: true,
        chance: 1.0  // 100% on division click
    },
    sadTrombone: {
        enabled: true,
        chance: 1.0  // 100% on gaslighting/failure
    }
};

// =============================================================================
// AUDIO PRANKS
// =============================================================================

/**
 * Play a sound effect by audio element ID
 * @param {string} id - The ID of the audio element (without #)
 */
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;  // Reset to start
        audio.play().catch(err => {
            // Browser may block autoplay, that's okay
            console.log('🔇 Audio blocked by browser:', err.message);
        });
    }
}

// =============================================================================
// STATE
// =============================================================================

let currentExpression = '';
let lastAnswer = 0;
let isCalculating = false;
let solarPanelTimer = null;
let isLowPower = false;
let justCalculated = false;  // Track if last action was '='

// Gaslighting mode state
let gaslightingData = null;
let gaslightEnterHandler = null;
let gaslightLeaveHandler = null;

// Runaway button state
let runawayResetTimer = null;
let isRunawayActive = false;

// Premium popup state - triggers after 5-7 equals presses
let equalsPressCount = 0;
let nextPremiumTrigger = Math.floor(Math.random() * 3) + 5; // Random 5-7

// Shrinking prank state
let isShrinking = false;

// Button swap - track original positions
let originalButtonPositions = new Map();

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const inputDisplay = document.getElementById('input-display');
const outputDisplay = document.getElementById('output-display');
const outputAuthor = document.getElementById('output-author');
const gapSection = document.getElementById('gap-section');
const display = document.querySelector('.display');
const statusMemory = document.getElementById('status-memory');

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

function updateInputDisplay() {
    inputDisplay.textContent = currentExpression || '0';
}

function updateOutputDisplay(text, author = '', mode = '') {
    // Clear previous mode classes
    outputDisplay.classList.remove('mode-gaslighting', 'mode-error');
    
    // Add mode-specific class
    if (mode) {
        outputDisplay.classList.add(`mode-${mode}`);
    }
    
    outputDisplay.querySelector('.output-text')?.remove();
    
    const outputText = document.createElement('span');
    outputText.className = 'output-text';
    outputText.textContent = text;
    outputDisplay.appendChild(outputText);
    
    outputAuthor.textContent = author;
}

function updateGapSection(text, isSpinner = false, asciiArt = null) {
    gapSection.innerHTML = '';
    
    if (isSpinner) {
        const spinner = document.createElement('div');
        spinner.className = 'gap-spinner';
        gapSection.appendChild(spinner);
        
        const loadingText = document.createElement('div');
        loadingText.className = 'gap-text';
        loadingText.textContent = text;
        gapSection.appendChild(loadingText);
    } else if (asciiArt) {
        const ascii = document.createElement('pre');
        ascii.className = 'gap-ascii';
        ascii.textContent = asciiArt;
        gapSection.appendChild(ascii);
    } else {
        const gapText = document.createElement('div');
        gapText.className = 'gap-text';
        gapText.textContent = text;
        gapSection.appendChild(gapText);
    }
}

function clearOutput() {
    updateOutputDisplay('');
    outputAuthor.textContent = '';
    updateGapSection('Ready to calculate...');
}

// =============================================================================
// CALCULATION LOGIC
// =============================================================================

async function calculate() {
    if (!currentExpression || isCalculating) return;
    
    isCalculating = true;
    
    // Clear any previous gaslighting state before new calculation
    clearGaslightingState();
    
    // Show loading state
    const loadingMessages = [
        'Consulting the void...',
        'Asking a stranger for help...',
        'Calculating soul weight...',
        'Dividing by almost zero...',
        'Reticulating splines...',
        'Summoning math demons...',
        'Counting on fingers...',
        'Checking with the universe...',
        'Running chaos algorithms...',
    ];
    updateGapSection(loadingMessages[Math.floor(Math.random() * loadingMessages.length)], true);
    updateOutputDisplay('...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                expression: currentExpression
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            handleErrorResponse(data);
            return;
        }
        
        // Store actual result for Ans button and continued calculations
        if (data.actual_result !== null && data.actual_result !== undefined) {
            lastAnswer = data.actual_result;
        }
        
        // Check if response should trigger scream mode
        const screamTriggers = ['SYNTAX ERROR', 'Black Hole', 'SYNTAX_SCREAM', 'Math.exe'];
        const responseText = (data.output || '') + (data.message || '');
        const shouldScream = screamTriggers.some(trigger => 
            responseText.toUpperCase().includes(trigger.toUpperCase())
        );
        
        if (shouldScream && Math.random() < 0.3) {
            // 30% chance to scream on trigger words even in success
            triggerSyntaxScream(data.output || 'SYNTAX ERROR');
        } else {
            // Handle different modes normally
            handleChaosResponse(data);
        }
        
        // Mark that we just calculated - for auto-clear logic
        justCalculated = true;
        
        // =====================================================
        // POST-CALCULATION PRANKS
        // =====================================================
        
        // Try interactive overlays first (8% chance)
        if (!maybeTriggerRandomOverlay()) {
            // Try to trigger BSOD (1% chance) - highest priority prank
            if (!maybeTriggerBSOD()) {
                // If no BSOD, try Calculator Sneeze (5% chance)
                maybeCalculatorSneeze();
            }
        }
        
        // Update the Useless Leaderboard stats
        fetchStats();
        
    } catch (error) {
        console.error('API Error:', error);
        updateGapSection('Connection lost to the void.');
        updateOutputDisplay('Error: Calculator union on strike.');
    } finally {
        isCalculating = false;
    }
}

function handleChaosResponse(data) {
    const mode = data.mode;
    
    switch (mode) {
        case 'gaslighting':
            handleGaslightingMode(data);
            break;
        
        case 'unit_converter':
            updateGapSection(data.message || 'Converting...');
            updateOutputDisplay(data.output + '\n' + data.converted, '', 'unit_converter');
            break;
        
        case 'literal':
            if (data.ascii_art) {
                updateGapSection('', false, data.ascii_art);
            } else {
                updateGapSection(data.message || '');
            }
            updateOutputDisplay(data.output, '', 'literal');
            break;
        
        case 'time_traveler':
            handleTimeTravelerMode(data);
            break;
        
        case 'financial_advisor':
            updateGapSection('💰 ' + (data.tip || 'Financial advice incoming...'));
            updateOutputDisplay(data.output, '', 'financial');
            break;
        
        case 'nonsense_quote':
            updateGapSection('📜 Words of wisdom...');
            updateOutputDisplay(data.output, data.author, 'quote');
            break;
        
        case 'pure_nonsense':
            updateGapSection(data.message || 'The void speaks...');
            updateOutputDisplay(data.output, '', 'nonsense');
            break;
        
        default:
            updateGapSection('Result calculated.');
            updateOutputDisplay(data.output || 'Unknown response');
    }
}

function handleGaslightingMode(data) {
    // Clear any previous gaslighting state first
    clearGaslightingState();
    
    // 🎺 SAD TROMBONE: Play on gaslighting mode
    if (PRANK_CONFIG.sadTrombone.enabled) {
        playSound('sad-trombone');
    }
    
    updateGapSection('Result verified. Probably.');
    
    // Store gaslighting data for hover functionality
    gaslightingData = {
        realAnswer: data.output,
        fakeAnswer: data.fake_output || data.output
    };
    
    // Show real answer first
    updateOutputDisplay(data.output, '', 'gaslighting');
    
    // After 2 seconds, silently change to fake answer and enable hover
    setTimeout(() => {
        if (gaslightingData && gaslightingData.fakeAnswer) {
            outputDisplay.classList.add('mode-gaslighting');
            const outputText = outputDisplay.querySelector('.output-text');
            if (outputText) {
                outputText.textContent = gaslightingData.fakeAnswer;
            }
            updateGapSection('Wait, let me double-check...');
            
            // Add gaslighting visual indicator to display
            display.classList.add('gaslighting-active');
            
            // Setup persistent hover handlers
            setupGaslightingHover();
        }
    }, 2000);
}

function setupGaslightingHover() {
    // Create hover handlers that reference current gaslightingData
    gaslightEnterHandler = function() {
        if (!gaslightingData) return;
        const outputText = outputDisplay.querySelector('.output-text');
        if (outputText) {
            outputText.textContent = gaslightingData.realAnswer;
            updateGapSection('Hmm, that looks right.');
        }
    };
    
    gaslightLeaveHandler = function() {
        if (!gaslightingData) return;
        const outputText = outputDisplay.querySelector('.output-text');
        if (outputText) {
            outputText.textContent = gaslightingData.fakeAnswer;
            updateGapSection('Or was it...?');
        }
    };
    
    // Add the event listeners
    outputDisplay.addEventListener('mouseenter', gaslightEnterHandler);
    outputDisplay.addEventListener('mouseleave', gaslightLeaveHandler);
}

function clearGaslightingState() {
    // Remove hover event listeners if they exist
    if (gaslightEnterHandler) {
        outputDisplay.removeEventListener('mouseenter', gaslightEnterHandler);
        gaslightEnterHandler = null;
    }
    if (gaslightLeaveHandler) {
        outputDisplay.removeEventListener('mouseleave', gaslightLeaveHandler);
        gaslightLeaveHandler = null;
    }
    
    // Clear visual indicator
    display.classList.remove('gaslighting-active');
    
    // Clear data
    gaslightingData = null;
}

function handleTimeTravelerMode(data) {
    updateGapSection('🕐 ' + data.message);
    
    if (data.time_type === 'analog') {
        // Render analog clock
        renderAnalogClock(data.current_time);
    } else {
        updateOutputDisplay(data.output, '', 'time');
    }
}

function renderAnalogClock(timeString) {
    const canvas = document.getElementById('analog-clock');
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(radius, radius);
    
    // Draw clock face
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#c8d4c0';
    ctx.fill();
    ctx.strokeStyle = '#1a2e1a';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw numbers
    ctx.font = '12px Orbitron';
    ctx.fillStyle = '#1a2e1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
        const angle = (i * Math.PI / 6) - Math.PI / 2;
        const x = Math.cos(angle) * (radius - 20);
        const y = Math.sin(angle) * (radius - 20);
        ctx.fillText(i.toString(), x, y);
    }
    
    // Parse time
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    
    // Draw hour hand
    const hourAngle = ((hours % 12) + minutes / 60) * Math.PI / 6 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hourAngle) * (radius - 50), Math.sin(hourAngle) * (radius - 50));
    ctx.strokeStyle = '#1a2e1a';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw minute hand
    const minuteAngle = (minutes + seconds / 60) * Math.PI / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(minuteAngle) * (radius - 30), Math.sin(minuteAngle) * (radius - 30));
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw second hand
    const secondAngle = seconds * Math.PI / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(secondAngle) * (radius - 25), Math.sin(secondAngle) * (radius - 25));
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a2e1a';
    ctx.fill();
    
    ctx.restore();
    
    // Show clock in output
    outputDisplay.innerHTML = '';
    const clockImg = document.createElement('img');
    clockImg.src = canvas.toDataURL();
    clockImg.style.maxWidth = '100%';
    clockImg.style.height = 'auto';
    outputDisplay.appendChild(clockImg);
}

function handleErrorResponse(data) {
    const errorText = data.error || data.output || 'ERROR';
    const message = data.message || 'Something went wrong';
    
    // 🎺 SAD TROMBONE: Play on failure/error
    if (PRANK_CONFIG.sadTrombone.enabled) {
        playSound('sad-trombone');
    }
    
    updateGapSection('💥 ' + message);
    updateOutputDisplay(errorText, '', 'error');
    
    // Check if this should trigger the SCREAM MODE
    const screamTriggers = ['SYNTAX ERROR', 'Black Hole', 'SYNTAX_SCREAM', 'Math.exe'];
    const shouldScream = screamTriggers.some(trigger => 
        errorText.toUpperCase().includes(trigger.toUpperCase()) ||
        message.toUpperCase().includes(trigger.toUpperCase())
    );
    
    if (shouldScream) {
        triggerSyntaxScream(errorText);
    } else {
        // Mild flash for regular errors
        display.classList.add('syntax-error');
        setTimeout(() => display.classList.remove('syntax-error'), 500);
    }
}

// =============================================================================
// SYNTAX SCREAM - Intense Visual Chaos
// =============================================================================

function triggerSyntaxScream(message = 'SYNTAX ERROR') {
    // Clear any gaslighting state
    clearGaslightingState();
    
    // Add scream mode to body
    document.body.classList.add('scream-mode');
    
    // Create overlay with the error message
    const overlay = document.createElement('div');
    overlay.className = 'scream-overlay';
    overlay.textContent = message.toUpperCase();
    document.body.appendChild(overlay);
    
    // Play a brief "chaos" in the display
    const chaosMessages = [
        'AAAAAHHH!!!',
        'SYSTEM PANIC',
        'MATH OVERLOAD',
        'ERROR ERROR',
        'HELP ME',
        '!!!!!!!!!',
        'NOOOOO',
        'WHY???'
    ];
    
    let chaosIndex = 0;
    const chaosInterval = setInterval(() => {
        updateGapSection(chaosMessages[chaosIndex % chaosMessages.length]);
        chaosIndex++;
    }, 150);
    
    // Remove after 2 seconds
    setTimeout(() => {
        document.body.classList.remove('scream-mode');
        overlay.remove();
        clearInterval(chaosInterval);
        updateGapSection('...that was scary.');
    }, 2000);
}

// =============================================================================
// MEMORY FUNCTIONS (M+ / MR)
// =============================================================================

async function memorySave() {
    if (!lastAnswer && lastAnswer !== 0) {
        updateGapSection('Nothing to save!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/memory/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: lastAnswer.toString(),
                session_id: SESSION_ID
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusMemory.classList.add('active');
            updateGapSection(data.message || 'Saved to the void.');
            updateOutputDisplay(data.warning || 'Value saved.', '', 'memory');
        }
    } catch (error) {
        console.error('Memory save error:', error);
        updateGapSection('Failed to save to the void.');
    }
}

async function memoryRecall() {
    updateGapSection('Reaching into the void...', true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/memory/recall?session_id=${SESSION_ID}`);
        const data = await response.json();
        
        if (data.success && data.value !== null) {
            // If we just calculated, clear first before inserting recalled value
            if (justCalculated) {
                currentExpression = '';
                justCalculated = false;
            }
            
            // Insert the recalled value into the expression
            currentExpression += data.value;
            updateInputDisplay();
            updateGapSection(data.message || 'Retrieved from a stranger.');
            updateOutputDisplay(`Recalled: ${data.value}`, '', 'memory');
        } else {
            updateGapSection(data.message || 'The void is empty.');
            updateOutputDisplay('No memories found.', '', 'memory');
        }
    } catch (error) {
        console.error('Memory recall error:', error);
        updateGapSection('The void refused to answer.');
    }
}

function memoryClear() {
    statusMemory.classList.remove('active');
    updateGapSection('Memory cleared locally.');
    lastAnswer = 0;
}

// =============================================================================
// AUTO-CLEAR LOGIC HELPER
// =============================================================================

/**
 * Check if a character is an operator
 */
function isOperator(char) {
    return ['+', '-', '*', '/', '^', '%'].includes(char);
}

/**
 * Check if a value represents an operator button
 * (handles multi-char operators like '**')
 */
function isOperatorValue(value) {
    const operators = ['+', '-', '*', '/', '**', '%', '*10**'];
    return operators.includes(value);
}

/**
 * Handle input after calculation
 * - If number/function: clear and start fresh
 * - If operator: keep result and append
 */
function handlePostCalculationInput(value, isOperatorInput) {
    if (justCalculated) {
        if (isOperatorInput) {
            // User wants to continue with the result
            // Replace expression with lastAnswer + operator
            currentExpression = lastAnswer.toString() + value;
            justCalculated = false;
        } else {
            // User wants to start fresh
            currentExpression = value;
            justCalculated = false;
            clearOutput();
        }
    } else {
        // Normal append
        currentExpression += value;
    }
    updateInputDisplay();
}

// =============================================================================
// BUTTON HANDLERS
// =============================================================================

function handleButtonClick(button) {
    const value = button.dataset.value;
    const action = button.dataset.action;
    
    if (value) {
        // Determine if this is an operator
        const isOp = isOperatorValue(value);
        
        // 💨 THE DIVISION FART: Play fart sound when division is clicked
        if ((value === '/' || value === '÷') && PRANK_CONFIG.divisionFart.enabled) {
            playSound('fart-sound');
        }
        
        // Handle special values
        if (value === 'ans') {
            handlePostCalculationInput(lastAnswer.toString(), false);
        } else {
            handlePostCalculationInput(value, isOp);
        }
    } else if (action) {
        handleAction(action);
    }
}

function handleAction(action) {
    switch (action) {
        case 'equals':
            // Try to show premium popup (every 5-7 presses)
            maybeShowPremiumPopup();
            calculate();
            break;
        
        case 'clear':
            currentExpression = '';
            justCalculated = false;
            updateInputDisplay();
            clearOutput();
            break;
        
        case 'delete':
            currentExpression = currentExpression.slice(0, -1);
            justCalculated = false;
            updateInputDisplay();
            break;
        
        case 'm+':
            memorySave();
            break;
        
        case 'mr':
            memoryRecall();
            break;
        
        case 'mc':
            memoryClear();
            break;
        
        case 'm-':
            // M- subtracts from memory (we'll just show a joke)
            updateGapSection('M- is not supported in the void.');
            break;
        
        case 'shift':
            updateGapSection('SHIFT mode activated. Nothing changed.');
            document.getElementById('status-shift')?.classList.toggle('active');
            break;
        
        case 'alpha':
            updateGapSection('ALPHA mode. You can now type letters. But why?');
            document.getElementById('status-alpha')?.classList.toggle('active');
            break;
        
        case 'mode':
            updateGapSection('Mode: CHAOS (default and only option)');
            break;
        
        case 'on':
            // Reset everything
            currentExpression = '';
            lastAnswer = 0;
            justCalculated = false;
            updateInputDisplay();
            clearOutput();
            updateGapSection('Calculator awakened. Ready for chaos.');
            restorePower();
            break;
    }
}

// =============================================================================
// KEYBOARD SUPPORT
// =============================================================================

function handleKeyboard(event) {
    const key = event.key;
    
    // Numbers
    if (/[0-9]/.test(key)) {
        handlePostCalculationInput(key, false);
        return;
    }
    
    // Decimal point
    if (key === '.') {
        handlePostCalculationInput('.', false);
        return;
    }
    
    // Operators
    if (['+', '-', '*', '/'].includes(key)) {
        handlePostCalculationInput(key, true);
        return;
    }
    
    // Parentheses (not operators, start fresh)
    if (['(', ')'].includes(key)) {
        handlePostCalculationInput(key, false);
        return;
    }
    
    // Power operator
    if (key === '^') {
        handlePostCalculationInput('**', true);
        return;
    }
    
    // Equals / Enter
    if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
        return;
    }
    
    // Backspace
    if (key === 'Backspace') {
        currentExpression = currentExpression.slice(0, -1);
        justCalculated = false;
        updateInputDisplay();
        return;
    }
    
    // Clear (Escape or 'c')
    if (key === 'Escape' || key === 'c' || key === 'C') {
        currentExpression = '';
        justCalculated = false;
        updateInputDisplay();
        clearOutput();
        return;
    }
}

// =============================================================================
// SOLAR PANEL PRANK
// =============================================================================

function startSolarPanelTimer() {
    // Clear existing timer
    if (solarPanelTimer) {
        clearTimeout(solarPanelTimer);
    }
    
    // Start new timer - fade out after 5 seconds of no mouse movement
    solarPanelTimer = setTimeout(() => {
        if (!isLowPower) {
            isLowPower = true;
            display.classList.add('low-power');
            display.classList.remove('charging');
            updateGapSection('⚡ Low power... move mouse to charge.');
        }
    }, 5000);
}

function restorePower() {
    if (isLowPower) {
        isLowPower = false;
        display.classList.remove('low-power');
        display.classList.add('charging');
        
        // Remove charging class after animation
        setTimeout(() => {
            display.classList.remove('charging');
        }, 500);
    }
    
    // Restart the timer
    startSolarPanelTimer();
}

// =============================================================================
// RANDOM SYNTAX ERROR PRANK (Optional - can enable later)
// =============================================================================

function maybeShowSyntaxError() {
    // 5% chance of random syntax error flash on valid operations
    if (Math.random() < 0.05) {
        display.classList.add('syntax-error');
        updateGapSection('SYNTAX ERROR (just kidding)');
        setTimeout(() => {
            display.classList.remove('syntax-error');
            updateGapSection('Ready to calculate...');
        }, 1000);
        return true;
    }
    return false;
}

// =============================================================================
// PRANK: RUNAWAY BUTTON
// =============================================================================

function initRunawayButton() {
    const equalsButton = document.querySelector('.key-equals');
    if (!equalsButton || !PRANK_CONFIG.runawayButton.enabled) return;
    
    equalsButton.addEventListener('mouseenter', handleRunawayMouseEnter);
    equalsButton.addEventListener('click', resetRunawayButton);
}

function handleRunawayMouseEnter() {
    if (!PRANK_CONFIG.runawayButton.enabled) return;
    if (isRunawayActive) return;  // Already running away
    
    // Check if we should trigger the runaway (10% chance)
    if (Math.random() < PRANK_CONFIG.runawayButton.chance) {
        triggerRunawayButton();
    }
}

function triggerRunawayButton() {
    const equalsButton = document.querySelector('.key-equals');
    const keypadNumpad = document.querySelector('.keypad-numpad');
    if (!equalsButton || !keypadNumpad) return;
    
    isRunawayActive = true;
    equalsButton.classList.add('runaway', 'runaway-active');
    
    // Get the numpad bounds for positioning
    const numpadRect = keypadNumpad.getBoundingClientRect();
    const buttonRect = equalsButton.getBoundingClientRect();
    
    // Calculate random position within the numpad area
    const maxX = numpadRect.width - buttonRect.width - 10;
    const maxY = numpadRect.height - buttonRect.height - 10;
    
    const randomX = Math.floor(Math.random() * maxX) - maxX / 2;
    const randomY = Math.floor(Math.random() * maxY) - maxY / 2;
    
    // Apply the transform
    equalsButton.style.transform = `translate(${randomX}px, ${randomY}px)`;
    
    // Update gap section with a funny message
    updateGapSection('🏃 The = button is scared!');
    
    // Auto-reset after 2 seconds
    if (runawayResetTimer) clearTimeout(runawayResetTimer);
    runawayResetTimer = setTimeout(resetRunawayButton, 2000);
}

function resetRunawayButton() {
    const equalsButton = document.querySelector('.key-equals');
    if (!equalsButton) return;
    
    isRunawayActive = false;
    equalsButton.classList.remove('runaway', 'runaway-active');
    equalsButton.style.transform = '';
    
    if (runawayResetTimer) {
        clearTimeout(runawayResetTimer);
        runawayResetTimer = null;
    }
}

// =============================================================================
// PRANK: CALCULATOR SNEEZE
// =============================================================================

function maybeCalculatorSneeze() {
    if (!PRANK_CONFIG.calculatorSneeze.enabled) return false;
    
    // 5% chance to sneeze
    if (Math.random() < PRANK_CONFIG.calculatorSneeze.chance) {
        triggerCalculatorSneeze();
        return true;
    }
    return false;
}

function triggerCalculatorSneeze() {
    const wrapper = document.querySelector('.calculator-wrapper');
    if (!wrapper) return;
    
    // Add sneeze animation class
    wrapper.classList.add('sneezing');
    
    // Create the ACHOO text element
    const sneezeText = document.createElement('div');
    sneezeText.className = 'sneeze-text';
    sneezeText.textContent = 'ACHOO!';
    document.body.appendChild(sneezeText);
    
    // Update gap section
    updateGapSection('🤧 *sneeze* Excuse me!');
    
    // Clean up after animation
    setTimeout(() => {
        wrapper.classList.remove('sneezing');
        sneezeText.remove();
        updateGapSection('Sorry about that...');
    }, 800);
}

// =============================================================================
// PRANK: FAKE PREMIUM POP-UP
// =============================================================================

function maybeShowPremiumPopup() {
    if (!PRANK_CONFIG.fakePremium.enabled) return false;
    
    // Increment equals press counter
    equalsPressCount++;
    
    // Check if we've reached the trigger threshold (5-7 presses)
    if (equalsPressCount >= nextPremiumTrigger) {
        // Reset counter and set new random threshold
        equalsPressCount = 0;
        nextPremiumTrigger = Math.floor(Math.random() * 3) + 5; // Random 5-7
        
        showPremiumPopup();
        return true;
    }
    return false;
}

function showPremiumPopup() {
    const modal = document.getElementById('premium-modal');
    if (!modal) return;
    
    modal.classList.add('visible');
    
    // Setup button handlers
    const upgradeBtn = document.getElementById('premium-upgrade');
    const declineBtn = document.getElementById('premium-decline');
    
    if (upgradeBtn) {
        upgradeBtn.onclick = handlePremiumUpgrade;
    }
    
    if (declineBtn) {
        declineBtn.onclick = closePremiumPopup;
    }
}

function handlePremiumUpgrade() {
    const upgradeBtn = document.getElementById('premium-upgrade');
    if (!upgradeBtn) return;
    
    // Make button glitch
    upgradeBtn.classList.add('glitching');
    
    // Cycle through different "error" texts
    const errorTexts = [
        'Processing...',
        'ERROR: Wallet not found',
        'Connecting to void...',
        'Payment rejected by universe',
        'Try again (don\'t)',
        'Nice try!',
        'Upgrade Now'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
        upgradeBtn.textContent = errorTexts[index];
        index++;
        
        if (index >= errorTexts.length) {
            clearInterval(interval);
            upgradeBtn.classList.remove('glitching');
            
            // Close after showing all messages
            setTimeout(closePremiumPopup, 500);
        }
    }, 400);
}

function closePremiumPopup() {
    const modal = document.getElementById('premium-modal');
    if (modal) {
        modal.classList.remove('visible');
        
        // Reset upgrade button text
        const upgradeBtn = document.getElementById('premium-upgrade');
        if (upgradeBtn) {
            upgradeBtn.textContent = 'Upgrade Now';
            upgradeBtn.classList.remove('glitching');
        }
    }
}

// =============================================================================
// PRANK: FAKE BSOD (BLUE SCREEN OF DEATH)
// =============================================================================

function maybeTriggerBSOD() {
    if (!PRANK_CONFIG.fakeBSOD.enabled) return false;
    
    // 1% chance to trigger BSOD
    if (Math.random() < PRANK_CONFIG.fakeBSOD.chance) {
        triggerBSOD();
        return true;
    }
    return false;
}

function triggerBSOD() {
    const overlay = document.getElementById('bsod-overlay');
    const percentEl = document.getElementById('bsod-percent');
    const jokeEl = document.getElementById('bsod-joke');
    
    if (!overlay) return;
    
    // Show the BSOD
    overlay.classList.add('visible');
    
    // Animate the percentage counter
    let percent = 0;
    const percentInterval = setInterval(() => {
        percent += Math.floor(Math.random() * 15) + 5;
        if (percent > 100) percent = 100;
        
        if (percentEl) {
            percentEl.textContent = percent;
        }
        
        if (percent >= 100) {
            clearInterval(percentInterval);
        }
    }, 200);
    
    // Show "Just kidding" after 2.5 seconds
    setTimeout(() => {
        if (jokeEl) {
            jokeEl.textContent = '😄 Just kidding!';
        }
    }, 2500);
    
    // Hide BSOD after 3 seconds
    setTimeout(() => {
        overlay.classList.remove('visible');
        
        // Reset state
        if (percentEl) percentEl.textContent = '0';
        if (jokeEl) jokeEl.textContent = '';
        
        updateGapSection('Did that scare you? 😈');
    }, 3500);
}

// =============================================================================
// PRANK: UPSIDE DOWN MODE
// =============================================================================

function maybeTriggerUpsideDown() {
    if (!PRANK_CONFIG.upsideDown.enabled) return false;
    
    if (Math.random() < PRANK_CONFIG.upsideDown.chance) {
        triggerUpsideDown();
        return true;
    }
    return false;
}

function triggerUpsideDown() {
    const wrapper = document.querySelector('.calculator-wrapper');
    if (!wrapper) return;
    
    wrapper.classList.add('upside-down');
    updateGapSection('🙃 Everything is fine...');
    
    // Remove after 5 seconds
    setTimeout(() => {
        wrapper.classList.remove('upside-down');
        updateGapSection('Sorry, gravity glitch.');
    }, 5000);
}

// =============================================================================
// PRANK: DISCO MODE
// =============================================================================

function maybeTriggerDiscoMode() {
    if (!PRANK_CONFIG.discoMode.enabled) return false;
    
    if (Math.random() < PRANK_CONFIG.discoMode.chance) {
        triggerDiscoMode();
        return true;
    }
    return false;
}

function triggerDiscoMode() {
    const wrapper = document.querySelector('.calculator-wrapper');
    if (!wrapper) return;
    
    wrapper.classList.add('disco-mode');
    
    // Create party overlay
    const partyOverlay = document.createElement('div');
    partyOverlay.className = 'disco-overlay';
    partyOverlay.textContent = '🕺 PARTY TIME 🕺';
    document.body.appendChild(partyOverlay);
    
    updateGapSection('💃 UNTZ UNTZ UNTZ 🎵');
    
    // Remove after 4 seconds
    setTimeout(() => {
        wrapper.classList.remove('disco-mode');
        partyOverlay.remove();
        updateGapSection('Party\'s over. Back to math.');
    }, 4000);
}

// =============================================================================
// PRANK: SHRINKING CALCULATOR
// =============================================================================

function maybeTriggerShrinking() {
    if (!PRANK_CONFIG.shrinking.enabled || isShrinking) return false;
    
    if (Math.random() < PRANK_CONFIG.shrinking.chance) {
        triggerShrinking();
        return true;
    }
    return false;
}

function triggerShrinking() {
    const wrapper = document.querySelector('.calculator-wrapper');
    if (!wrapper) return;
    
    isShrinking = true;
    wrapper.classList.add('shrinking');
    updateGapSection('Is it getting smaller in here? 🔍');
    
    // Add click listener to snap back
    const snapBackHandler = () => {
        wrapper.classList.remove('shrinking');
        wrapper.classList.add('snap-back');
        isShrinking = false;
        updateGapSection('*BOING* Back to normal!');
        
        // Remove snap-back class after animation
        setTimeout(() => {
            wrapper.classList.remove('snap-back');
        }, 300);
        
        // Remove this event listener
        document.removeEventListener('click', snapBackHandler);
    };
    
    // Wait a moment before enabling click-to-restore
    setTimeout(() => {
        document.addEventListener('click', snapBackHandler);
    }, 1000);
}

// =============================================================================
// PRANK: BUTTON SWAP
// =============================================================================

function maybeTriggerButtonSwap() {
    if (!PRANK_CONFIG.buttonSwap.enabled) return false;
    
    if (Math.random() < PRANK_CONFIG.buttonSwap.chance) {
        triggerButtonSwap();
        return true;
    }
    return false;
}

function triggerButtonSwap() {
    // Get all number buttons (0-9)
    const numberButtons = Array.from(document.querySelectorAll('.key-num'));
    if (numberButtons.length < 2) return;
    
    // Pick two random different buttons
    const index1 = Math.floor(Math.random() * numberButtons.length);
    let index2 = Math.floor(Math.random() * numberButtons.length);
    while (index2 === index1) {
        index2 = Math.floor(Math.random() * numberButtons.length);
    }
    
    const btn1 = numberButtons[index1];
    const btn2 = numberButtons[index2];
    
    // Store original values
    const value1 = btn1.dataset.value;
    const value2 = btn2.dataset.value;
    const text1 = btn1.textContent;
    const text2 = btn2.textContent;
    
    // Add swap animation
    btn1.classList.add('swapping');
    btn2.classList.add('swapping');
    
    // Swap the values and text
    setTimeout(() => {
        btn1.dataset.value = value2;
        btn2.dataset.value = value1;
        btn1.textContent = text2;
        btn2.textContent = text1;
        
        btn1.classList.remove('swapping');
        btn2.classList.remove('swapping');
    }, 300);
    
    updateGapSection(`🔀 Wait, did ${text1} and ${text2} just swap?`);
    
    // Swap back after 10 seconds
    setTimeout(() => {
        btn1.dataset.value = value1;
        btn2.dataset.value = value2;
        btn1.textContent = text1;
        btn2.textContent = text2;
        updateGapSection('Buttons restored. You\'re welcome.');
    }, 10000);
}

// =============================================================================
// PRANK: RANDOM CURSORS
// =============================================================================

function maybeTriggerCursors() {
    if (!PRANK_CONFIG.cursors.enabled) return false;
    
    if (Math.random() < PRANK_CONFIG.cursors.chance) {
        triggerRandomCursor();
        return true;
    }
    return false;
}

function triggerRandomCursor() {
    const cursors = ['cursor-banana', 'cursor-middle-finger', 'cursor-clown', 'cursor-poop'];
    const cursorMessages = {
        'cursor-banana': '🍌 Your cursor is now a banana.',
        'cursor-middle-finger': '🖕 The calculator is angry.',
        'cursor-clown': '🤡 Honk honk!',
        'cursor-poop': '💩 Oops.'
    };
    
    const randomCursor = cursors[Math.floor(Math.random() * cursors.length)];
    
    // Remove any existing cursor classes
    cursors.forEach(c => document.body.classList.remove(c));
    
    // Add new cursor class
    document.body.classList.add(randomCursor);
    updateGapSection(cursorMessages[randomCursor]);
    
    // Remove after 8 seconds
    setTimeout(() => {
        document.body.classList.remove(randomCursor);
        updateGapSection('Cursor restored. For now.');
    }, 8000);
}

// =============================================================================
// PRANK: Master Post-Calculation Prank Roller
// =============================================================================

function rollVisualPranks() {
    // Roll for each visual prank (only one can trigger)
    const pranks = [
        maybeTriggerUpsideDown,
        maybeTriggerDiscoMode,
        maybeTriggerShrinking,
        maybeTriggerButtonSwap,
        maybeTriggerCursors
    ];
    
    // Shuffle the pranks array for randomness
    pranks.sort(() => Math.random() - 0.5);
    
    // Try each prank until one triggers
    for (const prank of pranks) {
        if (prank()) {
            return true; // One prank triggered, stop
        }
    }
    return false;
}

// =============================================================================
// PRANK: Button Click Handler (for Premium Popup)
// =============================================================================

function wrapButtonClickWithPranks() {
    // Wrap the original button click to potentially show premium popup
    document.querySelectorAll('.key').forEach(button => {
        const originalHandler = () => handleButtonClick(button);
        
        button.removeEventListener('click', originalHandler);
        button.addEventListener('click', () => {
            // Try to show premium popup (10% chance)
            // Don't interrupt if user is actively calculating
            if (!isCalculating) {
                maybeShowPremiumPopup();
            }
            
            // Always handle the actual button click
            handleButtonClick(button);
        });
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
    // Add click listeners to all buttons (using .key class for ClassWiz style)
    document.querySelectorAll('.key').forEach(button => {
        button.addEventListener('click', () => handleButtonClick(button));
    });
    
    // Initialize runaway button prank
    initRunawayButton();
    
    // Initialize overlay content
    initOverlayContent();
    
    // Keyboard support
    document.addEventListener('keydown', handleKeyboard);
    
    // Solar panel prank - mouse movement tracking
    document.addEventListener('mousemove', restorePower);
    document.addEventListener('mousedown', restorePower);
    document.addEventListener('touchstart', restorePower);
    
    // Start the solar panel timer
    startSolarPanelTimer();
    
    // Initial display state
    updateInputDisplay();
    updateGapSection('Welcome to sioca - 911ab!');
    
    // Fetch initial stats for the Useless Leaderboard
    fetchStats();
    
    console.log('🧮 sioca - 911ab: The Useless Calculator initialized.');
    console.log('📦 Session ID:', SESSION_ID);
    console.log('🔗 Backend:', API_BASE_URL);
    console.log('🎭 Pranks enabled: Runaway Button, Calculator Sneeze, Fake Premium, Fake BSOD, Overlays');
}

// =============================================================================
// USELESS LEADERBOARD - Stats Ticker
// =============================================================================

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (response.ok) {
            const data = await response.json();
            updateStatsTicker(data);
        }
    } catch (error) {
        console.log('📊 Stats fetch failed (server might be offline)');
    }
}

function updateStatsTicker(data) {
    const timeEl = document.getElementById('stat-time');
    const sevensEl = document.getElementById('stat-sevens');
    const calcsEl = document.getElementById('stat-calcs');
    
    if (timeEl) timeEl.textContent = data.time_wasted_formatted || '0 seconds';
    if (sevensEl) sevensEl.textContent = data.sevens_pressed?.toLocaleString() || '0';
    if (calcsEl) calcsEl.textContent = data.calculations_performed?.toLocaleString() || '0';
}

// =============================================================================
// INTERACTIVE/META PRANK OVERLAYS
// =============================================================================

// Overlay config
const OVERLAY_CONFIG = {
    triggerChance: 0.08,  // 8% chance per calculation
    overlays: ['captcha', 'terms', 'virus', 'cookie', 'loading']
};

// Track overlay state
let activeOverlay = null;
let loadingInterval = null;

/**
 * Initialize overlay content on page load
 */
function initOverlayContent() {
    // Fill Terms & Conditions with ridiculous wall of text
    const termsContent = document.getElementById('terms-content');
    if (termsContent) {
        termsContent.innerHTML = `
            <p><strong>IMPORTANT: By reading this, you have already agreed.</strong></p>
            <p>Section 1.1.1.1.1 (subsection π): The Calculator (hereinafter referred to as "The Divine Number Cruncher," "Math Box," or "That Thing You're Using to Avoid Mental Math") reserves the right to produce answers that may or may not correspond to mathematical reality. By pressing any button, you acknowledge that numbers are merely a social construct invented by Big Mathematics™ to sell calculators.</p>
            <p>Section 2.∞: The User (hereinafter referred to as "You," "The Button Presser," "The Seeker of Mathematical Truth," or "That Person Who Could Have Used Their Phone") hereby grants Calculator Inc. perpetual, irrevocable, universe-wide rights to:</p>
            <ul>
                <li>Your calculation history</li>
                <li>Your browsing data</li>
                <li>Your hopes and dreams</li>
                <li>That embarrassing thing you did in 3rd grade</li>
                <li>Your left sock (we know it's missing)</li>
                <li>Any and all future mathematical insights</li>
            </ul>
            <p>Section 3.14159: In the event of a dispute, all parties agree to resolve the matter through trial by combat. Calculator Inc. will be represented by a sentient abacus named Gerald.</p>
            <p>Section 4.04: This Agreement shall be governed by the laws of mathematics, which may change at any time without notice. What was true yesterday may be false tomorrow. 2+2 may equal 5 if we say so.</p>
            <p>Section 5.ever: The Calculator makes no guarantees regarding the accuracy, reliability, or sanity of its outputs. If the Calculator states that 1+1=fish, then 1+1=fish. Your reality has been adjusted accordingly.</p>
            <p>Section 6.66: By clicking "I Agree," you are entering into a binding soul-exchange agreement. Should your soul already be committed to another entity (demons, corporations, gym memberships), please notify us within 30 days.</p>
            <p>Section 7.7.7: The lucky number section. Nothing here, just wanted to include it for good luck.</p>
            <p>Section 8.008135: Any attempt to read this entire agreement will result in the forfeiture of 15 minutes of your life. This time cannot be refunded.</p>
            <p>Section 9.81m/s²: Gravity applies to these terms. They are very heavy.</p>
            <p>Section 10^100: In accordance with Googol Law, this paragraph must contain exactly one googol words. We're counting on you not to verify this.</p>
            <p>Section 11ty-billion: All your base are belong to us. This has been true since 1998.</p>
            <p>Section 12: There is no Section 12. If you think you read Section 12, please report to the nearest Reality Adjustment Center.</p>
            <p><em>This agreement has been reviewed by our legal team of highly trained rubber ducks.</em></p>
        `;
    }
}

/**
 * Maybe trigger a random overlay (5-10% chance)
 * Called after calculations
 */
function maybeTriggerRandomOverlay() {
    if (Math.random() > OVERLAY_CONFIG.triggerChance) return false;
    if (activeOverlay) return false;  // Don't stack overlays
    
    const overlayType = OVERLAY_CONFIG.overlays[Math.floor(Math.random() * OVERLAY_CONFIG.overlays.length)];
    
    switch (overlayType) {
        case 'captcha':
            triggerCaptchaOverlay();
            break;
        case 'terms':
            triggerTermsOverlay();
            break;
        case 'virus':
            triggerVirusOverlay();
            break;
        case 'cookie':
            triggerCookieOverlay();
            break;
        case 'loading':
            triggerLoadingOverlay();
            break;
    }
    
    return true;
}

// =============================================================================
// CAPTCHA OVERLAY
// =============================================================================

const CAPTCHA_CHALLENGES = [
    { instruction: 'Select all squares containing EMOTIONS', items: ['😀','😢','🏠','😡','🚗','😱','🌳','😴','🔥'] },
    { instruction: 'Select all squares with INVISIBLE CATS', items: ['⬜','⬜','⬜','⬜','⬜','⬜','⬜','⬜','⬜'] },
    { instruction: 'Select all squares with TRAFFIC LIGHTS', items: ['🍕','🎸','📱','🎮','💡','🎨','📚','⚽','🎭'] },
    { instruction: 'Select all squares with PRIME NUMBERS', items: ['42','69','π','∞','🔢','√-1','404','1+1','NaN'] },
    { instruction: 'Click on the NUMBER that doesn\'t exist', items: ['1','2','3','4','5','6','7','8','9'] },
    { instruction: 'Select all squares containing YOUR HOPES AND DREAMS', items: ['💭','✨','🌟','🎯','🏆','💫','🌈','🎪','🎡'] },
    { instruction: 'Select all squares with ROUND SQUARES', items: ['⬜','⬛','◻️','◼️','▪️','▫️','🔲','🔳','⏹️'] },
    { instruction: 'Select the squares containing YESTERDAY', items: ['📅','⏰','🕐','📆','⌛','⏳','🗓️','⌚','🕰️'] }
];

function triggerCaptchaOverlay() {
    activeOverlay = 'captcha';
    const overlay = document.getElementById('captcha-overlay');
    const grid = document.getElementById('captcha-grid');
    const instruction = document.getElementById('captcha-instruction');
    
    // Pick random challenge
    const challenge = CAPTCHA_CHALLENGES[Math.floor(Math.random() * CAPTCHA_CHALLENGES.length)];
    
    // Set instruction
    instruction.textContent = challenge.instruction;
    
    // Populate grid
    grid.innerHTML = '';
    challenge.items.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = 'captcha-cell';
        cell.textContent = item;
        cell.dataset.index = index;
        cell.onclick = () => cell.classList.toggle('selected');
        grid.appendChild(cell);
    });
    
    overlay.classList.add('active');
}

function verifyCaptcha() {
    const grid = document.getElementById('captcha-grid');
    const selected = grid.querySelectorAll('.selected').length;
    
    // Always fail with a ridiculous message
    const failMessages = [
        "❌ Incorrect. You missed 3 invisible cats.",
        "❌ Wrong! The prime numbers were hiding.",
        "❌ Failed. Your emotions weren't genuine enough.",
        "❌ Error: We changed the images while you clicked.",
        "❌ Nope. The correct answer was 'yes'.",
        "❌ You selected " + selected + " squares. The answer was " + (selected + 1) + ".",
        "❌ Please try again. But this time, mean it.",
        "❌ Incorrect. The traffic lights were in stealth mode."
    ];
    
    const instruction = document.getElementById('captcha-instruction');
    instruction.innerHTML = failMessages[Math.floor(Math.random() * failMessages.length)];
    instruction.style.color = '#ff5555';
    
    // After 2 seconds, close anyway
    setTimeout(() => {
        closeCaptcha();
        updateGapSection("CAPTCHA verification... close enough.");
    }, 2000);
}

function playCaptchaAudio() {
    // "Play" audio that's just gibberish
    const audios = [
        "🔊 'Mmmrrrphh... seventeen... banana... click... bzzzt'",
        "🔊 'Three... no wait... purple... left... maybe?'",
        "🔊 'The password is... *static* ...underwater basket...'",
        "🔊 'Select... *dial-up sounds* ...the ones that aren't...'",
        "🔊 '*whale sounds* ...traffic light... *more whale sounds*'"
    ];
    
    const instruction = document.getElementById('captcha-instruction');
    instruction.textContent = audios[Math.floor(Math.random() * audios.length)];
}

function closeCaptcha() {
    const overlay = document.getElementById('captcha-overlay');
    overlay.classList.remove('active');
    activeOverlay = null;
}

// =============================================================================
// TERMS & CONDITIONS OVERLAY
// =============================================================================

function triggerTermsOverlay() {
    activeOverlay = 'terms';
    const overlay = document.getElementById('terms-overlay');
    overlay.classList.add('active');
    
    // Setup runaway button behavior
    const agreeBtn = document.getElementById('terms-agree-btn');
    agreeBtn.style.transform = '';
    
    let dodgeCount = 0;
    const maxDodges = 5;
    
    agreeBtn.onmouseenter = (e) => {
        if (dodgeCount < maxDodges) {
            dodgeCount++;
            const directions = [
                'translateX(150px)',
                'translateX(-150px)',
                'translateY(50px)',
                'translateY(-50px)',
                'translate(100px, 30px)',
                'translate(-100px, -30px)',
                'translateX(200px) rotate(15deg)',
                'translateX(-200px) rotate(-15deg)'
            ];
            agreeBtn.style.transform = directions[Math.floor(Math.random() * directions.length)];
            agreeBtn.textContent = ['I Agree', 'Come on...', 'Almost!', 'Catch me!', 'Too slow!'][Math.min(dodgeCount, 4)];
        }
    };
    
    agreeBtn.onclick = () => {
        // They finally caught it
        closeTerms(true);
    };
}

function closeTerms(agreed = false) {
    const overlay = document.getElementById('terms-overlay');
    overlay.classList.remove('active');
    activeOverlay = null;
    
    if (agreed) {
        updateGapSection("🎉 You agreed to give us your firstborn! (Just kidding... maybe)");
    } else {
        updateGapSection("You disagreed. Calculator privileges revoked for 0.0001 seconds.");
    }
}

// =============================================================================
// VIRUS WARNING OVERLAY
// =============================================================================

function triggerVirusOverlay() {
    activeOverlay = 'virus';
    const overlay = document.getElementById('virus-overlay');
    
    // Update scan text with random scary files
    const scanOutput = document.getElementById('virus-scan-output');
    const scaryFiles = [
        'system32/definitely_not_a_virus.exe',
        'windows/browser_history_2019.log',
        'users/you/embarrassing_photos/',
        'homework/totally_homework.zip',
        'documents/passwords_in_plaintext.txt',
        'downloads/free_robux_generator.bat',
        'desktop/my_novel_final_FINAL_v3.docx'
    ];
    
    let scanIndex = 0;
    const scanInterval = setInterval(() => {
        if (scanIndex < scaryFiles.length && activeOverlay === 'virus') {
            scanOutput.textContent = `Scanning: ${scaryFiles[scanIndex]}... INFECTED!`;
            scanIndex++;
        } else {
            clearInterval(scanInterval);
        }
    }, 800);
    
    overlay.classList.add('active');
}

function removeVirus() {
    closeVirus(true);
}

function ignoreVirus() {
    closeVirus(false);
}

function closeVirus(removed = false) {
    const overlay = document.getElementById('virus-overlay');
    overlay.classList.remove('active');
    activeOverlay = null;
    
    // Both options have the same result 😈
    const messages = [
        "✅ Virus 'successfully' removed! (It wasn't real, OR WAS IT?)",
        "🦠 Congratulations! You now have 47 new viruses!",
        "💾 Your files have been encrypted... with love!",
        "🎉 Virus downloaded successfully! Thank you for your cooperation!",
        "🔐 Your calculator is now mining cryptocurrency!",
        "📧 A receipt has been sent to your ex."
    ];
    
    updateGapSection(messages[Math.floor(Math.random() * messages.length)]);
}

// =============================================================================
// COOKIE BANNER OVERLAY
// =============================================================================

function triggerCookieOverlay() {
    activeOverlay = 'cookie';
    const overlay = document.getElementById('cookie-overlay');
    const managePanel = document.getElementById('cookie-manage-panel');
    managePanel.style.display = 'none';
    overlay.classList.add('active');
}

function acceptAllCookies() {
    closeCookie('accepted');
}

function acceptNecessaryCookies() {
    closeCookie('necessary');
}

function toggleCookieManage() {
    const panel = document.getElementById('cookie-manage-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function saveCookiePreferences() {
    // All checkboxes are disabled anyway, but pretend to save
    closeCookie('customized');
}

function closeCookie(choice = 'accepted') {
    const overlay = document.getElementById('cookie-overlay');
    overlay.classList.remove('active');
    activeOverlay = null;
    
    const messages = {
        'accepted': "🍪 Mmm, cookies! We're now tracking your calculator habits across 847 dimensions.",
        'necessary': "🍪 'Necessary' cookies only. We'll just track the important stuff... like your fears.",
        'customized': "🍪 Preferences saved! Just kidding, we ignored them completely."
    };
    
    updateGapSection(messages[choice] || messages['accepted']);
}

// =============================================================================
// LOADING BAR OVERLAY
// =============================================================================

const LOADING_STATUSES = [
    "Downloading more RAM...",
    "Reticulating splines...",
    "Consulting the elders...",
    "Warming up the flux capacitor...",
    "Asking ChatGPT for help...",
    "Converting to metric...",
    "Defragmenting the cloud...",
    "Updating Adobe Reader...",
    "Counting to infinity...",
    "Dividing by zero (safely)...",
    "Downloading a car...",
    "Generating random numbers... 4, 4, 4, 4...",
    "Finding the any key...",
    "Loading loading bar...",
    "Proving P = NP...",
    "Initializing initializer...",
    "Syncing with parallel universe...",
    "Compiling spaghetti code...",
    "Negotiating with firewall...",
    "Calculating the meaning of life..."
];

const LOADING_TIPS = [
    "Pro tip: Did you know calculators can't actually feel pain?",
    "Fun fact: This loading bar is lying to you.",
    "Tip: Try turning it off and on again... just kidding, please don't.",
    "Did you know? 73% of loading bars are completely fake.",
    "Tip: While you wait, contemplate the heat death of the universe.",
    "Fun fact: This tip is designed to distract you from the loading.",
    "Tip: Stare at the bar harder. It loads faster.",
    "Did you know? The number 7 is actually plotting something."
];

function triggerLoadingOverlay() {
    activeOverlay = 'loading';
    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar-progress');
    const percent = document.getElementById('loading-percent');
    const status = document.getElementById('loading-status');
    const tip = document.getElementById('loading-tip');
    const modal = overlay.querySelector('.loading-modal');
    
    // Reset state
    bar.style.width = '0%';
    percent.textContent = '0%';
    modal.classList.remove('error');
    
    // Set random tip
    tip.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    
    overlay.classList.add('active');
    
    let progress = 0;
    let statusIndex = 0;
    let stuckAt99 = false;
    let stuckTime = 0;
    
    loadingInterval = setInterval(() => {
        if (progress < 99) {
            // Progress normally to 99%
            progress += Math.random() * 8 + 2;
            if (progress > 99) progress = 99;
            
            bar.style.width = Math.floor(progress) + '%';
            percent.textContent = Math.floor(progress) + '%';
            
            // Update status message periodically
            if (Math.random() < 0.3) {
                status.textContent = LOADING_STATUSES[statusIndex % LOADING_STATUSES.length];
                statusIndex++;
            }
        } else if (!stuckAt99) {
            // Get stuck at 99%
            stuckAt99 = true;
            bar.style.width = '99%';
            percent.textContent = '99%';
            status.textContent = "Almost there...";
        } else {
            // Stay stuck at 99%
            stuckTime += 200;
            
            if (stuckTime < 3000) {
                // Teasing messages
                const teases = ["Just a moment...", "Any second now...", "Sooooo close...", "Almost...", "99.9%... wait no, 99%"];
                status.textContent = teases[Math.floor(Math.random() * teases.length)];
            } else if (stuckTime >= 5000) {
                // After 5 seconds, ERROR!
                clearInterval(loadingInterval);
                triggerLoadingError();
            }
        }
    }, 200);
}

function triggerLoadingError() {
    const modal = document.getElementById('loading-overlay').querySelector('.loading-modal');
    const percent = document.getElementById('loading-percent');
    const status = document.getElementById('loading-status');
    
    modal.classList.add('error');
    percent.textContent = 'ERROR';
    
    const errors = [
        "Task failed successfully!",
        "Error 404: Calculation not found",
        "Unexpected success occurred",
        "Loading.exe has stopped working",
        "The calculation was inside you all along",
        "Error: Too many errors"
    ];
    
    status.textContent = errors[Math.floor(Math.random() * errors.length)];
    
    // Close after 2 seconds
    setTimeout(() => {
        closeLoading();
    }, 2000);
}

function closeLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('active');
    
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    
    activeOverlay = null;
    updateGapSection("Loading complete! (That was a lie)");
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
