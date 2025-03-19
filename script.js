const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      World = Matter.World;

const engine = Engine.create({
    timing: {
        timeScale: 0.85, 
        delta: 1000 / 60
    }
});
const runner = Runner.create();

const setGravity = () => {
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
    engine.world.gravity.y = isChrome ? 
        (window.innerWidth <= 768 ? 1.0 : 0.6) : 
        (window.innerWidth <= 768 ? 2.0 : 1.3);  
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
            friction: 0.85, 
            restitution: 0.15 
        }
    );
};

let ground = createGround();
World.add(engine.world, [ground]);

const links = {
    'Politecnico di Milano': 'https://www.polimi.it/',
    'Davide Bocchi': 'mailto:davidebocchi@icloud.com',
    'Audience Zero': 'https://www.audiencezero.com',
    'vivilecanarie.com': 'https://vivilecanarie.webflow.io',
    'corsedimoto.com': 'https://corsedimoto.com',
    'brand': 'https://corsedimoto.com/brand'
};

const text = `Hi! I'm (Davide Bocchi), an all-around visual designer with a current focus on front end development. With a Bachelor's in Communication Design from (Politecnico di Milano). After a year of freelancing, I've had the chance to work with some awesome clients, including (Audience Zero), where I keep websites running smoothly and looking sharp. I also dove into solo web design projects like (vivilecanarie.com). Lately, I've been collaborating with (corsedimoto.com), working on their website and taking the brand further into the world of YouTube.`;

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
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;

    const body = Bodies.rectangle(
        bodyX,
        bodyY,
        bodyWidth,
        bodyHeight,
        {
            restitution: isChrome ? 0.15 : (isMobile ? 0.2 : 0.3),
            friction: isChrome ? 0.85 : 0.8, // Kept the same
            frictionAir: isChrome ? (isMobile ? 0.04 : 0.025) : (isMobile ? 0.02 : 0.01), 
            angle: 0,
            density: isChrome ? (isMobile ? 0.003 : 0.0015) : (isMobile ? 0.002 : 0.001)
        }
    );
    
    const velocityFactor = isChrome ? 0.7 : 1;
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

    let lastTimestamp = 0;
    const minFrameTime = 16; 
    let rafId;

    function updatePosition(timestamp) {
        if (!body.position) {
            cancelAnimationFrame(rafId);
            return;
        }
        
        lastTimestamp = timestamp;
        const deltaX = body.position.x - bodyX;
        const deltaY = body.position.y - bodyY;
        const rotation = body.angle * (180 / Math.PI);
        
        if (isChrome) {
          
            wordElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`;
        } else {
            wordElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
        }
        
        
        const velocityThreshold = 0.03;
        if (Math.abs(body.velocity.x) > velocityThreshold || Math.abs(body.velocity.y) > velocityThreshold) {
            rafId = requestAnimationFrame(updatePosition);
        } else {
            body.isStatic = true;
            cancelAnimationFrame(rafId);
        }
    }
    
    rafId = requestAnimationFrame(updatePosition);
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
                
              
                let mouseEnterTimer;
                span.addEventListener('mouseenter', () => {
                    mouseEnterTimer = setTimeout(() => handleWordFall(), 10);
                });
                span.addEventListener('mouseleave', () => {
                    if (mouseEnterTimer) clearTimeout(mouseEnterTimer);
                });
                
               
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
                    
                 
                    if (touchDuration < 300 && distance > 30) {
                        const speed = distance / touchDuration;
                        
                        const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
                        const velocityFactor = isChrome ? 7 : 10; 
                        const velocityX = (deltaX / distance) * speed * velocityFactor;
                        const velocityY = (deltaY / distance) * speed * velocityFactor;
                        handleWordFall(velocityX, velocityY);
                    } else if (touchDuration < 300) {
                  
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
