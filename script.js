const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      World = Matter.World;

// Create engine with increased timeScale for faster animation
const engine = Engine.create({
    timing: {
        timeScale: 0.85, // Increased from 0.7 to 0.85 for faster animation
        delta: 1000 / 60
    }
});
const runner = Runner.create();

// Increased gravity values for faster falling
const setGravity = () => {
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
    engine.world.gravity.y = isChrome ? 
        (window.innerWidth <= 768 ? 1.0 : 0.6) : // Increased from 0.8/0.6 to 1.0/0.8
        (window.innerWidth <= 768 ? 2.0 : 1.3);  // Increased from 1.2/0.8 to 1.4/1.0
};
setGravity();

Runner.run(runner, engine);

const createGround = () => {
    return Bodies.rectangle(
        window.innerWidth / 2,
        window.innerHeight - 10,
        window.innerWidth,
        60,
        { 
            isStatic: true,
            friction: 0.85, // Kept the same
            restitution: 0.15 // Kept the same
        }
    );
};

let ground = createGround();
World.add(engine.world, [ground]);

const links = {
    'Politecnico di Milano': 'Politecnico.html/',
    'Davide Bocchi': 'mailto:davidebocchi@icloud.com',
    'Audience Zero': 'https://www.audiencezero.com',
    'vivilecanarie.com': 'https://vivilecanarie.webflow.io',
    'corsedimoto.com': 'https://corsedimoto.com',
    'brand': 'https://corsedimoto.com/brand',
    'Contact': 'mailto:davidebocchi@icloud.com',
    'Soup.fm': 'https://www.instagram.com/soupfm.love/'
};

const text = `Hi! I'm (Davide Bocchi), an all-around visual designer with a current focus on front end development. With a Bachelor's in Communication Design from (Politecnico di Milano). After a year of freelancing, I've had the chance to work with some awesome clients, including (Audience Zero), where I keep websites running smoothly and looking sharp. I also dove into solo web design projects like (vivilecanarie.com). Lately, I've been collaborating with (corsedimoto.com), working on their website and taking the brand further into the world of YouTube. I'm also co-founder and visual designer of (Soup.fm), a cultural project that made around 2500 people gather in 2024 and it's still going strong. 
(Contact) me if you want to grab a coffee or a beer and talk about your feelings or even hire me.`;

function parseText(text) {
    const parts = [];
    let buffer = '';
    let inParens = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '(') {
            if (buffer) {
                parts.push({ text: buffer, isStatic: false });
                buffer = '';
            }
            inParens = true;
        } else if (char === ')') {
            if (buffer) {
                parts.push({ text: buffer, isStatic: true });
                buffer = '';
            }
            inParens = false;
        } else {
            buffer += char;
        }
    }
    if (buffer) {
        parts.push({ text: buffer, isStatic: false });
    }
    return parts;
}

const container = document.getElementById('textContainer');
let fallingWords = new Set();
let fallenBodies = new Set();
let wordsMap = new Map(); // Map to store word elements for swipe detection

// Global touch tracking for swipe implementation
let touchActive = false;
let touchX = 0;
let touchY = 0;

