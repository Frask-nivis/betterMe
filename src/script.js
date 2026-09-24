// Simple interactivity for the BetterMe template
document.addEventListener('DOMContentLoaded', function() {
    // Navbar scroll effect
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            // Scrolling down - hide navbar
            document.querySelector('.navbar').style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up - show navbar
            document.querySelector('.navbar').style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Mobile menu toggle (simple implementation)
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelector('.nav-links');
    
    // Create mobile button
    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'mobile-menu-btn';
    mobileBtn.innerHTML = '☰';
    mobileBtn.style.display = 'none';
    mobileBtn.style.fontSize = '1.5rem';
    mobileBtn.style.cursor = 'pointer';
    navbar.querySelector('.container').prepend(mobileBtn);
    
    mobileBtn.addEventListener('click', function() {
        if (navLinks.style.display === 'flex') {
            navLinks.style.display = 'none';
        } else {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'var(--white)';
            navLinks.style.padding = '1rem';
            navLinks.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }
    });
});