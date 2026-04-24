if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

function resetPageScroll() {
    try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (error) {
        window.scrollTo(0, 0);
    }
}

function formatTimerUnit(value) {
    return value < 10 ? `0${value}` : `${value}`;
}

function getStorageItem(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function setStorageItem(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch (error) {
        // Ignore storage failures in older Safari private mode.
    }
}

function removeStorageItem(key) {
    try {
        sessionStorage.removeItem(key);
    } catch (error) {
        // Ignore storage failures in older Safari private mode.
    }
}

function supportsIntersectionObserver() {
    return typeof window.IntersectionObserver === 'function';
}

function getClosestElement(element, selector) {
    if (!element) return null;
    if (typeof element.closest === 'function') {
        return element.closest(selector);
    }

    const matcher = Element.prototype.matches
        || Element.prototype.msMatchesSelector
        || Element.prototype.webkitMatchesSelector;
    let current = element;

    while (current && current.nodeType === 1) {
        if (matcher && matcher.call(current, selector)) {
            return current;
        }
        current = current.parentElement;
    }

    return null;
}

function scrollElementTo(track, left, behavior) {
    const safeLeft = Math.max(0, left);

    if (typeof track.scrollTo === 'function') {
        try {
            track.scrollTo({
                left: safeLeft,
                behavior: behavior
            });
            return;
        } catch (error) {
            // Fallback for older Safari that supports only numeric arguments.
        }
    }

    track.scrollLeft = safeLeft;
}

// ===== ТАЙМЕР ОБРАТНОГО ОТСЧЕТА =====
function updateTimer() {
    const weddingDate = new Date(2026, 7, 2, 15, 0);
    const now = new Date();
    const diff = weddingDate - now;
    
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    if (!daysEl) return;
    
    if (diff <= 0) {
        daysEl.textContent = '00';
        hoursEl.textContent = '00';
        minutesEl.textContent = '00';
        secondsEl.textContent = '00';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    daysEl.textContent = formatTimerUnit(days);
    hoursEl.textContent = formatTimerUnit(hours);
    minutesEl.textContent = formatTimerUnit(minutes);
    secondsEl.textContent = formatTimerUnit(seconds);
}

updateTimer();
setInterval(updateTimer, 1000);

// ===== EnvelopeIntro =====
class EnvelopeIntro {
    constructor({
        root,
        onOpenComplete = () => {},
        storageKey = 'wedding-envelope-intro-opened'
    }) {
        this.root = root;
        this.onOpenComplete = onOpenComplete;
        this.storageKey = storageKey;
        this.trigger = root ? root.querySelector('#envelopeTrigger') : null;
        this.button = root ? root.querySelector('#envelopeOpenButton') : null;
        this.panel = root ? root.querySelector('.envelope-intro__panel') : null;
        this.isOpened = false;
        this.isAnimating = false;
        this.openTimeout = null;
        this.animationDuration = this.getAnimationDuration();

        if (!this.root || !this.trigger || !this.button || !this.panel) return;

        if (getStorageItem(this.storageKey) === '1') {
            this.finishImmediately();
            return;
        }

        resetPageScroll();
        window.setTimeout(resetPageScroll, 0);
        document.body.classList.add('intro-active');
        this.setResponsiveScale();
        this.bindEvents();
    }

    getAnimationDuration() {
        const duration = getComputedStyle(this.root)
            .getPropertyValue('--intro-open-duration')
            .trim();
        const fallbackMs = 2000;

        if (!duration) return fallbackMs;
        if (duration.endsWith('ms')) return parseFloat(duration);
        if (duration.endsWith('s')) return parseFloat(duration) * 1000;
        return fallbackMs;
    }

    bindEvents() {
        this.handleOpen = this.handleOpen.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleResize = this.setResponsiveScale.bind(this);

        this.trigger.addEventListener('click', this.handleOpen);
        this.button.addEventListener('click', this.handleOpen);
        this.trigger.addEventListener('keydown', this.handleKeydown);
        window.addEventListener('resize', this.handleResize, { passive: true });
        if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
            window.visualViewport.addEventListener('resize', this.handleResize, { passive: true });
        }
    }

    setResponsiveScale() {
        if (!this.panel) return;

        const viewport = window.visualViewport || window;
        const viewportWidth = viewport.width || window.innerWidth;
        const viewportHeight = viewport.height || window.innerHeight;
        const isPortraitTablet = window.matchMedia('(orientation: portrait) and (max-width: 1199px)').matches;
        const isCompactWidth = window.matchMedia('(max-width: 640px)').matches;
        const isLowHeight = window.matchMedia('(max-height: 620px)').matches;
        const isCompactEnvelope = isCompactWidth || isPortraitTablet || isLowHeight;
        const edgePadding = isCompactEnvelope ? 0 : Math.min(48, viewportWidth * 0.03);
        const safeWidth = Math.max(viewportWidth - edgePadding, 240);
        const safeHeight = Math.max(viewportHeight - edgePadding, 260);
        const panelWidth = this.panel.offsetWidth || 320;
        const panelHeight = this.panel.offsetHeight || 540;
        const widthScale = safeWidth / panelWidth;
        const heightScale = safeHeight / panelHeight;
        const nextScale = Math.min(widthScale, heightScale);
        const scale = Math.max(nextScale, 0.34);

        this.panel.style.setProperty('--intro-panel-scale', scale.toFixed(3));
    }

    handleKeydown(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.handleOpen();
    }

    handleOpen() {
        if (this.isOpened || this.isAnimating) return;

        this.isAnimating = true;
        this.root.classList.add('is-animating', 'is-opening');
        this.button.disabled = true;
        this.trigger.setAttribute('aria-disabled', 'true');

        this.openTimeout = window.setTimeout(() => {
            this.completeOpen();
        }, this.animationDuration + 280);
    }

    completeOpen() {
        if (this.isOpened) return;

        this.isOpened = true;
        this.isAnimating = false;
        setStorageItem(this.storageKey, '1');
        document.body.classList.remove('intro-active');

        this.root.setAttribute('aria-hidden', 'true');
        this.root.classList.add('is-hidden');
        resetPageScroll();

        window.setTimeout(() => {
            this.root.hidden = true;
            resetPageScroll();
            this.onOpenComplete();
        }, 700);
    }

    finishImmediately() {
        this.isOpened = true;
        this.root.hidden = true;
        this.root.classList.add('is-hidden');
        this.root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('intro-active');
        this.onOpenComplete();
    }
}

function initEnvelopeIntro() {
    const introRoot = document.getElementById('envelopeIntro');
    if (!introRoot) return null;

    // Reset intro state on full page leave/reload so the envelope
    // appears again after a manual refresh.
    window.addEventListener('pagehide', () => {
        removeStorageItem('wedding-envelope-intro-opened');
    });

    return new EnvelopeIntro({
        root: introRoot,
        onOpenComplete: () => {
            document.body.classList.remove('intro-active');
        }
    });
}

function initBackgroundVideoFallback() {
    const background = document.querySelector('.site-background');
    const video = background ? background.querySelector('.site-background-video') : null;

    if (!background || !video) return;

    let playAttemptInFlight = false;

    function setStaticBackground(isStatic) {
        background.classList.toggle('is-static', isStatic);
    }

    function tryStartVideo() {
        if (playAttemptInFlight) return;
        playAttemptInFlight = true;

        try {
            const playResult = video.play();

            if (playResult && typeof playResult.then === 'function') {
                playResult
                    .then(function() {
                        window.setTimeout(function() {
                            setStaticBackground(video.paused || video.readyState < 2);
                        }, 180);
                        playAttemptInFlight = false;
                    })
                    .catch(function() {
                        setStaticBackground(true);
                        playAttemptInFlight = false;
                    });
                return;
            }

            window.setTimeout(function() {
                setStaticBackground(video.paused || video.readyState < 2);
            }, 180);
        } catch (error) {
            setStaticBackground(true);
        }

        playAttemptInFlight = false;
    }

    function syncBackgroundState() {
        setStaticBackground(video.paused || video.ended || video.readyState < 2);
    }

    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    video.addEventListener('playing', function() {
        setStaticBackground(false);
    });
    video.addEventListener('canplay', syncBackgroundState);
    video.addEventListener('pause', syncBackgroundState);
    video.addEventListener('stalled', function() {
        setStaticBackground(true);
    });
    video.addEventListener('suspend', syncBackgroundState);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            tryStartVideo();
        }
    });
    window.addEventListener('pageshow', tryStartVideo);
    document.addEventListener('touchstart', tryStartVideo, { passive: true, once: true });

    window.setTimeout(syncBackgroundState, 120);
    window.setTimeout(tryStartVideo, 160);
}

