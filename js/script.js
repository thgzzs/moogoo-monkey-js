(() => {
  "use strict";

  //====================================
  // CONFIGURATION & CONSTANTS
  //====================================
  const COLOR_NAMES = ['Orange', 'Blue', 'Yellow', 'Purple', 'Red', 'White'];
  const COLORS = ["#FF9800", "#1976D2", "#FFCC32", "#AB47BC", "#F44336", "#E0E0E0"];
  const PLAYER_FRUITS = ['🥥', '🍉', '🍍'];
  const MAX_BETS = 4;
  const CARDS_PER_PLAYER = 5;
  const ELIMINATION_DELAY = 2500;
  const TEMP_MESSAGE_DELAY = 1000;
  const SWOOP_DURATION = 500;
  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  //====================================
  // GLOBAL GAME STATE
  //====================================
  let playerTypes = [];
  let initialDealDone = false;
  let currentPlayer = 0;
  let round = 1;
  let actionState = 'initialBet';
  let isLocked = false;
  let gameOver = false;
  let initialBetsPlaced = 0; // Tracks the number of initial bets placed
  const scores = Array(PLAYER_FRUITS.length).fill(0);
  const monkeys = COLORS.map((color, i) => ({
    color,
    name: `${COLOR_NAMES[i]} monkey`,
    number: null,
    bets: [],
    eliminated: false
  }));
  const decks = PLAYER_FRUITS.map(() => []);
  let globalDeck = createGlobalDeck();

  //====================================
  // CACHE DOM ELEMENTS
  //====================================
  const turnDisplay = document.getElementById('turnDisplay');
  const monkeyTopContainer = document.getElementById('monkeyTopContainer');
  const cardPileContainer = document.getElementById('cardPileContainer');
  const cardContainer = document.getElementById('cardContainer');
  const scoreContainer = document.getElementById('scoreContainer');
  const mainMenu = document.getElementById('mainMenu');
  const deckDisplay = document.getElementById('deckDisplay');

  //====================================
  // UTILITY FUNCTIONS
  //====================================
  const showTemporaryMessage = (message, delay, callback) => {
    turnDisplay.textContent = message;
    setTimeout(callback, delay);
  };

  const animateNew = (cardEl) => {
    cardEl.classList.add('new-card');
    setTimeout(() => {
      cardEl.classList.remove('new-card');
    }, 500);
  };

  //====================================
  // DECK FUNCTIONS
  //====================================
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function createGlobalDeck() {
    let deck = [];
    COLORS.forEach(color => {
      for (let num = 1; num <= 7; num++) {
        deck.push({ color, number: num, hidden: false });
      }
      // Add mystery card (hidden until played)
      deck.push({ color, number: randomInt(1, 7), hidden: true, isMystery: true });
    });
    return shuffleArray(deck);
  }

  function updateDeckDisplay() {
    deckDisplay.innerHTML = `Cards <span class="deck-number">${globalDeck.length}</span>`;
  }

  function drawInitialCards(n) {
    const hand = [];
    for (let i = 0; i < n; i++) {
      if (globalDeck.length) hand.push(globalDeck.pop());
    }
    updateDeckDisplay();
    return hand;
  }

  //====================================
  // CARD & HAND ANIMATION FUNCTIONS
  //====================================
  function swoopCards(direction, callback) {
    cardContainer.style.transition = `transform ${SWOOP_DURATION}ms ease, opacity ${SWOOP_DURATION}ms ease`;
    if (direction === 'down') {
      cardContainer.style.transform = 'translateY(100px)';
      cardContainer.style.opacity = '0';
    } else {
      cardContainer.style.transform = 'translateY(0)';
      cardContainer.style.opacity = '1';
    }
    setTimeout(() => {
      cardContainer.style.transition = '';
      callback();
    }, SWOOP_DURATION);
  }

  function animateHandReorder(oldPositions) {
    const cards = Array.from(cardContainer.querySelectorAll('.card'));
    if (!cards.length) return;
    cards.forEach(card => {
      const firstRect = oldPositions.get(card);
      const lastRect = card.getBoundingClientRect();
      if (!firstRect) return;
      const deltaX = firstRect.left - lastRect.left;
      card.style.transform = `translateX(${deltaX}px)`;
      card.style.transition = 'none';
    });
    // Force reflow
    cardContainer.offsetHeight;
    cards.forEach(card => {
      card.style.transition = 'transform 500ms ease';
      card.style.transform = 'translateX(0)';
    });
  }

  function animateCardMove(cardEl, targetEl, callback) {
    const { left: cLeft, top: cTop } = cardEl.getBoundingClientRect();
    const { left: tLeft, top: tTop } = targetEl.getBoundingClientRect();
    const deltaX = tLeft - cLeft;
    const deltaY = tTop - cTop;
    cardEl.style.transition = 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)';
    cardEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    cardEl.addEventListener('transitionend', function handler() {
      cardEl.removeEventListener('transitionend', handler);
      // Clear inline styles so CSS hover effects apply later
      setTimeout(() => {
        cardEl.style.transition = '';
        cardEl.style.transform = '';
        callback();
      }, 50);
    });
  }

  function animateBotCard(card, targetEl, callback) {
    const cardClone = document.createElement('div');
    cardClone.className = 'card';
    cardClone.style.backgroundColor = card.color;
    card.hidden = false; // Reveal mystery card
    cardClone.innerHTML = `
      <div class="card-number">${card.number}</div>
      <div class="card-banana">🍌</div>
    `;
    cardClone.style.position = 'fixed';
    cardClone.style.left = '50%';
    cardClone.style.bottom = '0';
    document.body.appendChild(cardClone);
    const { left: tLeft, top: tTop } = targetEl.getBoundingClientRect();
    const { left: cLeft, top: cTop } = cardClone.getBoundingClientRect();
    const deltaX = tLeft - cLeft;
    const deltaY = tTop - cTop;
    cardClone.style.transition = 'transform 0.7s ease-in-out';
    cardClone.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    cardClone.addEventListener('transitionend', function handler() {
      cardClone.removeEventListener('transitionend', handler);
      cardClone.remove();
      callback();
    });
  }

  function dealCardsSequentially() {
    cardContainer.innerHTML = '';
    decks[currentPlayer].forEach((card, idx) => {
      setTimeout(() => {
        const cardEl = createCardEl(card, idx);
        cardContainer.appendChild(cardEl);
        animateNew(cardEl);
      }, idx * 100);
    });
  }

  function showNewHand() {
    // Reset container and prepare cards off-screen for swoop animation
    cardContainer.style.transform = 'translateY(0)';
    cardContainer.style.opacity = '1';
    cardContainer.innerHTML = '';
    decks[currentPlayer].forEach((card, idx) => {
      const cardEl = createCardEl(card, idx);
      cardEl.style.transform = 'translateY(100px)';
      cardEl.style.opacity = '0';
      cardContainer.appendChild(cardEl);
    });
    // Animate cards into view and clear inline transform after transition
    setTimeout(() => {
      cardContainer.querySelectorAll('.card').forEach(cardEl => {
        cardEl.style.transition = `transform ${SWOOP_DURATION}ms ease, opacity ${SWOOP_DURATION}ms ease`;
        cardEl.style.transform = 'translateY(0)';
        cardEl.style.opacity = '1';
        cardEl.addEventListener('transitionend', () => {
          // Remove inline transform so CSS hover effects can take over
          cardEl.style.transition = '';
          cardEl.style.transform = '';
        }, { once: true });
      });
    }, 50);
  }

  function animateShowCards() {
    if (!initialDealDone) {
      dealCardsSequentially();
      initialDealDone = true;
    } else {
      // For human players, animate their new hand; bots just clear the card container
      playerTypes[currentPlayer] !== 'bot' ? showNewHand() : cardContainer.innerHTML = '';
    }
  }

  //====================================
  // DOM UPDATE & CREATION FUNCTIONS
  //====================================
  function updateScore() {
    scoreContainer.innerHTML =
      `<div class="score-title">Score</div>` +
      PLAYER_FRUITS.map((fruit, i) =>
        `<div class="score-item">${fruit} <span class="score-number">${scores[i]}</span></div>`
      ).join('');
  }

  function updateTurnDisplay() {
    if (gameOver) return;
    const actionText = actionState === 'card' ? ' Play a card' : ' Place a bet';
    turnDisplay.textContent = `${PLAYER_FRUITS[currentPlayer]}${actionText}`;
    updateScore();
    cardContainer.style.display = playerTypes[currentPlayer] === 'bot' ? 'none' : 'flex';
    if (!gameOver && playerTypes[currentPlayer] === 'bot') setTimeout(botTakeTurn, 1000);
  }

  function updateMonkeyDisplay(monkey) {
    const updateOne = m => {
      const mDiv = monkeyTopContainer.querySelector(`.monkey[data-color="${m.color}"]`);
      if (!mDiv) return;
      const grid = mDiv.querySelector('.bet-grid');
      grid.innerHTML = Array.from({ length: MAX_BETS }, (_, i) =>
        `<div class="bet-slot">${m.bets[i] || ''}</div>`
      ).join('');
      mDiv.classList.toggle('disabled-hover', m.eliminated);
    };
    monkey ? updateOne(monkey) : monkeys.forEach(updateOne);
  }

  function createMonkeyEl(monkey) {
    const div = document.createElement('div');
    div.className = 'monkey';
    div.dataset.color = monkey.color;
    div.style.backgroundColor = monkey.color;
    div.innerHTML = `
      <div class="monkey-face">🐵</div>
      <div class="bet-grid">${Array(MAX_BETS).fill('<div class="bet-slot"></div>').join('')}</div>
    `;
    div.addEventListener('click', () => {
      if (playerTypes[currentPlayer] !== 'bot') handleMonkeyClick(monkey);
    });
    return div;
  }

  function createMonkeys() {
    monkeyTopContainer.innerHTML = '';
    monkeys.forEach(monkey => monkeyTopContainer.appendChild(createMonkeyEl(monkey)));
  }

  function createCardPiles() {
    cardPileContainer.innerHTML = '';
    monkeys.forEach(monkey => {
      const pile = document.createElement('div');
      pile.className = 'card-pile';
      pile.dataset.color = monkey.color;
      cardPileContainer.appendChild(pile);
    });
  }

  function createCardEl(card, index) {
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.index = index;
    div.style.backgroundColor = card.color;
    div.innerHTML = `
      <div class="card-number">${card.hidden ? '❓' : card.number}</div>
      <div class="card-banana">🍌</div>
    `;
    div.addEventListener('click', () => {
      if (playerTypes[currentPlayer] !== 'bot') handleCardClick(card, div);
    });
    return div;
  }

  function dealCards() {
    animateShowCards();
  }

  //====================================
  // GAME ACTION HANDLERS
  //====================================
  function handleMonkeyClick(monkey) {
    if (isLocked || gameOver) return;
    if ((actionState === 'initialBet' || actionState === 'bet') && !monkey.eliminated && monkey.bets.length < MAX_BETS) {
      placeBet(monkey);
    }
  }

  function placeBet(monkey) {
    if (isLocked) return;
    isLocked = true;
    const currentFruit = PLAYER_FRUITS[currentPlayer];
    monkey.bets.push(currentFruit);
    updateMonkeyDisplay(monkey);
    scores[currentPlayer]++;
    updateScore();

    if (actionState === 'initialBet') {
      // Increment counter for initial bets
      initialBetsPlaced++;
      // Only after every player places an initial bet do we deal cards
      if (initialBetsPlaced === PLAYER_FRUITS.length) {
        // Advance turn to the next player after the last initial bet
        currentPlayer = (currentPlayer + 1) % PLAYER_FRUITS.length;
        actionState = 'bet';
        PLAYER_FRUITS.forEach((_, i) => decks[i] = drawInitialCards(CARDS_PER_PLAYER));
        showTemporaryMessage(`${currentFruit} Bets on ${monkey.name}`, TEMP_MESSAGE_DELAY, () => {
          isLocked = false;
          updateTurnDisplay();
          setTimeout(dealCards, 100);
        });
        return;
      } else {
        // Advance to the next player without dealing cards yet
        currentPlayer = (currentPlayer + 1) % PLAYER_FRUITS.length;
      }
    } else if (actionState === 'bet') {
      actionState = 'card';
    }

    showTemporaryMessage(`${currentFruit} Bets on ${monkey.name}`, TEMP_MESSAGE_DELAY, () => {
      isLocked = false;
      updateTurnDisplay();
    });
  }

  function handleCardClick(card, cardEl) {
    if (gameOver || isLocked) return;
    if (actionState === 'card') handleCardPlay(card, cardEl);
  }

  function handleCardPlay(card, cardEl) {
    if (gameOver || isLocked) return;
    isLocked = true;
    const target = monkeys.find(m => m.color === card.color && !m.eliminated);
    const currentFruit = PLAYER_FRUITS[currentPlayer];
    if (!target) {
      replaceCard(cardEl, decks[currentPlayer]);
      isLocked = false;
      updateTurnDisplay();
      return;
    }
    if (card.hidden) card.hidden = false;
    target.number = card.number;
    updateMonkeyDisplay(target);
    const pileEl = document.querySelector(`#cardPileContainer .card-pile[data-color="${target.color}"]`);
    if (pileEl) {
      animateCardMove(cardEl, pileEl, () => {
        const existing = pileEl.firstElementChild;
        if (existing) {
          existing.style.transition = 'none';
          existing.style.backgroundColor = card.color;
          existing.querySelector('.card-number').textContent = card.number;
        } else {
          const cloned = cardEl.cloneNode(true);
          cloned.querySelector('.card-number').textContent = card.number;
          cloned.style.pointerEvents = 'none';
          pileEl.appendChild(cloned);
        }
        replaceCard(cardEl, decks[currentPlayer]);
        showTemporaryMessage(`${currentFruit} Played ${card.number} on ${target.name}`, TEMP_MESSAGE_DELAY, () => {
          isLocked = false;
          endTurn();
        });
      });
    }
  }

  function replaceCard(cardEl, deck, index = cardEl ? cardEl.dataset.index : null) {
    // Record positions of existing cards (except the one being replaced)
    const oldPositions = new Map();
    const cardsBefore = Array.from(cardContainer.querySelectorAll('.card'));
    cardsBefore.forEach(card => {
      if (card !== cardEl) {
        oldPositions.set(card, card.getBoundingClientRect());
      }
    });
    let newCard;
    if (globalDeck.length) {
      const activeColors = monkeys.filter(m => !m.eliminated).map(m => m.color);
      const validIndex = globalDeck.findIndex(c => activeColors.includes(c.color));
      if (validIndex !== -1) {
        newCard = globalDeck.splice(validIndex, 1)[0];
        deck[index] = newCard;
        if (cardEl) {
          const newEl = createCardEl(newCard, index);
          cardEl.replaceWith(newEl);
          animateNew(newEl);
        }
        updateDeckDisplay();
        return;
      }
    }
    // If no replacement card is available, remove the card from deck
    deck.splice(index, 1);
    if (cardEl) cardEl.remove();
    animateHandReorder(oldPositions);
  }

  //====================================
  // TURN & ROUND MANAGEMENT
  //====================================
  function endTurn() {
    if (gameOver) return;
    swoopCards('down', () => {
      currentPlayer = (currentPlayer + 1) % PLAYER_FRUITS.length;
      let attempts = 0;
      while (decks[currentPlayer].length === 0 && decks.some(deck => deck.length > 0) && attempts < PLAYER_FRUITS.length) {
        currentPlayer = (currentPlayer + 1) % PLAYER_FRUITS.length;
        attempts++;
      }
      actionState = checkMonkeysBets() ? 'card' : 'bet';
      updateTurnDisplay();
      if (playerTypes[currentPlayer] !== 'bot') {
        showNewHand();
      } else {
        cardContainer.innerHTML = '';
      }
      const activeColors = monkeys.filter(m => !m.eliminated).map(m => m.color);
      const availableCards = globalDeck.filter(card => activeColors.includes(card.color));
      const allHandsEmpty = decks.every(deck => deck.length === 0);
      if (availableCards.length === 0 && allHandsEmpty) {
        endGameTie();
        return;
      }
      const activeMonkeys = monkeys.filter(m => !m.eliminated);
      if (activeMonkeys.length === playerTypes.length) {
        endGame();
        return;
      }
      if (activeMonkeys.every(m => m.number !== null) && !isLocked) {
        eliminateMonkey();
        return;
      }
    });
  }

  function checkMonkeysBets() {
    return monkeys.filter(m => !m.eliminated).every(m => m.bets.length >= MAX_BETS);
  }

  function eliminateMonkey() {
    if (isLocked) return;
    isLocked = true;
    cardContainer.style.display = 'none';
    const survivors = monkeys.filter(m => !m.eliminated);
    const scoresList = survivors.map(m => ({ m, total: m.number || 0 }));
    const min = Math.min(...scoresList.map(s => s.total));
    const lowest = scoresList.filter(s => s.total === min);
    if (lowest.length > 1) {
      console.log("Tie detected, no elimination.");
      showTemporaryMessage("Tie detected, no elimination.", TEMP_MESSAGE_DELAY, () => {
        cardContainer.style.display = 'flex';
        nextRound();
        isLocked = false;
      });
      return;
    }
    const eliminated = lowest[0].m;
    turnDisplay.textContent = `${eliminated.name} is eliminated!`;
    setTimeout(() => {
      if (gameOver) { isLocked = false; return; }
      processElimination(eliminated);
      const activeMonkeys = monkeys.filter(m => !m.eliminated);
      if (activeMonkeys.length === playerTypes.length) {
        const mDiv = monkeyTopContainer.querySelector(`.monkey[data-color="${eliminated.color}"]`);
        if (mDiv) {
          void mDiv.offsetWidth;
          mDiv.classList.add('eliminated-monkey');
        }
        setTimeout(() => {
          endGame();
          isLocked = false;
        }, 500);
        return;
      }
      turnDisplay.textContent = `${eliminated.name} is eliminated! Round ${round + 1} begins!`;
      const mDiv = monkeyTopContainer.querySelector(`.monkey[data-color="${eliminated.color}"]`);
      if (mDiv) mDiv.classList.add('eliminated-monkey');
      cardPileContainer.querySelectorAll('.card-pile').forEach(pile => {
        pile.querySelectorAll('.card').forEach(card => {
          card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
          card.style.transform = 'translateY(100px)';
          card.style.opacity = '0';
        });
        setTimeout(() => { pile.innerHTML = ''; }, 500);
      });
      nextRound();
      isLocked = false;
    }, ELIMINATION_DELAY);
  }

  function clearClonedCards() {
    cardPileContainer.querySelectorAll('.card-pile').forEach(pile => {
      pile.querySelectorAll('.card').forEach(card => {
        card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        card.style.transform = 'translateY(100px)';
        card.style.opacity = '0';
      });
      setTimeout(() => { pile.innerHTML = ''; }, 500);
    });
  }

  function processElimination(eliminated) {
    eliminated.bets.forEach(bet => {
      const idx = PLAYER_FRUITS.indexOf(bet);
      if (idx !== -1) scores[idx]--;
    });
    eliminated.bets = [];
    monkeys.forEach(m => m.number = null);
    eliminated.eliminated = true;
    globalDeck = globalDeck.filter(card => card.color !== eliminated.color);
    decks.forEach(deck => {
      const activeColors = monkeys.filter(m => !m.eliminated).map(m => m.color);
      for (let i = 0; i < deck.length; i++) {
        if (deck[i].color === eliminated.color) {
          const replacementIndex = globalDeck.findIndex(c => activeColors.includes(c.color));
          if (replacementIndex !== -1) {
            const newCard = globalDeck.splice(replacementIndex, 1)[0];
            deck[i] = newCard;
            updateDeckDisplay();
          } else {
            deck.splice(i, 1);
            i--;
          }
        }
      }
    });
    updateMonkeyDisplay();
    clearClonedCards();
  }

  function nextRound() {
    round++;
    console.log(`Round ${round} begins!`);
    updateTurnDisplay();
    cardContainer.style.display = 'flex';
    if (playerTypes[currentPlayer] !== 'bot') {
      showNewHand();
    }
  }

  function endGame() {
    updateScore();
    gameOver = true;
    toggleInteractions(false);
    turnDisplay.textContent = `Game Over! ${calculateWinner()}`;
    cardContainer.style.display = 'none';
    createRestartButton();
  }

  function endGameTie() {
    updateScore();
    gameOver = true;
    toggleInteractions(false);
    turnDisplay.textContent = `Stale Bananas! Game ends in a tie!`;
    cardContainer.style.display = 'none';
    createRestartButton();
  }

  function calculateWinner() {
    const survivors = monkeys.filter(m => !m.eliminated);
    const finalScores = PLAYER_FRUITS.map((_, i) =>
      survivors.reduce((acc, m) => acc + m.bets.filter(b => b === PLAYER_FRUITS[i]).length, 0)
    );
    const max = Math.max(...finalScores);
    const winners = finalScores.map((score, i) => ({ fruit: PLAYER_FRUITS[i], score }))
      .filter(p => p.score === max);
    return winners.length > 1
      ? `It's a Tie between ${winners.map(w => w.fruit).join(' ')} with ${max} points!`
      : `The winner is ${winners[0].fruit} with ${winners[0].score} points! 🎉`;
  }

  //====================================
  // BOT TURN LOGIC
  //====================================
  function botTakeTurn() {
    if (gameOver || isLocked || playerTypes[currentPlayer] !== 'bot') return;
    const activeColors = monkeys.filter(m => !m.eliminated).map(m => m.color);
    const availableCards = globalDeck.filter(card => activeColors.includes(card.color));
    const allHandsEmpty = decks.every(deck => deck.length === 0);
    if (availableCards.length === 0 && allHandsEmpty) {
      endGameTie();
      return;
    }
    if (actionState === 'initialBet' || actionState === 'bet') {
      const available = monkeys.filter(m => !m.eliminated && m.bets.length < MAX_BETS);
      if (available.length) {
        const chosen = available[randomInt(0, available.length - 1)];
        setTimeout(() => {
          if (!isLocked && !gameOver && playerTypes[currentPlayer] === 'bot') {
            placeBet(chosen);
          }
        }, 500);
      }
    } else if (actionState === 'card') {
      const deck = decks[currentPlayer];
      if (!deck.length) {
        endTurn();
        return;
      }
      const randomIndex = randomInt(0, deck.length - 1);
      const card = deck[randomIndex];
      const currentFruit = PLAYER_FRUITS[currentPlayer];
      if (card.isMystery && card.hidden) card.hidden = false;
      const target = monkeys.find(m => m.color === card.color && !m.eliminated);
      if (target) {
        const pileEl = document.querySelector(`#cardPileContainer .card-pile[data-color="${target.color}"]`);
        setTimeout(() => {
          if (!isLocked && !gameOver && playerTypes[currentPlayer] === 'bot') {
            animateBotCard(card, pileEl, () => {
              const existing = pileEl.firstElementChild;
              if (existing) {
                existing.style.transition = 'none';
                existing.style.backgroundColor = card.color;
                existing.querySelector('.card-number').textContent = card.number;
              } else {
                const cloned = document.createElement('div');
                cloned.className = 'card';
                cloned.style.backgroundColor = card.color;
                cloned.innerHTML = `
                  <div class="card-number">${card.number}</div>
                  <div class="card-banana">🍌</div>
                `;
                cloned.style.pointerEvents = 'none';
                pileEl.appendChild(cloned);
              }
              target.number = card.number;
              updateMonkeyDisplay(target);
              replaceCard(null, decks[currentPlayer], randomIndex);
              showTemporaryMessage(`${currentFruit} Played ${card.number} on ${target.name}`, TEMP_MESSAGE_DELAY, () => {
                isLocked = false;
                endTurn();
              });
            });
          }
        }, 500);
      } else {
        endTurn();
      }
    }
  }

  //====================================
  // INTERACTION & RESTART CONTROLS
  //====================================
  function toggleInteractions(enabled) {
    const pointer = enabled ? 'auto' : 'none';
    monkeyTopContainer.querySelectorAll('.monkey').forEach(el => el.style.pointerEvents = pointer);
    cardContainer.querySelectorAll('.card').forEach(el => el.style.pointerEvents = pointer);
  }

  function createRestartButton() {
    if (document.getElementById('restartButton')) return;
    const btn = document.createElement('button');
    btn.id = 'restartButton';
    btn.innerText = 'Back to Menu';
    btn.addEventListener('click', returnToMenu);
    document.body.appendChild(btn);
  }

  function returnToMenu() {
    initialDealDone = false;
    initialBetsPlaced = 0; // Reset the initial bet counter
    monkeys.forEach(m => { m.number = null; m.bets = []; m.eliminated = false; });
    scores.fill(0);
    currentPlayer = 0;
    round = 1;
    actionState = 'initialBet';
    gameOver = false;
    globalDeck = createGlobalDeck();
    for (let i = 0; i < PLAYER_FRUITS.length; i++) decks[i] = [];
    monkeyTopContainer.innerHTML = '';
    cardContainer.innerHTML = '';
    cardPileContainer.innerHTML = '';
    turnDisplay.textContent = '';
    updateScore();
    mainMenu.style.display = 'flex';
    const btn = document.getElementById('restartButton');
    if (btn) btn.remove();
    console.log("Returned to main menu!");
  }

  //====================================
  // INITIALIZATION
  //====================================
  function initGame() {
    createMonkeys();
    createCardPiles();
    updateTurnDisplay();
  }

  // Exposed startGame function
  window.startGame = (mode) => {
    // Set player types based on mode
    if (mode === 'single') playerTypes = ['human', 'bot', 'bot'];
    else if (mode === 'two') playerTypes = ['human', 'human', 'bot'];
    else if (mode === 'three') playerTypes = ['human', 'human', 'human'];

    // Choose a random starting player
    currentPlayer = randomInt(0, PLAYER_FRUITS.length - 1);

    mainMenu.style.display = 'none';
    updateDeckDisplay();
    initGame();
  };
})();
