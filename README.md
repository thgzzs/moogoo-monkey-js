 # Moogoo Monkey JS
 
 https://thgzzs.github.io/moogoo-monkey-js/
 
 This project is a browser-based card game. The original implementation placed all markup, style, and JavaScript in a single file. The repository now organizes the code into separate HTML, CSS, and JS files for easier maintenance.
 
 ## Files
 - `index.html` – entry point for the game
 - `css/style.css` – styling
 - `js/script.js` – game logic
 
 Open `index.html` in a browser to play.
+
+## How to Play
+
+Moogoo Monkey is a betting and card‑placement game for three players. One
+round of play represents the survival of the monkeys on the board. The player
+with the most surviving bets after three rounds wins.
+
+### Setup
+
+1. **Monkeys** – Six monkeys (Orange, Blue, Yellow, Purple, Red and White) are
+   displayed in the middle of the board. Each monkey has four bet slots and a
+   pile where cards are played.
+2. **Betting Tokens** – Every player starts with betting tokens represented by a
+   fruit:
+   - Player&nbsp;1: 🥥 (coconuts)
+   - Player&nbsp;2: 🍉 (watermelons)
+   - Player&nbsp;3: 🍍 (pineapples)
+3. **Cards** – The deck contains up to 48 cards:
+   - 42 Banana cards numbered 1–7 in the six monkey colours.
+   - 6 Mystery Banana cards (❓) that reveal their number only after being
+     played.
+   At the start of each round, every player receives five cards.
+
+### Turn Overview
+
+Each turn consists of three actions:
+
+1. **Place a bet** on any active monkey with fewer than four bets.
+2. **Play a card** from your hand under the matching monkey colour. A new card
+   replaces the previous one if the slot already has a card.
+3. **Draw** a new card if any remain in the deck; otherwise play continues with
+   the cards left in your hand.
+
+Betting ends once all monkeys have four bets. After that, players only play
+cards.
+
+### Elimination
+
+When every active monkey has at least one card, the monkey with the lowest total
+is eliminated. All bets on that monkey are removed and the card piles reset.
+Ties result in no elimination until a lower total appears.
+
+### Game End
+
+The game continues for three elimination rounds. Whoever has the most betting tokens on the
+remaining monkeys wins. If all cards are exhausted before a third monkey is
+eliminated, the game ends in a draw called **Stale Bananas**.
+
+### Strategy Tips
+
+- Spread your bets early to keep options open, then focus on the monkeys most
+  likely to survive.
+- Play high cards on your chosen monkeys and low cards on those of your
+  opponents.
+- Watch other players' bets to anticipate eliminations and adjust your own
+  strategy.
+- Use Mystery Banana cards to surprise opponents when revealing their numbers.
+
+### Starting the Game
+
+Open `index.html` in a modern browser and choose a mode from the menu. You can
+play solo against bots or with up to three human players on the same device.