document.addEventListener('DOMContentLoaded', () => {
    initBackgroundVideoFallback();
    initEnvelopeIntro();
    initMusicPlayer();
});

function initMusicPlayer() {
    const button = document.getElementById('musicToggleBtn');
    const audio = document.getElementById('weddingMusic');

    if (!button || !audio) return;

    const playIcon = button.querySelector('[data-music-icon-play]');
    const pauseIcon = button.querySelector('[data-music-icon-pause]');
    audio.loop = true;

    function setPlayerState(isPlaying) {
        button.classList.toggle('playing', isPlaying);
        button.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
        button.setAttribute('aria-label', isPlaying ? 'Поставить музыку на паузу' : 'Включить фоновую музыку');

        if (playIcon && pauseIcon) {
            playIcon.setAttribute('aria-hidden', isPlaying ? 'true' : 'false');
            pauseIcon.setAttribute('aria-hidden', isPlaying ? 'false' : 'true');
        }

    }

    button.addEventListener('click', function() {
        if (audio.paused) {
            try {
                const playResult = audio.play();
                if (playResult && typeof playResult.catch === 'function') {
                    playResult.catch(function() {
                        button.setAttribute('aria-label', 'Не удалось включить музыку');
                    });
                }
            } catch (error) {
                button.setAttribute('aria-label', 'Не удалось включить музыку');
            }
            return;
        }

        audio.pause();
    });

    audio.addEventListener('play', function() {
        setPlayerState(true);
    });
    audio.addEventListener('pause', function() {
        setPlayerState(false);
    });
    audio.addEventListener('ended', function() {
        audio.currentTime = 0;
        const restartPlayback = audio.play();
        if (restartPlayback && typeof restartPlayback.catch === 'function') {
            restartPlayback.catch(function() {
                setPlayerState(false);
            });
        }
    });
    setPlayerState(false);
}

