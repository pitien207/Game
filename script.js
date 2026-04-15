let animals = [];
let currentCardIndex = 0;
let isFlipped = false;
let gameStarted = false;
let isAnimating = false;
let touchStartX = 0;
let touchEndX = 0;
let swipeHintTimeoutId = null;

const CARD_ANIMATION_MS = 500;
const SWIPE_THRESHOLD = 50;

const startupScreen = document.getElementById("startupScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const homeBtn = document.getElementById("homeBtn");
const card = document.getElementById("card");
const questionText = document.getElementById("questionText");
const answerText = document.getElementById("answerText");
const animalImage = document.getElementById("animalImage");
const currentCardSpan = document.getElementById("currentCard");
const totalCardsSpan = document.getElementById("totalCards");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const completeOverlay = document.getElementById("completeOverlay");
const restartBtn = document.getElementById("restartBtn");
const swipeHint = document.getElementById("swipeHint");

document.addEventListener("DOMContentLoaded", init);

function init() {
  totalCardsSpan.textContent = animalsOriginal.length;
  swipeHint.style.transition = "opacity 0.3s ease";
  setupEventListeners();
  preloadAnimalImages();
}

function setupEventListeners() {
  startBtn.addEventListener("click", startGame);
  homeBtn.addEventListener("click", goHome);
  card.addEventListener("click", flipCard);
  prevBtn.addEventListener("click", previousCard);
  nextBtn.addEventListener("click", nextCard);
  restartBtn.addEventListener("click", startGame);

  document.addEventListener("touchstart", handleTouchStart, false);
  document.addEventListener("touchend", handleTouchEnd, false);
  document.addEventListener("keydown", handleKeyPress);

  document.addEventListener(
    "touchstart",
    () => {
      hideSwipeHint();
    },
    { once: true },
  );

  document.addEventListener(
    "click",
    () => {
      hideSwipeHint();
    },
    { once: true },
  );
}

function preloadAnimalImages() {
  animalsOriginal.forEach((animal) => {
    const image = new Image();
    image.src = animal.image;
  });
}

function shuffleArray(array) {
  const shuffled = [...array];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function startGame() {
  gameStarted = true;
  isAnimating = false;
  currentCardIndex = 0;
  isFlipped = false;
  animals = shuffleArray(animalsOriginal);

  clearTimeout(swipeHintTimeoutId);
  startupScreen.classList.add("hide");
  gameScreen.classList.add("show");
  completeOverlay.classList.remove("show");

  renderCurrentCard();
  scheduleSwipeHint();
}

function goHome() {
  gameStarted = false;
  isAnimating = false;
  isFlipped = false;

  clearTimeout(swipeHintTimeoutId);
  startupScreen.classList.remove("hide");
  gameScreen.classList.remove("show");
  completeOverlay.classList.remove("show");

  resetCard();
}

function renderCurrentCard() {
  const animal = animals[currentCardIndex];

  if (!animal) {
    return;
  }

  questionText.textContent = animal.question;
  answerText.textContent = animal.name;
  animalImage.src = animal.image;
  animalImage.alt = `Bild von ${animal.name}`;

  currentCardSpan.textContent = String(currentCardIndex + 1);
  card.classList.remove("flipped");
  isFlipped = false;

  updateButtonStates();
}

function flipCard() {
  if (!gameStarted || isAnimating) {
    return;
  }

  card.classList.toggle("flipped");
  isFlipped = !isFlipped;
  hideSwipeHint();
}

function nextCard() {
  navigateCard(1);
}

function previousCard() {
  navigateCard(-1);
}

function navigateCard(direction) {
  if (!gameStarted || isAnimating) {
    return;
  }

  const targetIndex = currentCardIndex + direction;

  if (targetIndex < 0) {
    return;
  }

  if (targetIndex >= animals.length) {
    completeGame();
    return;
  }

  hideSwipeHint();
  animateCardTransition(direction, targetIndex);
}

function animateCardTransition(direction, targetIndex) {
  const exitClass = direction > 0 ? "slide-left" : "slide-right";
  const enterClass = direction > 0 ? "slide-in-left" : "slide-in-right";

  isAnimating = true;
  card.classList.add(exitClass);

  window.setTimeout(() => {
    currentCardIndex = targetIndex;
    card.classList.remove(exitClass);
    card.classList.add(enterClass);
    renderCurrentCard();

    window.setTimeout(() => {
      card.classList.remove(enterClass);
      isAnimating = false;
    }, CARD_ANIMATION_MS);
  }, CARD_ANIMATION_MS);
}

function updateButtonStates() {
  prevBtn.disabled = currentCardIndex === 0;
  nextBtn.disabled = animals.length === 0;
  nextBtn.textContent =
    currentCardIndex === animals.length - 1 ? "Fertig" : "Weiter ->";
}

function resetCard() {
  currentCardIndex = 0;
  card.classList.remove("flipped", "slide-left", "slide-right", "slide-in-left", "slide-in-right");
  currentCardSpan.textContent = "1";
}

function completeGame() {
  gameStarted = false;
  isAnimating = false;
  completeOverlay.classList.add("show");
}

function handleTouchStart(event) {
  touchStartX = event.changedTouches[0].screenX;
}

function handleTouchEnd(event) {
  if (!gameStarted) {
    return;
  }

  touchEndX = event.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const distance = touchStartX - touchEndX;

  if (Math.abs(distance) <= SWIPE_THRESHOLD) {
    return;
  }

  if (distance > 0) {
    nextCard();
    return;
  }

  previousCard();
}

function handleKeyPress(event) {
  if (!gameStarted || isAnimating) {
    return;
  }

  if (event.key === "ArrowLeft") {
    previousCard();
    return;
  }

  if (event.key === "ArrowRight") {
    nextCard();
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    flipCard();
  }
}

function showSwipeHint() {
  swipeHint.style.opacity = "1";
}

function hideSwipeHint() {
  swipeHint.style.opacity = "0";
}

function scheduleSwipeHint() {
  hideSwipeHint();
  swipeHintTimeoutId = window.setTimeout(() => {
    if (gameStarted) {
      showSwipeHint();
    }
  }, 1000);
}
