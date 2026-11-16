/**
 * How-to-play guides shown from the game picker. Kept apart from the game modules so the
 * home page can show them without loading any game code. Every line here must match the
 * rules as implemented in src/games/<id>/logic.ts.
 */
export interface KeyCard {
  /** Real cards to show, e.g. ['J♠', 'Q♥'] or ['Joker']; drawn with the game's own card faces. */
  cards: string[];
  text: string;
}

export interface Guide {
  tagline: string;
  goal: string;
  glance: { deck: string; time: string };
  setup: string[];
  steps: string[];
  keyCards?: KeyCard[];
  /** How the game is won and scored. */
  winning: string;
  tips: string[];
  /** Rule variants a player can change from the Rules panel, in plain words. */
  options?: string[];
  credit?: string;
}

export const GUIDES: Record<string, Guide> = {
  golf: {
    tagline: 'A quiet round of up one, down one.',
    goal: 'Clear all 35 cards from the seven columns onto the waste pile.',
    glance: { deck: '1 deck', time: '3–5 min' },
    setup: ['Seven columns of five face-up cards.', 'One card starts the waste; the other 16 form the stock.'],
    steps: [
      'Tap the bottom card of any column to move it onto the waste.',
      'It must be one rank higher or lower than the waste card. Suit doesn’t matter.',
      'Keep chaining as long as you can: 5, 6, 7, 6, 5…',
      'Stuck? Tap the stock to turn a new waste card.',
    ],
    keyCards: [
      { cards: ['A♠'], text: 'Low: only a 2 follows it' },
      { cards: ['K♥'], text: 'High: only a Q follows it' },
    ],
    winning:
      'Your score is the number of cards left in the columns — lower is better. Clear every column and you score minus the cards still in the stock.',
    tips: ['Look for the longest chain before you move.', 'Leave columns that hold several cards of the same rank for later.'],
    options: ['K and A connect', 'Nothing may be played on a King'],
  },

  pyramid: {
    tagline: 'Pairs that make thirteen.',
    goal: 'Take apart the pyramid by removing all 28 of its cards.',
    glance: { deck: '1 deck', time: '5 min' },
    setup: ['28 cards form a seven-row pyramid, each row overlapping the one above.', 'The other 24 cards are the stock.'],
    steps: [
      'A card is free when no card overlaps it from below.',
      'Remove two free cards whose values add up to 13.',
      'Kings are worth 13 on their own — tap one to remove it.',
      'Tap the stock to turn cards onto the waste; the top waste card can be part of a pair.',
    ],
    keyCards: [
      { cards: ['A♣'], text: '1' },
      { cards: ['J♦'], text: '11' },
      { cards: ['Q♠'], text: '12' },
      { cards: ['K♥'], text: '13, removed alone' },
    ],
    winning: 'Clear the whole pyramid to win. The game ends when the stock is used up and no pair is left.',
    tips: ['Prefer pairs that uncover two cards at once.', 'Don’t pair the waste card if a pyramid card needs it more.'],
    options: ['Passes through the deck: 1, 3 or unlimited'],
  },

  tripeaks: {
    tagline: 'Three peaks, one long chain.',
    goal: 'Clear all 28 cards from the three peaks.',
    glance: { deck: '1 deck', time: '3–5 min' },
    setup: ['Three overlapping peaks; only the bottom row of ten starts face up.', 'One waste card and a stock of 23.'],
    steps: [
      'Tap any uncovered card that is one higher or lower than the waste card.',
      'King and Ace connect, so chains can wrap around.',
      'Cards turn face up as soon as nothing covers them.',
      'When nothing fits, tap the stock for a new waste card.',
    ],
    winning:
      'Every card in a run scores its place in the streak (1, 2, 3…); taking a peak’s top card adds 15. Drawing from the stock costs 5 and ends the streak.',
    tips: [
      'Count ahead: a long streak is worth far more than a quick card.',
      'Open the peaks evenly so you never run out of choices.',
    ],
  },

  klondike: {
    tagline: 'The patience game everyone knows.',
    goal: 'Build four foundation piles, one per suit, from Ace up to King.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: [
      'Seven columns of 1 to 7 cards; only the top card of each is face up.',
      'Four empty foundations, and the remaining 24 cards as the stock.',
    ],
    steps: [
      'In the columns, build down in alternating colours: a red 9 on a black 10.',
      'Move a single card or a whole ordered run between columns.',
      'Only a King (or a run starting with one) can fill an empty column.',
      'Tap the stock to turn cards onto the waste; tap the empty stock to go through again.',
      'Tap any card to send it to the best place, or drag it where you want.',
    ],
    keyCards: [
      { cards: ['A♠'], text: 'Starts a foundation' },
      { cards: ['K♣'], text: 'The only card for an empty column' },
    ],
    winning:
      'Win by moving all 52 cards to the foundations; the last moves play themselves once everything is face up. Standard scoring rewards moves to the foundations and turning cards up; Vegas pays 5 per card against a 52 stake.',
    tips: ['Turn over face-down cards before anything else.', 'Only empty a column when you have a King ready for it.'],
    options: ['Draw 1 or 3', 'Passes through the deck', 'Standard or Vegas scoring'],
  },

  freecell: {
    tagline: 'Every card in view, every move your own.',
    goal: 'Move all 52 cards to the four foundations, Ace to King by suit.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: ['All cards face up in eight columns (four of 7, four of 6).', 'Four empty free cells and four empty foundations.'],
    steps: [
      'Build columns down in alternating colours.',
      'Each free cell holds any one card while you work.',
      'An empty column takes any card.',
      'You can move a run at once if there’s room to do it card by card: (free cells + 1) × 2 for each empty column.',
      'Cards that can’t be needed any more go to the foundations by themselves.',
    ],
    winning: 'All 52 cards on the foundations. Almost every deal can be solved.',
    tips: ['Keep free cells empty for as long as you can.', 'An empty column is worth more than a free cell.'],
  },

  spider: {
    tagline: 'Eight runs by moonlight.',
    goal: 'Build eight complete runs from King down to Ace, each of one suit.',
    glance: { deck: '2 decks', time: '15–25 min' },
    setup: ['54 cards in ten columns, only the top cards face up.', '50 cards wait in the stock as five deals of ten.'],
    steps: [
      'Build down regardless of suit: any 8 on any 9.',
      'Only runs of a single suit move together.',
      'A finished King-to-Ace run of one suit leaves the table.',
      'Tap the stock to deal one card onto every column — every column must have a card first.',
    ],
    winning: 'Complete all eight runs. Score starts at 500, loses 1 per move, and gains 100 per finished run.',
    tips: ['Build in suit whenever you have the choice.', 'Empty a column before dealing — it is your most flexible space.'],
    options: ['1, 2 or 4 suits'],
  },

  scoundrel: {
    tagline: 'A dungeon crawl played with a deck of cards.',
    goal: 'Make it through all 44 cards of the dungeon alive.',
    glance: { deck: '44 cards', time: '10 min' },
    setup: ['Red face cards and red Aces are removed.', 'You start with 20 health. Four cards form the first room.'],
    steps: [
      'Each room has four cards. Deal with three of them; the fourth stays for the next room.',
      'Or avoid the room: all four go to the bottom of the dungeon. You can’t avoid two rooms in a row.',
      'Taking a weapon equips it and discards your old one.',
      'Fight a monster with your weapon to take only the difference, or barehanded to take it all.',
      'After a kill, a weapon only works on monsters no stronger than the last one it beat.',
      'Potions heal, up to 20 — but only one potion works per room.',
    ],
    keyCards: [
      { cards: ['9♠', 'K♣'], text: 'Monsters: damage equals value (J 11 · Q 12 · K 13 · A 14)' },
      { cards: ['7♦'], text: 'Weapons 2–10' },
      { cards: ['5♥'], text: 'Potions 2–10' },
    ],
    winning:
      'Survive and your score is your remaining health (plus the potion if you finish at full health on one). Die and you score minus the monsters left.',
    tips: [
      'Use a fresh weapon on a big monster first, then work down.',
      'Avoiding a bad room is fine — just not twice in a row.',
    ],
    options: ['Weapon after a kill: lower or equal, or strictly lower'],
    credit: 'Scoundrel was designed by Zach Gage and Kurt Bieg.',
  },

  'video-poker': {
    tagline: 'Hold, draw, and hope for a royal.',
    goal: 'Grow your 100 credits by making paying poker hands.',
    glance: { deck: '1 deck', time: 'Endless' },
    setup: ['Pick a bet of 1 to 5 credits.', 'Each hand is dealt from a freshly shuffled deck.'],
    steps: [
      'Deal five cards.',
      'Tap the cards you want to keep — they’re marked HELD.',
      'Draw once to replace the others.',
      'Winning hands pay by the table, multiplied by your bet.',
    ],
    keyCards: [
      { cards: ['J♠', 'J♥'], text: 'Jacks or better: the smallest paying pair' },
      { cards: ['10♥', 'J♥', 'Q♥', 'K♥', 'A♥'], text: 'Royal flush: 250 per credit, 4000 at bet 5' },
    ],
    winning:
      'Pays per credit: Royal Flush 250 (4000 at max bet) · Straight Flush 50 · Four of a Kind 25 · Full House 9 · Flush 6 · Straight 4 · Three of a Kind 3 · Two Pair 2 · Jacks or Better 1. The game ends when you run out of credits.',
    tips: [
      'Bet 5 so a royal pays its full bonus.',
      'Never throw away a paying hand chasing a bigger one, unless it’s four to a royal.',
    ],
  },

  'high-low': {
    tagline: 'One card at a time, one guess at a time.',
    goal: 'Guess your way through the whole deck without a miss.',
    glance: { deck: '1 deck', time: '2–5 min' },
    setup: ['One card is turned face up from a shuffled deck.'],
    steps: [
      'Guess whether the next card will be higher or lower. Ace is low.',
      'Right, and your streak grows.',
      'Same rank is a free pass — nothing changes.',
      'The odds on each button come from the cards you haven’t seen yet.',
    ],
    winning: 'Your streak is your score. One wrong guess ends the run; reach the end of the deck to win.',
    tips: ['Follow the odds — they shift as the deck thins out.', 'Middle cards (7s) are where streaks end.'],
  },

  blackjack: {
    tagline: 'Twenty-one under the chandelier.',
    goal: 'Beat the dealer by getting closer to 21 without going over.',
    glance: { deck: '6-deck shoe', time: 'Endless' },
    setup: [
      'You start with 1000 chips. Choose a bet and deal.',
      'You and the dealer get two cards; one dealer card stays face down.',
    ],
    steps: [
      'Hit for another card, or Stand to keep your total.',
      'Double: double your bet and take exactly one more card.',
      'Split a pair into two hands with a second bet (up to four hands). Split Aces get one card each.',
      'Surrender your first two cards to get half your bet back.',
      'When the dealer shows an Ace you may take insurance for half your bet; it pays 2:1 if the dealer has blackjack.',
      'The dealer then draws until reaching 17.',
    ],
    keyCards: [
      { cards: ['2♣', '10♦'], text: 'Face value' },
      { cards: ['J♠', 'Q♥', 'K♣'], text: '10' },
      { cards: ['A♦'], text: '1 or 11' },
    ],
    winning:
      'A win pays 1:1; a two-card 21 (blackjack) pays 3:2. Ties push. The game ends when you can no longer cover the smallest bet.',
    tips: ['Stand on 17 or more.', 'Always split Aces and 8s; never split 10s.'],
    options: ['Decks in the shoe', 'Dealer stands or hits on soft 17', 'Blackjack pays 3:2 or 6:5', 'Late surrender on or off'],
  },

  concentration: {
    tagline: 'A memory duel against the CPU.',
    goal: 'Collect more pairs than the CPU.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: ['All 52 cards are laid face down in a grid.'],
    steps: [
      'On your turn, flip two cards.',
      'If they share a rank — any suit — you keep the pair and go again.',
      'If not, they turn back over and it’s the CPU’s turn.',
      'The CPU remembers most cards it has seen, but not all of them.',
    ],
    winning: 'When all 26 pairs are taken, whoever holds more wins. Ties are possible.',
    tips: ['Flip an unknown card first, then match it from memory.', 'Watch the CPU’s misses — they’re free information.'],
    options: ['CPU strength: how much it remembers'],
  },

  'old-maid': {
    tagline: 'Whatever you do, don’t keep the Joker.',
    goal: 'Get rid of all your cards before the others do.',
    glance: { deck: '52 + Joker', time: '5 min' },
    setup: ['53 cards are dealt to four players.', 'Everyone discards their pairs straight away.'],
    steps: [
      'On your turn, take one face-down card from the player to your left.',
      'If it makes a pair, the pair is discarded.',
      'Empty your hand and you’re safe.',
      'The CPUs shuffle their hands, so you can’t track the Joker.',
    ],
    keyCards: [{ cards: ['Joker'], text: 'The Joker never pairs' }],
    winning: 'Go out to win. Whoever is left holding the Joker loses.',
    tips: ['There’s no strategy for the draw — enjoy the drama.'],
  },

  sevens: {
    tagline: 'Build outward from the sevens.',
    goal: 'Be the first to play every card in your hand.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: ['All 52 cards are dealt to four players.', 'Every 7 goes straight onto the table; whoever held the ♦7 starts.'],
    steps: [
      'Play a card next to one already on the table in its suit: a 6 or 8 beside a 7, and so on out to the Ace and King.',
      'Or pass — but you only get three passes.',
      'A fourth pass busts you: your cards go onto the table and you finish last.',
      'Play continues until every place is decided.',
    ],
    winning: 'First out wins. Busted players take the bottom places.',
    tips: ['Hold back the card that opens a suit for others.', 'Save a pass for when you really need it.'],
    options: ['CPU strength'],
  },

  daifugo: {
    tagline: 'Climb from Daihinmin to Daifugo.',
    goal: 'Empty your hand first, round after round.',
    glance: { deck: '52 + Joker', time: '15–20 min' },
    setup: [
      'Four players, the whole deck dealt out.',
      'Round 1 is led by whoever holds the ♦3; later rounds by last round’s Daihinmin.',
    ],
    steps: [
      'Lead any single, set of one rank, or run of three or more in one suit.',
      'Follow with the same kind and number of cards, but stronger — or pass.',
      'Once you pass you sit out the rest of that trick.',
      'When everyone else passes, the trick clears and the last player leads.',
      'From round 2, the bottom two give their best cards to the top two, who give back cards of their choice.',
    ],
    keyCards: [
      { cards: ['3♦'], text: 'Weakest' },
      { cards: ['2♠'], text: 'Strongest rank' },
      { cards: ['Joker'], text: 'Joker: wild, or the strongest single' },
      { cards: ['8♣'], text: '8-cut: ends the trick' },
      { cards: ['J♥'], text: 'J-back: reverses strength for the trick' },
    ],
    winning:
      'Finishing places earn 3, 2, 1 and 0 points: Daifugo, Fugo, Hinmin, Daihinmin. The most points after the last round wins.',
    tips: [
      'Lead with your weak cards and keep 2s and the Joker for the end.',
      'Going out on a Joker, 2 or 8 drops you to last place — plan your final play.',
    ],
    options: [
      'CPU strength',
      'Rounds and Jokers',
      'Card exchange',
      'Stairs and stairs revolution',
      'Revolution, 8-cut, J-back',
      'Suit lock, Spade 3 counter',
      'Forbidden finish, Miyako-ochi',
    ],
  },

  speed: {
    tagline: 'No turns. Just be fast.',
    goal: 'Get rid of all 26 of your cards before the CPU.',
    glance: { deck: '1 deck', time: '2–3 min' },
    setup: [
      'You take the red cards, the CPU the black.',
      'Each of you has four face-up cards and a stock; two piles sit in the middle.',
    ],
    steps: [
      'Play any of your four cards onto a middle pile if it’s one higher or lower. King and Ace connect.',
      'Your empty spot refills from your stock straight away.',
      'Tap a card to play it, or drag it to choose the pile.',
      'The CPU plays at the same time — there are no turns.',
      'When neither of you can play, new middle cards are turned up from your stocks.',
    ],
    winning: 'Empty your cards first to win. If both stocks run dry with no moves, fewer cards left wins.',
    tips: ['Watch both piles at once.', 'Play the card that sets up your next one.'],
    options: ['CPU strength: how quickly it reacts'],
  },
};