// ===== ФОРМА (отправка в Google Таблицу) =====
const weddingForm = document.getElementById('weddingForm');
if (weddingForm) {
    const attendanceInput = document.getElementById('attendance');
    const guestsInput = document.getElementById('guests');
    const companionsGroup = document.getElementById('companionsGroup');
    const companionsLabel = document.getElementById('companionsLabel');
    const companionsInput = document.getElementById('companions');
    const drinksSection = document.getElementById('drinksSection');
    const dietGroup = document.getElementById('dietGroup');
    const dietInput = document.getElementById('diet');
    const wishesGroup = document.getElementById('wishesGroup');
    const wishesInput = document.getElementById('wishes');
    const drinksHiddenInput = document.getElementById('drinks');
    const drinksCheckboxes = weddingForm.querySelectorAll('#drinksGroup input[type="checkbox"]');

    function updateCompanionsField() {
        const guestsCount = Number(guestsInput.value) || 1;
        const hasCompanions = guestsCount > 1;
        const attendanceValue = attendanceInput.value;
        const isDeclined = attendanceValue === 'no';

        companionsGroup.classList.toggle('is-hidden', !hasCompanions);
        companionsInput.required = hasCompanions;
        companionsLabel.textContent = isDeclined
            ? 'Имя и фамилия тех, кто не сможет прийти *'
            : 'Имя и фамилия остальных гостей *';

        if (!hasCompanions) {
            companionsInput.value = '';
        }
    }

    function updateDrinksField() {
        const selectedDrinks = Array.from(drinksCheckboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);

        drinksHiddenInput.value = selectedDrinks.join(', ');
    }

    function updateAttendanceDependentFields() {
        const attendanceValue = attendanceInput.value;
        const hidePreferenceFields = attendanceValue === 'no';

        drinksSection.classList.toggle('is-hidden', hidePreferenceFields);
        dietGroup.classList.toggle('is-hidden', hidePreferenceFields);
        wishesGroup.classList.remove('is-hidden');

        if (hidePreferenceFields) {
            drinksCheckboxes.forEach((checkbox) => {
                checkbox.checked = false;
            });
            dietInput.value = '';
            updateDrinksField();
        }

        updateCompanionsField();
    }

    guestsInput.addEventListener('input', updateCompanionsField);
    attendanceInput.addEventListener('change', updateAttendanceDependentFields);
    drinksCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', updateDrinksField);
    });

    updateAttendanceDependentFields();
    updateDrinksField();

    weddingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const form = this;
        const submitBtn = document.getElementById('submitBtn');
        const formMessage = document.getElementById('formMessage');
        const formSuccessNote = document.getElementById('formSuccessNote');

        formMessage.style.display = 'none';
        formSuccessNote.classList.add('is-hidden');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe_' + Date.now();
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        form.target = iframe.name;
        
        iframe.onload = function() {
            formMessage.className = 'form-message success';
            formMessage.textContent = 'Данные отправлены.';
            formMessage.style.display = 'block';
            formSuccessNote.classList.remove('is-hidden');
            form.reset();
            updateAttendanceDependentFields();
            updateDrinksField();
            form.classList.add('is-hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
            
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 2000);
            
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        };
        
        iframe.onerror = function() {
            formMessage.className = 'form-message error';
            formMessage.textContent = 'Ошибка отправки. Пожалуйста, попробуйте еще раз.';
            formMessage.style.display = 'block';
            formSuccessNote.classList.add('is-hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
            document.body.removeChild(iframe);
        };
        
        form.submit();
    });

    const resetFormBtn = document.getElementById('resetFormBtn');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', function() {
            weddingForm.reset();
            updateAttendanceDependentFields();
            updateDrinksField();
            weddingForm.classList.remove('is-hidden');
            document.getElementById('formSuccessNote').classList.add('is-hidden');
            document.getElementById('formMessage').style.display = 'none';
        });
    }
}

