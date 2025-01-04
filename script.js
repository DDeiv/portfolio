const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      World = Matter.World;

const engine = Engine.create();
const runner = Runner.create();

// Adjust gravity based on screen size with stronger mobile gravity
const setGravity = () => {
    engine.world.gravity.y = window.innerWidth <= 768 ? 1.5 : 0.98;
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
            friction: 0.8,
            restitution: 0.2
        }
    );
};

let ground = createGround();
World.add(engine.world, [ground]);

const links = {
    'Politecnico di Milano': 'https://www.polimi.it/',
    'Davide Bocchi': 'mailto:davidebocchi@icloud.com',
    'Audience0': 'https://www.polimi.it/',
    'vivilecanarie.com': 'https://vivilecanarie.webflow.io',
    'corsedimoto.com': 'https://corsedimoto.com',
    'brand': 'https://corsedimoto.com/brand'
};

const text = `Hi! I'm (Davide Bocchi), an all-around visual designer with a current focus on UX/UI design. With a Bachelor's in Communication Design from (Politecnico di Milano). After a year of freelancing, I've had the chance to work with some awesome clients, including (Audience Zero), where I keep websites running smoothly and looking sharp. I also dove into solo web design projects like (vivilecanarie.com). Lately, I've been collaborating with (corsedimoto.com), working on their website and taking the brand further into the world of YouTube.`;

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

// Add swipe handling
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function createFallingWord(text, rect, velocityX = 0, velocityY = 0) {
    const isMobile = window.innerWidth <= 768;
    const bodyWidth = text.length * (isMobile ? 6 : 8);
    const bodyHeight = isMobile ? 16 : 20;
    const bodyX = rect.left + (rect.width / 2);
    const bodyY = rect.top + (rect.height / 2);

    const body = Bodies.rectangle(
        bodyX,
        bodyY,
        bodyWidth,
        bodyHeight,
        {
            restitution: isMobile ? 0.2 : 0.3,
            friction: 0.8,
            frictionAir: isMobile ? 0.02 : 0.01,
            angle: 0,
            density: isMobile ? 0.002 : 0.001,
            isStatic: false
        }
    );
    
    // Apply initial velocity from swipe
    Matter.Body.setVelocity(body, { x: velocityX, y: velocityY });
    
    World.add(engine.world, body);
    fallenBodies.add(body);

    const wordElement = document.createElement('div');
    wordElement.className = 'falling-word';
    wordElement.textContent = text;
    wordElement.style.left = `${rect.left}px`;
    wordElement.style.top = `${rect.top}px`;
    document.body.appendChild(wordElement);
    fallingWords.add(wordElement);

    let lastTimestamp = 0;
    const minFrameTime = isMobile ? 20 : 16;

    function updatePosition(timestamp) {
        if (!body.position) return;
        
        if (timestamp - lastTimestamp < minFrameTime) {
            requestAnimationFrame(updatePosition);
            return;
        }
        
        lastTimestamp = timestamp;
        const deltaX = body.position.x - bodyX;
        const deltaY = body.position.y - bodyY;
        const rotation = body.angle * (180 / Math.PI);
        
        wordElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
        
        if (Math.abs(body.velocity.x) > 0.01 || Math.abs(body.velocity.y) > 0.01) {
            requestAnimationFrame(updatePosition);
        } else {
            body.isStatic = true;
        }
    }
    
    requestAnimationFrame(updatePosition);
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
                
                span.addEventListener('mouseenter', () => handleWordFall());
                
                // Touch and swipe handling
                span.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    touchStartTime = Date.now();
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                });
                
                span.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    touchEndX = e.changedTouches[0].clientX;
                    touchEndY = e.changedTouches[0].clientY;
                    
                    const touchDuration = Date.now() - touchStartTime;
                    const deltaX = touchEndX - touchStartX;
                    const deltaY = touchEndY - touchStartY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    
                    // If it's a swipe (fast movement over sufficient distance)
                    if (touchDuration < 300 && distance > 30) {
                        const speed = distance / touchDuration;
                        const velocityX = (deltaX / distance) * speed * 10;
                        const velocityY = (deltaY / distance) * speed * 10;
                        handleWordFall(velocityX, velocityY);
                    } else if (touchDuration < 300) {
                        // Simple tap
                        handleWordFall();
                    }
                });
                
                container.appendChild(span);
            } else {
                container.appendChild(document.createTextNode(word));
            }
        });
    }
});

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
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

function resetFallenWords() {
    fallenBodies.forEach(body => World.remove(engine.world, body));
    fallingWords.forEach(element => element.remove());
    fallenBodies.clear();
    fallingWords.clear();
}
