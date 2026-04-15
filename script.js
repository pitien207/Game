const GAME_CATALOG = [
  {
    id: "wer-bin-ich",
    title: "Wer bin ich?",
    icon: "images/favicon.png",
    available: true,
    menuDescription:
      "Ich gebe dir Hinweise - kannst du erraten, welches Tier ich bin?",
  },
];

let animals = [];
let currentCardIndex = 0;
let currentGameId = null;
let isFlipped = false;
let gameStarted = false;
let isAnimating = false;
let touchStartX = 0;
let touchEndX = 0;
let swipeHintTimeoutId = null;
const imagePreloadCache = new Map();

const CARD_ANIMATION_MS = 320;
const SWIPE_THRESHOLD = 50;

const selectionScreen = document.getElementById("selectionScreen");
const gamesGrid = document.getElementById("gamesGrid");
const startupScreen = document.getElementById("startupScreen");
const menuTitle = document.getElementById("menuTitle");
const menuDescription = document.getElementById("menuDescription");
const startBtn = document.getElementById("startBtn");
const selectionBtn = document.getElementById("selectionBtn");
const gameScreen = document.getElementById("gameScreen");
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
  renderGameSelection();
  setupEventListeners();
  preloadAssets();
  hideSwipeHint();
}

function setupEventListeners() {
  gamesGrid.addEventListener("click", handleGameSelection);
  startBtn.addEventListener("click", startCurrentGame);
  selectionBtn.addEventListener("click", showGameSelection);
  homeBtn.addEventListener("click", goHome);
  card.addEventListener("click", flipCard);
  prevBtn.addEventListener("click", previousCard);
  nextBtn.addEventListener("click", nextCard);
  restartBtn.addEventListener("click", restartCurrentGame);

  document.addEventListener("touchstart", handleTouchStart, false);
  document.addEventListener("touchend", handleTouchEnd, false);
  document.addEventListener("keydown", handleKeyPress);
  document.addEventListener("touchstart", dismissSwipeHintOnInteraction);
  document.addEventListener("click", dismissSwipeHintOnInteraction);
}

function renderGameSelection() {
  gamesGrid.innerHTML = GAME_CATALOG.map(createGameCardMarkup).join("");
}

function createGameCardMarkup(game) {
  const disabledAttribute = game.available ? "" : " disabled";
  const lockedClass = game.available ? "" : " is-locked";

  return `
    <button class="game-option${lockedClass}" type="button" data-game-id="${game.id}" aria-label="${game.title} auswaehlen"${disabledAttribute}>
      <span class="game-option-media">
        <img src="${game.icon}" alt="${game.title}" />
      </span>
      <span class="game-option-title">${game.title}</span>
    </button>
  `;
}

function preloadAssets() {
  GAME_CATALOG.forEach((game) => {
    void preloadImage(game.icon);
  });

  animalsOriginal.forEach((animal) => {
    void preloadImage(animal.image);
  });
}

function preloadImage(src) {
  if (!src) {
    return Promise.resolve();
  }

  if (imagePreloadCache.has(src)) {
    return imagePreloadCache.get(src);
  }

  const image = new Image();
  image.decoding = "async";

  const loadPromise = new Promise((resolve) => {
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => resolve(image), { once: true });
    image.src = src;

    if (image.complete) {
      resolve(image);
    }
  });

  const decodePromise =
    typeof image.decode === "function"
      ? image.decode().catch(() => undefined)
      : Promise.resolve();

  const readyPromise = Promise.allSettled([loadPromise, decodePromise]).then(
    () => image,
  );

  imagePreloadCache.set(src, readyPromise);
  return readyPromise;
}

function warmNearbyAnimalImages(index) {
  const nearbyOffsets = [0, 1, -1, 2, -2];

  nearbyOffsets.forEach((offset) => {
    const animal = animals[index + offset];

    if (animal) {
      void preloadImage(animal.image);
    }
  });
}

function handleGameSelection(event) {
  const selectedCard = event.target.closest(".game-option");

  if (!selectedCard) {
    return;
  }

  openGameMenu(selectedCard.dataset.gameId);
}

function openGameMenu(gameId) {
  const selectedGame = GAME_CATALOG.find((game) => game.id === gameId);

  if (!selectedGame || !selectedGame.available) {
    return;
  }

  currentGameId = selectedGame.id;
  menuTitle.textContent = selectedGame.title;
  menuDescription.textContent = selectedGame.menuDescription;
  totalCardsSpan.textContent = String(animalsOriginal.length);

  gameStarted = false;
  isAnimating = false;
  isFlipped = false;

  clearTimeout(swipeHintTimeoutId);
  selectionScreen.classList.add("hide");
  startupScreen.classList.add("show");
  gameScreen.classList.remove("show");
  completeOverlay.classList.remove("show");

  resetCard();
  hideSwipeHint();
}

function showGameSelection() {
  currentGameId = null;
  gameStarted = false;
  isAnimating = false;
  isFlipped = false;

  clearTimeout(swipeHintTimeoutId);
  selectionScreen.classList.remove("hide");
  startupScreen.classList.remove("show");
  gameScreen.classList.remove("show");
  completeOverlay.classList.remove("show");

  resetCard();
  hideSwipeHint();
}

function startCurrentGame() {
  if (currentGameId !== "wer-bin-ich") {
    return;
  }

  gameStarted = true;
  isAnimating = false;
  currentCardIndex = 0;
  isFlipped = false;
  animals = shuffleArray(animalsOriginal);

  clearTimeout(swipeHintTimeoutId);
  startupScreen.classList.remove("show");
  gameScreen.classList.add("show");
  completeOverlay.classList.remove("show");

  renderCurrentCard();
  warmNearbyAnimalImages(0);
  scheduleSwipeHint();
}

function restartCurrentGame() {
  startCurrentGame();
}

function goHome() {
  gameStarted = false;
  isAnimating = false;
  isFlipped = false;

  clearTimeout(swipeHintTimeoutId);
  startupScreen.classList.add("show");
  gameScreen.classList.remove("show");
  completeOverlay.classList.remove("show");

  resetCard();
  hideSwipeHint();
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
  warmNearbyAnimalImages(currentCardIndex);
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

  warmNearbyAnimalImages(targetIndex);
  isAnimating = true;
  card.classList.add(exitClass);

  window.setTimeout(() => {
    currentCardIndex = targetIndex;
    renderCurrentCard();

    window.requestAnimationFrame(() => {
      card.classList.remove(exitClass);
      card.classList.add(enterClass);

      window.setTimeout(() => {
        card.classList.remove(enterClass);
        isAnimating = false;
      }, CARD_ANIMATION_MS);
    });
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
  currentCardSpan.textContent = "1";
  questionText.textContent = "Wer bin ich?";
  answerText.textContent = "Hund";
  animalImage.src = "images/dog.svg";
  animalImage.alt = "Hund";
  card.classList.remove(
    "flipped",
    "slide-left",
    "slide-right",
    "slide-in-left",
    "slide-in-right",
  );
}

function completeGame() {
  gameStarted = false;
  isAnimating = false;
  clearTimeout(swipeHintTimeoutId);
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

function dismissSwipeHintOnInteraction() {
  if (gameStarted) {
    hideSwipeHint();
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
