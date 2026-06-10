const glowElement = document.createElement('div');
glowElement.className = 'glow-effect';
document.body.appendChild(glowElement);

let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    glowElement.style.opacity = '0.6';
    glowElement.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    
    clearTimeout(window.glowTimeout);
    window.glowTimeout = setTimeout(() => {
        glowElement.style.opacity = '0';
    }, 100);
});

document.querySelectorAll('.tariff-card, .btn').forEach(element => {
    element.addEventListener('click', (e) => {
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.top = `${e.clientY - element.getBoundingClientRect().top}px`;
        ripple.style.left = `${e.clientX - element.getBoundingClientRect().left}px`;
        ripple.style.width = '0';
        ripple.style.height = '0';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.3)';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.transition = 'width 0.6s, height 0.6s';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '10';
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.style.width = '300px';
            ripple.style.height = '300px';
        }, 10);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});