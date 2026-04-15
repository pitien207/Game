const GAME_CATALOG = [
  {
    id: "wer-bin-ich",
    title: "Wer bin ich?",
    icon: "images/favicon.png",
    available: true,
    menuEmoji: "&#128062;",
    menuDescription:
      "Ich gebe dir Hinweise - kannst du erraten, welches Tier ich bin?",
    cards: animalsOriginal,
    variant: "riddle",
  },
  {
    id: "fussballteams",
    title: "Der Mannschaft",
    icon: "images/favicon_mannschaft.png",
    available: true,
    menuEmoji: "&#9917;",
    menuDescription:
      "Sieh dir das Vereinslogo an und errate den Namen des Fussballteams.",
    cards: teamsOriginal,
    variant: "logo",
  },
];

let currentCards = [];
let currentCardIndex = 0;
let currentGame = GAME_CATALOG[0];
let isFlipped = false;
let gameStarted = false;
let isAnimating = false;
let touchStartX = 0;
let touchEndX = 0;
let swipeHintTimeoutId = null;
const imagePreloadCache = new Map();

const CARD_ANIMATION_MS = 320;
const SWIPE_THRESHOLD = 50;
const LOGO_GAME_PROMPT = "Welcher Verein ist das?";

const selectionScreen = document.getElementById("selectionScreen");
const gamesGrid = document.getElementById("gamesGrid");
const startupScreen = document.getElementById("startupScreen");
const menuEmoji = document.getElementById("menuEmoji");
const menuTitle = document.getElementById("menuTitle");
const menuDescription = document.getElementById("menuDescription");
const startBtn = document.getElementById("startBtn");
const selectionBtn = document.getElementById("selectionBtn");
const gameScreen = document.getElementById("gameScreen");
const homeBtn = document.getElementById("homeBtn");
const card = document.getElementById("card");
const hintIcon = document.getElementById("hintIcon");
const frontImage = document.getElementById("frontImage");
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
  totalCardsSpan.textContent = String(currentGame.cards.length);
  if (swipeHint) {
    swipeHint.style.transition = "opacity 0.3s ease";
  }
  renderGameSelection();
  setupEventListeners();
  preloadAssets();
  resetCard();
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
    game.cards.forEach((cardData) => {
      void preloadImage(cardData.image);
    });
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

function warmNearbyCardImages(index) {
  const nearbyOffsets = [0, 1, -1, 2, -2];

  nearbyOffsets.forEach((offset) => {
    const cardData = currentCards[index + offset];

    if (cardData) {
      void preloadImage(cardData.image);
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

  currentGame = selectedGame;
  menuEmoji.innerHTML = selectedGame.menuEmoji;
  menuTitle.textContent = selectedGame.title;
  menuDescription.textContent = selectedGame.menuDescription;
  totalCardsSpan.textContent = String(selectedGame.cards.length);

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
  gameStarted = false;
  isAnimating = false;
  isFlipped = false;

  clearTimeout(swipeHintTimeoutId);
  selectionScreen.classList.remove("hide");
  startupScreen.classList.remove("show");
  gameScreen.classList.remove("show");
  completeOverlay.classList.remove("show");

  hideSwipeHint();
}

function startCurrentGame() {
  if (!currentGame || !currentGame.available) {
    return;
  }

  gameStarted = true;
  isAnimating = false;
  currentCardIndex = 0;
  isFlipped = false;
  currentCards = shuffleArray(currentGame.cards);

  clearTimeout(swipeHintTimeoutId);
  startupScreen.classList.remove("show");
  gameScreen.classList.add("show");
  completeOverlay.classList.remove("show");
  totalCardsSpan.textContent = String(currentGame.cards.length);

  renderCurrentCard();
  warmNearbyCardImages(0);
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
  const currentCard = currentCards[currentCardIndex];

  if (!currentCard) {
    return;
  }

  const isLogoGame = currentGame.variant === "logo";

  card.classList.toggle("card-logo-game", isLogoGame);
  hintIcon.classList.toggle("is-hidden", isLogoGame);
  frontImage.classList.toggle("is-hidden", !isLogoGame);
  animalImage.classList.toggle("is-hidden", isLogoGame);

  if (isLogoGame) {
    frontImage.src = currentCard.image;
    frontImage.alt = `Vereinslogo von ${currentCard.name}`;
    questionText.textContent = LOGO_GAME_PROMPT;
  } else {
    questionText.textContent = currentCard.question;
    animalImage.src = currentCard.image;
    animalImage.alt = `Bild von ${currentCard.name}`;
  }

  answerText.textContent = currentCard.name;

  currentCardSpan.textContent = String(currentCardIndex + 1);
  card.classList.remove("flipped");
  isFlipped = false;

  updateButtonStates();
  warmNearbyCardImages(currentCardIndex);
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

  if (targetIndex >= currentCards.length) {
    completeGame();
    return;
  }

  hideSwipeHint();
  animateCardTransition(direction, targetIndex);
}

function animateCardTransition(direction, targetIndex) {
  const exitClass = direction > 0 ? "slide-left" : "slide-right";
  const enterClass = direction > 0 ? "slide-in-left" : "slide-in-right";

  warmNearbyCardImages(targetIndex);
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
  nextBtn.disabled = currentCards.length === 0;
  nextBtn.textContent =
    currentCardIndex === currentCards.length - 1 ? "Fertig" : "Weiter ->";
}

function resetCard() {
  currentCardIndex = 0;
  currentCardSpan.textContent = "1";
  card.classList.remove(
    "flipped",
    "slide-left",
    "slide-right",
    "slide-in-left",
    "slide-in-right",
    "card-logo-game",
  );

  if (currentGame.variant === "logo") {
    card.classList.add("card-logo-game");
    hintIcon.classList.add("is-hidden");
    frontImage.classList.remove("is-hidden");
    frontImage.src = currentGame.icon;
    frontImage.alt = currentGame.title;
    animalImage.classList.add("is-hidden");
    questionText.textContent = LOGO_GAME_PROMPT;
    answerText.textContent = currentGame.title;
    return;
  }

  hintIcon.classList.remove("is-hidden");
  frontImage.classList.add("is-hidden");
  animalImage.classList.remove("is-hidden");
  questionText.textContent = "Wer bin ich?";
  answerText.textContent = "Hund";
  animalImage.src = "images/dog.svg";
  animalImage.alt = "Hund";
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
  if (!swipeHint) {
    return;
  }

  swipeHint.style.opacity = "1";
}

function hideSwipeHint() {
  if (!swipeHint) {
    return;
  }

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