function createFallingWord(text, rect, velocityX = 0, velocityY = 0) {
    const isMobile = window.innerWidth <= 768;
    const bodyWidth = text.length * (isMobile ? 6 : 8);
    const bodyHeight = isMobile ? 16 : 20;
    const bodyX = rect.left + (rect.width / 2);
    const bodyY = rect.top + (rect.height / 2);
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;

    const body = Bodies.rectangle(
        bodyX,
        bodyY,
        bodyWidth,
        bodyHeight,
        {
            restitution: isChrome ? 0.15 : (isMobile ? 0.2 : 0.3), // Kept the same
            friction: isChrome ? 0.85 : 0.8, // Kept the same
            frictionAir: isChrome ? (isMobile ? 0.04 : 0.025) : (isMobile ? 0.02 : 0.01), // Kept the same
            angle: 0,
            density: isChrome ? (isMobile ? 0.003 : 0.0015) : (isMobile ? 0.002 : 0.001) // Kept the same
        }
    );
    
    // Apply initial velocity with increased factor for Chrome
    const velocityFactor = isChrome ? 0.7 : 1; // Increased from 0.5 to 0.7 for Chrome
    Matter.Body.setVelocity(body, { 
        x: velocityX * velocityFactor, 
        y: velocityY * velocityFactor 
    });
    
    World.add(engine.world, body);
    fallenBodies.add(body);

    const wordElement = document.createElement('div');
    wordElement.className = 'falling-word';
    wordElement.textContent = text;
    wordElement.style.left = `${rect.left}px`;
    wordElement.style.top = `${rect.top}px`;
    document.body.appendChild(wordElement);
    fallingWords.add(wordElement);

    // Animation timing - using consistent frame rate for both browsers
    let lastTimestamp = 0;
    const minFrameTime = 16; // Set to 16ms (60fps) for both browsers
    let rafId;

    function updatePosition(timestamp) {
        if (!body.position) {
            cancelAnimationFrame(rafId);
            return;
        }
        
        // Use constant frame timing
        lastTimestamp = timestamp;
        const deltaX = body.position.x - bodyX;
        const deltaY = body.position.y - bodyY;
        const rotation = body.angle * (180 / Math.PI);
        
        // Force hardware acceleration and use direct transform for Chrome
        if (isChrome) {
            // Use direct transform without smoothing for Chrome
            wordElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`;
        } else {
            wordElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
        }
        
        // Adjusted threshold for stopping
        const velocityThreshold = 0.03; // Use same threshold for all browsers
        if (Math.abs(body.velocity.x) > velocityThreshold || Math.abs(body.velocity.y) > velocityThreshold) {
            rafId = requestAnimationFrame(updatePosition);
        } else {
            body.isStatic = true;
            cancelAnimationFrame(rafId);
        }
    }
    
    rafId = requestAnimationFrame(updatePosition);
}

// Function to check if a word is in the swipe path
function checkWordInSwipePath(wordElement, currentX, currentY) {
    if (wordElement.classList.contains('original-hidden')) {
        return false;
    }
    
    const rect = wordElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Distance from touch point to word center
    const distance = Math.sqrt(
        Math.pow(currentX - centerX, 2) + 
        Math.pow(currentY - centerY, 2)
    );
    
    // Make word fall if touch point is within proximity threshold
    const proximityThreshold = Math.max(rect.width, 40); // At least 40px or word width
    
    if (distance <= proximityThreshold) {
        // Calculate swipe direction for velocity
        const dx = currentX - touchX;
        const dy = currentY - touchY;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        // Only apply velocity if there's meaningful movement
        let vx = 0, vy = 0;
        if (magnitude > 5) {
            // Normalize and scale
            const speedFactor = 5; // Adjust for desired speed
            vx = (dx / magnitude) * speedFactor;
            vy = (dy / magnitude) * speedFactor;
        }
        
        createFallingWord(wordElement.textContent, rect, vx, vy);
        wordElement.classList.add('original-hidden');
        
        // Reset word after delay
        setTimeout(() => {
            wordElement.classList.remove('original-hidden');
        }, 5000);
        
        return true;
    }
    
    return false;
}

// Setup swipe handling for the document
function setupSwipeHandling() {
    // Only add touch handlers if on mobile
    if (window.innerWidth <= 768) {
        document.addEventListener('touchstart', (e) => {
            touchActive = true;
            touchX = e.touches[0].clientX;
            touchY = e.touches[0].clientY;
            
            // Check words at starting point
            wordsMap.forEach((wordEl) => {
                if (wordEl.classList.contains('static') && !wordEl.classList.contains('original-hidden')) {
                    checkWordInSwipePath(wordEl, touchX, touchY);
                }
            });
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!touchActive) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            // Check all words on each move
            wordsMap.forEach((wordEl) => {
                if (wordEl.classList.contains('static') && !wordEl.classList.contains('original-hidden')) {
                    checkWordInSwipePath(wordEl, currentX, currentY);
                }
            });
            
            // Update touch coordinates
            touchX = currentX;
            touchY = currentY;
        });
        
        document.addEventListener('touchend', () => {
            touchActive = false;
        });
        
        document.addEventListener('touchcancel', () => {
            touchActive = false;
        });
    }
}

const segments = parseText(text);

segments.forEach((segment) => {
    if (segment.isStatic) {
        const link = document.createElement('a');
        link.href = links[segment.text] || '#';
        link.textContent = segment.text;
        link.className = 'word highlight';
        container.appendChild(link);
    } else {
        const textNode = document.createTextNode(segment.text);
        const wrapper = document.createElement('span');
        wrapper.className = 'static';
        
        const words = segment.text.split(/(\s+)/);
        words.forEach(word => {
            if (!/^\s+$/.test(word)) {
                const span = document.createElement('span');
                span.textContent = word;
                span.className = 'word static';
                
                // Store word element in map for swipe detection
                wordsMap.set(span.textContent + Math.random(), span);
                
                let interactionTimeout;
                let touchStartTime;
                
                const handleWordFall = (velocityX = 0, velocityY = 0) => {
                    if (!span.classList.contains('original-hidden')) {
                        if (interactionTimeout) {
                            clearTimeout(interactionTimeout);
                        }
                        
                        const rect = span.getBoundingClientRect();
                        createFallingWord(span.textContent, rect, velocityX, velocityY);
                        span.classList.add('original-hidden');
                        
                        interactionTimeout = setTimeout(() => {
                            span.classList.remove('original-hidden');
                        }, 5000);
                    }
                };
                
                // Add a small delay to mouse interaction to prevent accidental triggers
                let mouseEnterTimer;
                span.addEventListener('mouseenter', () => {
                    mouseEnterTimer = setTimeout(() => handleWordFall(), 10);
                });
                span.addEventListener('mouseleave', () => {
                    if (mouseEnterTimer) clearTimeout(mouseEnterTimer);
                });
                
                // Keep original touch handling for individual words
                // but only on mobile
                if (window.innerWidth <= 768) {
                    span.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        touchStartTime = Date.now();
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                    });
                    
                    span.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        const touchEndX = e.changedTouches[0].clientX;
                        const touchEndY = e.changedTouches[0].clientY;
                        
                        const touchDuration = Date.now() - touchStartTime;
                        const deltaX = touchEndX - touchStartX;
                        const deltaY = touchEndY - touchStartY;
                        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        
                        // If it's a swipe (fast movement over sufficient distance)
                        if (touchDuration < 300 && distance > 30) {
                            const speed = distance / touchDuration;
                            // Adjusted velocity factor for Chrome
                            const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
                            const velocityFactor = isChrome ? 7 : 10; // Increased from 5 to 7 for Chrome
                            const velocityX = (deltaX / distance) * speed * velocityFactor;
                            const velocityY = (deltaY / distance) * speed * velocityFactor;
                            handleWordFall(velocityX, velocityY);
                        } else if (touchDuration < 300) {
                            // Simple tap
                            handleWordFall();
                        }
                    });
                }
                
                container.appendChild(span);
            } else {
                container.appendChild(document.createTextNode(word));
            }
        });
    }
});

function adjustFontSizeForViewport() {
    // Only adjust font size on mobile
    if (window.innerWidth <= 768) {
        const viewportHeight = window.innerHeight;
        // Get the current height of the text container
        const containerHeight = container.scrollHeight;
        
        // Initial font size from CSS (14px for mobile)
        let fontSize = 14;
        
        // If text is too small for viewport, increase font size
        if (containerHeight < viewportHeight * 0.85) {
            while (containerHeight < viewportHeight * 0.85 && fontSize < 24) {
                fontSize += 0.5;
                container.style.fontSize = `${fontSize}px`;
                
                // Break if we're getting too close to filling
                if (container.scrollHeight > viewportHeight * 0.95) {
                    break;
                }
            }
        }
        // If text is too large for viewport, decrease font size
        else if (containerHeight > viewportHeight * 0.95) {
            while (containerHeight > viewportHeight * 0.95 && fontSize > 10) {
                fontSize -= 0.5;
                container.style.fontSize = `${fontSize}px`;
                
                // Break if we're getting too small
                if (container.scrollHeight < viewportHeight * 0.85) {
                    // Increase slightly to find the sweet spot
                    fontSize += 0.5;
                    container.style.fontSize = `${fontSize}px`;
                    break;
                }
            }
        }
        
        // Update falling word font size to match
        document.documentElement.style.setProperty('--falling-word-font-size', `${fontSize}px`);
    } else {
        // Reset to default for desktop
        container.style.fontSize = '';
        document.documentElement.style.setProperty('--falling-word-font-size', '16px');
    }
}

function handleResize() {
    World.remove(engine.world, ground);
    ground = createGround();
    World.add(engine.world, [ground]);
    setGravity();
    
    fallenBodies.forEach(body => {
        if (body && body.isStatic) {
            body.isStatic = false;
        }
    });
    
    // Adjust font size when screen size changes
    adjustFontSizeForViewport();
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

function resetFallenWords() {
    fallenBodies.forEach(body => World.remove(engine.world, body));
    fallingWords.forEach(element => element.remove());
    fallenBodies.clear();
    fallingWords.clear();
}

// Initialize swipe handling
setupSwipeHandling();

// Set font size on initial load
document.addEventListener('DOMContentLoaded', adjustFontSizeForViewport);
