document.addEventListener('DOMContentLoaded', function () {
    const header = document.querySelector('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add shadow when scrolling down
        if (currentScroll > 0) {
            header.classList.add('header-shadow');
        } else {
            header.classList.remove('header-shadow');
        }

        lastScroll = currentScroll;
    });
});