// ===== АНИМАЦИЯ ПРОГРАММЫ ДНЯ =====
document.addEventListener('DOMContentLoaded', function() {
    const timeline = document.querySelector('.timeline');
    const hearts = document.querySelectorAll('.timeline-heart');
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    if (timeline && hearts.length) {
        if (supportsIntersectionObserver()) {
            const observerTimeline = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            timeline.classList.add('animate');
                        }, 200);
                        
                        hearts.forEach((heart, index) => {
                            setTimeout(() => {
                                heart.classList.add('animate');
                            }, 300 + (index * 80));
                        });
                        
                        observerTimeline.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            
            observerTimeline.observe(timeline);
        } else {
            timeline.classList.add('animate');
            hearts.forEach((heart) => {
                heart.classList.add('animate');
            });
        }
    }
    
    if (timelineItems.length) {
        if (supportsIntersectionObserver()) {
            const observerItems = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, 100);
                    }
                });
            }, { threshold: 0.3 });
            
            timelineItems.forEach(item => {
                observerItems.observe(item);
            });
        } else {
            timelineItems.forEach((item) => {
                item.classList.add('visible');
            });
        }
    }

    const timelinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    timelinePath.setAttribute('d', 'M64 0 C108 78 108 162 64 240 C20 318 20 402 64 480 C108 558 108 642 64 720 C20 798 20 882 64 960 C108 1038 108 1122 64 1200');
    const timelinePathLength = timelinePath.getTotalLength();
    const timelineViewboxHeight = 1200;

    let targetTimelineProgress = 0;
    let currentTimelineProgress = 0;
    let heartAnimationFrame = null;

    function getTimelineProgress() {
        if (!timeline) return 0;
        const timelineRect = timeline.getBoundingClientRect();
        const viewportAnchor = window.innerHeight * 0.45;
        const rawProgress = (viewportAnchor - timelineRect.top) / Math.max(timelineRect.height, 1);
        return Math.min(Math.max(rawProgress, 0), 1);
    }

    function applyTimelineHeartPosition(progress) {
        if (!timeline) return;

        const timelineRect = timeline.getBoundingClientRect();
        const pathPoint = timelinePath.getPointAtLength(timelinePathLength * progress);
        const scaleY = timelineRect.height / timelineViewboxHeight;
        const relativeTop = pathPoint.y * scaleY;
        const pathCenterX = 64;
        const waveOffset = pathPoint.x - pathCenterX;

        timeline.style.setProperty('--heart-top', `${relativeTop.toFixed(2)}px`);
        timeline.style.setProperty('--heart-offset-x', `${waveOffset.toFixed(2)}px`);
    }

    function animateTimelineHeart() {
        const delta = targetTimelineProgress - currentTimelineProgress;

        if (Math.abs(delta) < 0.001) {
            currentTimelineProgress = targetTimelineProgress;
            applyTimelineHeartPosition(currentTimelineProgress);
            heartAnimationFrame = null;
            return;
        }

        currentTimelineProgress += delta * 0.18;
        applyTimelineHeartPosition(currentTimelineProgress);
        heartAnimationFrame = requestAnimationFrame(animateTimelineHeart);
    }

    function scheduleTimelineHeartUpdate() {
        targetTimelineProgress = getTimelineProgress();
        if (heartAnimationFrame !== null) return;
        heartAnimationFrame = requestAnimationFrame(animateTimelineHeart);
    }
    
    function updateHeartColors() {
        const windowHeight = window.innerHeight;
        
        timelineItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const itemCenter = rect.top + rect.height / 2;
            const viewportCenter = windowHeight / 2;
            
            if (itemCenter < viewportCenter) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else if (rect.top < windowHeight - 150 && rect.bottom > 150) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    function handleTimelineScrollFrame() {
        updateHeartColors();
        scheduleTimelineHeartUpdate();
    }

    window.addEventListener('scroll', handleTimelineScrollFrame, { passive: true });
    window.addEventListener('resize', handleTimelineScrollFrame);
    updateHeartColors();
    scheduleTimelineHeartUpdate();
});

