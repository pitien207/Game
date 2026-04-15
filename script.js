// Game Variables
let animals = [];
let currentCardIndex = 0;
let isFlipped = false;
let gameStarted = false;
let touchStartX = 0;
let touchEndX = 0;

// DOM Elements
const startupScreen = document.getElementById("startupScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const homeBtn = document.getElementById("homeBtn");
const card = document.getElementById("card");
const questionText = document.getElementById("questionText");
const answerText = document.getElementById("answerText");
const animalEmoji = document.getElementById("animalEmoji");
const currentCardSpan = document.getElementById("currentCard");
const totalCardsSpan = document.getElementById("totalCards");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const completeOverlay = document.getElementById("completeOverlay");
const restartBtn = document.getElementById("restartBtn");
const swipeHint = document.getElementById("swipeHint");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  totalCardsSpan.textContent = animalsOriginal.length;
  setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
  startBtn.addEventListener("click", startGame);
  homeBtn.addEventListener("click", goHome);
  card.addEventListener("click", flipCard);
  prevBtn.addEventListener("click", previousCard);
  nextBtn.addEventListener("click", nextCard);
  restartBtn.addEventListener("click", startGame);

  // Touch events for swipe
  document.addEventListener("touchstart", handleTouchStart, false);
  document.addEventListener("touchend", handleTouchEnd, false);

  // Keyboard events
  document.addEventListener("keydown", handleKeyPress);
}

// Shuffle function
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Start Game
function startGame() {
  gameStarted = true;
  currentCardIndex = 0;
  isFlipped = false;

  // Shuffle animals on game start
  animals = shuffleArray(animalsOriginal);

  startupScreen.classList.add("hide");
  gameScreen.classList.add("show");
  completeOverlay.classList.remove("show");

  loadCard();
  updateButtonStates();
  hideSwipeHint();

  // Show swipe hint after 1 second
  setTimeout(() => {
    if (gameStarted) {
      showSwipeHint();
    }
  }, 1000);
}

// Go Home
function goHome() {
  gameStarted = false;
  isFlipped = false;

  startupScreen.classList.remove("hide");
  gameScreen.classList.remove("show");
  completeOverlay.classList.remove("show");

  resetCard();
}

// Load Card
function loadCard() {
  const animal = animals[currentCardIndex];
  questionText.textContent = animal.question;
  answerText.textContent = animal.name;
  animalEmoji.style.backgroundImage = `url('${animal.image}')`;
  animalEmoji.style.backgroundSize = "cover";
  animalEmoji.style.backgroundPosition = "center";
  animalEmoji.textContent = "";

  currentCardSpan.textContent = currentCardIndex + 1;

  isFlipped = false;
  card.classList.remove("flipped");

  updateButtonStates();
}

// Flip Card
function flipCard() {
  card.classList.toggle("flipped");
  isFlipped = !isFlipped;
}

// Next Card
function nextCard() {
  if (currentCardIndex < animals.length - 1) {
    // Slide out animation
    card.classList.add("slide-left");
    setTimeout(() => {
      currentCardIndex++;
      card.classList.remove("slide-left");
      card.classList.add("slide-in-left");
      loadCard();
      setTimeout(() => {
        card.classList.remove("slide-in-left");
      }, 500);
    }, 500);
  } else {
    completeGame();
  }
}

// Previous Card
function previousCard() {
  if (currentCardIndex > 0) {
    // Slide out animation
    card.classList.add("slide-right");
    setTimeout(() => {
      currentCardIndex--;
      card.classList.remove("slide-right");
      card.classList.add("slide-in-right");
      loadCard();
      setTimeout(() => {
        card.classList.remove("slide-in-right");
      }, 500);
    }, 500);
  }
}

// Update Button States
function updateButtonStates() {
  prevBtn.disabled = currentCardIndex === 0;
  nextBtn.disabled = currentCardIndex === animals.length - 1;
  nextBtn.textContent =
    currentCardIndex === animals.length - 1 ? "✓ Fertig" : "Weiter →";
}

// Reset Card
function resetCard() {
  card.classList.remove("flipped");
  isFlipped = false;
  currentCardIndex = 0;
}

// Complete Game
function completeGame() {
  completeOverlay.classList.add("show");
}

// Touch Events for Swipe
function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swipe left - go to next card
      nextCard();
    } else {
      // Swipe right - go to previous card
      previousCard();
    }
  }
}

// Keyboard Events
function handleKeyPress(e) {
  if (!gameStarted) return;

  if (e.key === "ArrowLeft") {
    previousCard();
  } else if (e.key === "ArrowRight") {
    nextCard();
  } else if (e.key === " ") {
    e.preventDefault();
    flipCard();
  }
}

// Swipe Hint Functions
function showSwipeHint() {
  swipeHint.style.opacity = "1";
}

function hideSwipeHint() {
  swipeHint.style.opacity = "0";
}

// Add transition to swipeHint
swipeHint.style.transition = "opacity 0.3s ease";

// Hide swipe hint when user interacts
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