// ===== АНИМАЦИЯ БЛОКОВ ОРГАНИЗАЦИОННЫХ МОМЕНТОВ ДЛЯ МОБИЛЬНЫХ =====
function initInfoItemsAnimation() {
    const infoItems = document.querySelectorAll('.info-item');
    
    if (!infoItems.length) return;
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        if (supportsIntersectionObserver()) {
            const observerInfo = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible-mobile');
                    }
                });
            }, { threshold: 0.3 });
            
            infoItems.forEach(item => {
                observerInfo.observe(item);
            });
        } else {
            infoItems.forEach((item) => {
                item.classList.add('visible-mobile');
            });
        }
    }
}

initInfoItemsAnimation();

window.addEventListener('resize', function() {
    const infoItems = document.querySelectorAll('.info-item');
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        infoItems.forEach(item => {
            item.classList.remove('visible-mobile');
        });

        if (supportsIntersectionObserver()) {
            const observerInfo = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible-mobile');
                    }
                });
            }, { threshold: 0.3 });
            
            infoItems.forEach(item => {
                observerInfo.observe(item);
            });
        } else {
            infoItems.forEach((item) => {
                item.classList.add('visible-mobile');
            });
        }
    } else {
        infoItems.forEach(item => {
            item.classList.remove('visible-mobile');
        });
    }
});

// ===== АНИМАЦИЯ ПОЯВЛЕНИЯ И ИСЧЕЗНОВЕНИЯ БЛОКОВ ПРИ ПРОКРУТКЕ =====
function initScrollAnimation() {
    const blocks = document.querySelectorAll('.organizer-contact, .timer-section, .calendar-section, .schedule, .location, .dresscode, .info, .photo-interlude, .rsvp');
    
    if (!blocks.length) return;

    document.body.classList.add('has-scroll-animation');

    function updateBlockVisibility() {
        const viewportHeight = window.innerHeight;
        const showTop = viewportHeight * 0.14;
        const showBottom = viewportHeight * 0.86;
        const hideTop = viewportHeight * 0.02;
        const hideBottom = viewportHeight * 0.98;

        blocks.forEach(block => {
            const rect = block.getBoundingClientRect();
            const isVisible = block.classList.contains('visible-scroll');

            if (isVisible) {
                const shouldHide = rect.bottom < hideTop || rect.top > hideBottom;

                if (shouldHide) {
                    block.classList.remove('visible-scroll');
                }

                return;
            }

            const shouldShow = rect.top <= showBottom && rect.bottom >= showTop;

            if (shouldShow) {
                block.classList.add('visible-scroll');
            }
        });
    }

    window.addEventListener('scroll', updateBlockVisibility, { passive: true });
    window.addEventListener('resize', updateBlockVisibility);
    updateBlockVisibility();
}

// ===== ПРОСТАЯ КАРУСЕЛЬ (100% РАБОТАЕТ) =====
function initSimpleCarousel() {
    function getSlides(track) {
        return Array.from(track.querySelectorAll('.simple-slide'));
    }

    function getDotsContainer(track) {
        const carouselSection = getClosestElement(track, '.carousel-section');
        return carouselSection ? carouselSection.querySelector('.simple-dots') : null;
    }

    function getCenteredIndex(track) {
        const slides = getSlides(track);
        if (!slides.length) return 0;

        const trackCenter = track.scrollLeft + (track.clientWidth / 2);
        let closestIndex = 0;
        let closestDistance = Infinity;

        slides.forEach((slide, index) => {
            const slideCenter = slide.offsetLeft + (slide.offsetWidth / 2);
            const distance = Math.abs(slideCenter - trackCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }

    function updateDots(track, currentIndex) {
        const dotsContainer = getDotsContainer(track);
        if (!dotsContainer) return;

        const dots = dotsContainer.querySelectorAll('.simple-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    function updateActiveSlide(track, currentIndex) {
        const slides = getSlides(track);
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === currentIndex);
        });
    }

    function scrollToSlide(track, index, smooth = true) {
        const slides = getSlides(track);
        if (!slides.length) return 0;

        const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
        const slide = slides[safeIndex];
        const targetLeft = slide.offsetLeft - ((track.clientWidth - slide.offsetWidth) / 2);

        scrollElementTo(track, targetLeft, smooth ? 'smooth' : 'auto');

        updateDots(track, safeIndex);
        updateActiveSlide(track, safeIndex);
        return safeIndex;
    }

    function setupCarousel(track, prevBtn, nextBtn) {
        const slides = getSlides(track);
        if (!slides.length) return;

        let currentIndex = 0;
        let scrollTicking = false;
        const lastIndex = slides.length - 1;
        const dotsContainer = getDotsContainer(track);

        function goToSlide(index, smooth = true) {
            currentIndex = scrollToSlide(track, index, smooth);
        }

        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            slides.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.classList.add('simple-dot');
                dot.setAttribute('aria-label', `Перейти к слайду ${index + 1}`);
                dot.classList.toggle('active', index === 0);
                dot.addEventListener('click', function() {
                    goToSlide(index);
                });
                dotsContainer.appendChild(dot);
            });
        }

        track.addEventListener('scroll', function() {
            if (scrollTicking) return;

            scrollTicking = true;
            window.requestAnimationFrame(function() {
                const newIndex = getCenteredIndex(track);
                if (newIndex !== currentIndex) {
                    currentIndex = newIndex;
                    updateDots(track, currentIndex);
                    updateActiveSlide(track, currentIndex);
                }
                scrollTicking = false;
            });
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                goToSlide(currentIndex <= 0 ? lastIndex : currentIndex - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                goToSlide(currentIndex >= lastIndex ? 0 : currentIndex + 1);
            });
        }

        window.addEventListener('resize', function() {
            goToSlide(currentIndex, false);
        });

        window.requestAnimationFrame(function() {
            goToSlide(0, false);
        });
    }

    const maleTrack = document.querySelector('.simple-track[data-track="male"]');
    const malePrev = document.querySelector('.simple-prev[data-carousel="male"]');
    const maleNext = document.querySelector('.simple-next[data-carousel="male"]');
    if (maleTrack) setupCarousel(maleTrack, malePrev, maleNext);

    const femaleTrack = document.querySelector('.simple-track[data-track="female"]');
    const femalePrev = document.querySelector('.simple-prev[data-carousel="female"]');
    const femaleNext = document.querySelector('.simple-next[data-carousel="female"]');
    if (femaleTrack) setupCarousel(femaleTrack, femalePrev, femaleNext);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimpleCarousel);
} else {
    initSimpleCarousel();
}

document.addEventListener('DOMContentLoaded', function() {
    initScrollAnimation();
});
