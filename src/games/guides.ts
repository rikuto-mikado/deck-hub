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
    options: ['Double FreeCell: 2 decks, 10 cascades, 8 free cells and 8 foundations'],
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

  // ───────────── Expansion: solitaire ─────────────

  yukon: {
    tagline: 'Klondike with everything on the table.',
    goal: 'Build all four foundations from Ace to King by suit.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: [
      'Seven columns: one card in the first, then 6 to 11 cards with the top five face up.',
      'No stock and no waste — all 52 cards are dealt.',
    ],
    steps: [
      'Move any face-up card onto a card one rank higher of the other colour.',
      'Everything on top of the card you move goes with it, in order or not.',
      'Only a King (with its load) can fill an empty column.',
      'Face-down cards turn up when they are uncovered.',
      'Play cards to the foundations up by suit.',
    ],
    keyCards: [
      { cards: ['K♠'], text: 'Only a King fills an empty column' },
      { cards: ['A♥'], text: 'Starts a foundation' },
    ],
    winning: 'All 52 cards on the foundations. Once nothing is hidden, the rest plays itself home.',
    tips: ['Dig out the deepest column first.', 'Moving a buried card is often the key: it can carry a whole jumble with it.'],
  },

  'aces-up': {
    tagline: 'Leave only the Aces standing.',
    goal: 'Discard every card except the four Aces.',
    glance: { deck: '1 deck', time: '2–3 min' },
    setup: ['Four piles of one face-up card each.', 'The other 48 cards are the stock.'],
    steps: [
      'Tap a top card to discard it when another pile shows a higher card of the same suit. Aces are high.',
      'Tap or drag a top card into an empty pile.',
      'Tap the stock to deal one new card onto each pile.',
    ],
    keyCards: [{ cards: ['A♣'], text: 'Highest: never discarded' }],
    winning: 'Win when the stock is empty and only the four Aces remain.',
    tips: ['Save empty spaces for burying piles that hide an Ace.', 'Discard before you deal — dealing covers useful cards.'],
  },

  'forty-thieves': {
    tagline: 'Two decks, no mercy.',
    goal: 'Build eight foundations, Ace to King by suit, from two decks.',
    glance: { deck: '2 decks', time: '15–20 min' },
    setup: [
      'Ten columns of four face-up cards.',
      'Eight empty foundations and a 64-card stock turned one at a time, with no redeal.',
    ],
    steps: [
      'Build columns down in the same suit, one card at a time.',
      'Any card may fill an empty column.',
      'Turn the stock one card at a time; the top waste card can be played.',
      'Play cards up by suit on the foundations.',
    ],
    winning: 'All 104 cards on the foundations. Very few deals come out — every move counts.',
    tips: [
      'Empty a column early: it is the most valuable space in the game.',
      'Do not turn the stock while a useful move remains.',
    ],
    options: ['Josephine: move whole same-suit runs at once'],
  },

  'clock-solitaire': {
    tagline: 'Every card finds its hour.',
    goal: 'Turn all 48 non-King cards before the fourth King appears.',
    glance: { deck: '1 deck', time: '2 min' },
    setup: ['Thirteen face-down piles of four: A at one o’clock round to Q at twelve, Kings in the centre.'],
    steps: [
      'Tap the glowing pile to turn its top card.',
      'The card slides face up under the pile of its hour (Kings go to the centre).',
      'That pile glows next: turn its top card, and so on.',
    ],
    keyCards: [
      { cards: ['K♦'], text: 'Goes to the centre — four of them end the game' },
      { cards: ['Q♠'], text: 'Twelve o’clock' },
    ],
    winning: 'You win if the last card turned is the fourth King. It is pure luck — about one deal in thirteen.',
    tips: ['Nothing to decide: enjoy the ride.'],
  },

  'poker-squares': {
    tagline: 'Twelve poker hands from twenty-five cards.',
    goal: 'Score as many points as you can from 12 lines of five cards.',
    glance: { deck: '1 deck (25 cards)', time: '5 min' },
    setup: ['An empty 5×5 grid.', 'Cards come one at a time from a shuffled deck.'],
    steps: [
      'Place each card on any empty square. Once placed it never moves.',
      'Every row, column and both diagonals score as a poker hand.',
      'Line scores appear along the edges as lines fill.',
    ],
    winning:
      'American scoring: Royal 100, Straight Flush 75, Four 50, Full House 25, Flush 20, Straight 15, Three 10, Two Pair 5, Pair 2. Reach 70 (or 30 in British scoring) to win.',
    tips: ['Commit some columns to flushes and some rows to pairs.', 'Keep one “dump” line for cards that fit nowhere.'],
    options: ['American or British scoring'],
  },

  canfield: {
    tagline: 'The casino’s favourite solitaire.',
    goal: 'Build four foundations by suit from a random base rank.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: [
      'A 13-card reserve with the top card face up.',
      'One card starts the first foundation and sets the base rank for all four.',
      'Four columns of one card; the rest is the stock.',
    ],
    steps: [
      'Foundations build up by suit from the base rank, wrapping K → A.',
      'Columns build down in alternating colours, wrapping A → K.',
      'Move a column’s top card, or the whole column at once.',
      'An emptied column refills from the reserve at once.',
      'Turn the stock three at a time (or one), as often as you like.',
    ],
    winning: 'All 52 cards home. Only about one deal in three comes out.',
    tips: [
      'Empty the reserve: it is the only thing that refills columns.',
      'Count where the base rank cards are before committing.',
    ],
    options: ['Draw 3 or Draw 1'],
  },

  'monte-carlo': {
    tagline: 'Pairs that touch.',
    goal: 'Remove all 52 cards in pairs.',
    glance: { deck: '1 deck', time: '3 min' },
    setup: ['25 cards in a 5×5 grid; 27 in the stock.'],
    steps: [
      'Tap two cards of the same rank that touch — beside, above or diagonally.',
      'Press Consolidate & deal: cards slide left and up to close the gaps, and the stock refills the grid.',
    ],
    winning: 'Clear all 26 pairs to win. You lose when no pair touches and the grid cannot change.',
    tips: ['Look for pairs whose removal brings other pairs together after the slide.'],
  },

  calculation: {
    tagline: 'Arithmetic, patience and a little cunning.',
    goal: 'Build four foundations to King by +1, +2, +3 and +4.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: ['An A, 2, 3 and 4 start the four foundations.', 'Four empty waste piles and a 48-card stock.'],
    steps: [
      'Suits do not matter.',
      'Foundation 1 builds A, 2, 3 … K; foundation 2 builds 2, 4, 6 … Q, A, 3 … J, K; foundation 3 by threes; foundation 4 by fours — all wrapping past King and ending on a King.',
      'Turn one stock card at a time and place it on a foundation or any waste pile.',
      'The top card of a waste pile can go to a foundation; nothing moves between wastes.',
    ],
    keyCards: [{ cards: ['K♣'], text: 'Every foundation ends on a King — park Kings together' }],
    winning: 'All 52 cards on the foundations.',
    tips: ['Keep one waste pile for Kings.', 'Stack waste piles in descending order of when you will need them.'],
  },

  accordion: {
    tagline: 'Squeeze 52 cards into one.',
    goal: 'Compress the whole line of cards into a single pile.',
    glance: { deck: '1 deck', time: '5 min' },
    setup: ['All 52 cards in a line, read left to right, row by row.'],
    steps: [
      'A pile may move onto the pile just left of it, or three places to its left.',
      'The two top cards must share a suit or a rank.',
      'The whole pile moves; only the top card matters afterwards.',
    ],
    winning: 'One pile left is a win — very rare. Fewer piles is better.',
    tips: ['Prefer moves that open new matches down the line.', 'A three-step move often sets up two one-step moves.'],
  },

  'crazy-quilt': {
    tagline: 'A woven rug of 64 cards.',
    goal: 'Move all 104 cards to eight foundations.',
    glance: { deck: '2 decks', time: '15 min' },
    setup: [
      'One Ace and one King of each suit start eight foundations.',
      '64 cards form an 8×8 quilt, alternately upright and sideways.',
      '32 cards in the stock.',
    ],
    steps: [
      'A quilt card is free when one of its short ends is open: above or below for upright cards, left or right for sideways ones.',
      'Ace foundations build up by suit; King foundations build down by suit.',
      'Turn the stock one card at a time; one redeal.',
      'Free quilt cards may also be built on the waste, one up or down in the same suit.',
    ],
    winning: 'Every card on the foundations.',
    tips: ['Free cards that open the most others.', 'Use the waste as a holding pile for runs of a suit.'],
  },

  'beleaguered-castle': {
    tagline: 'Eight wings around the keep.',
    goal: 'Build the four foundations from the Aces up to the Kings.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: ['The four Aces sit in the middle as foundations.', 'The other 48 cards are face up in eight wings of six.'],
    steps: [
      'Only the outermost card of a wing can move.',
      'Move it onto a wing ending one rank higher — suit doesn’t matter — or to its foundation.',
      'An empty wing takes any card.',
    ],
    winning: 'All 52 cards home. Cards that nothing can need play home by themselves.',
    tips: ['An empty wing is worth more than almost any build.', 'Plan long sequences before moving.'],
  },

  elevens: {
    tagline: 'Make eleven, clear the deck.',
    goal: 'Clear all 52 cards.',
    glance: { deck: '1 deck', time: '2–3 min' },
    setup: ['Nine cards face up in a 3×3 grid; the rest is the stock.'],
    steps: [
      'Pick two number cards that add up to 11 (Ace counts 1).',
      'Or pick one Jack, one Queen and one King together.',
      'New cards are dealt over the ones you clear.',
    ],
    keyCards: [
      { cards: ['A♠', '10♦'], text: 'Eleven' },
      { cards: ['J♥', 'Q♣', 'K♠'], text: 'A court trio' },
    ],
    winning: 'Clear the whole deck to win. With no eleven and no trio left, the game is lost.',
    tips: ['Clear court cards as soon as you can — they clog the grid.'],
  },

  osmosis: {
    tagline: 'Ranks seep down, row by row.',
    goal: 'Get all 52 cards onto the four foundation rows.',
    glance: { deck: '1 deck', time: '5 min' },
    setup: [
      'Four reserves of four cards (top face up).',
      'One card starts the top foundation row.',
      'The rest is a stock, turned three at a time.',
    ],
    steps: [
      'The top row takes any card of its suit.',
      'New rows start with cards of the same rank as the very first foundation card.',
      'A lower row only takes a card of its suit if that rank is already in the row above.',
      'Play from the reserves and the waste; redeal as often as you like.',
    ],
    winning: 'All cards on the foundations. Two passes through the stock without a play ends the game.',
    tips: ['Fill the top row generously — it feeds every row below.'],
  },

  // ───────────── Expansion: solo & casino ─────────────

  regicide: {
    tagline: 'Twelve royals. One brave hand.',
    goal: 'Defeat all twelve royals: four Jacks, then Queens, then Kings.',
    glance: { deck: '1 deck', time: '15 min' },
    setup: [
      'The royals form the castle, Jacks on top.',
      'A–10 form your tavern deck; you draw a hand of eight.',
      'You have two Jesters.',
    ],
    steps: [
      'Attack with one card, an Ace plus one card, or 2–4 equal number cards totalling 10 or less.',
      '♥ heals: cards from the discard go under the tavern. ♦ draws cards. ♣ doubles damage. ♠ shields against the royal’s attack.',
      'A royal is immune to its own suit’s power.',
      'If it survives, discard cards worth at least its attack (minus your shields) — or lose.',
      'An exact kill puts the royal on top of your tavern deck as a powerful card.',
      'A Jester discards your hand and draws a fresh eight.',
    ],
    keyCards: [
      { cards: ['J♠'], text: '20 HP, attack 10' },
      { cards: ['Q♥'], text: '30 HP, attack 15' },
      { cards: ['K♣'], text: '40 HP, attack 20' },
    ],
    winning: 'Defeat all twelve: Gold with no Jesters used, Silver with one, Bronze with two.',
    tips: ['Spades early make every later defence cheaper.', 'Aim for exact kills: royals in your deck are big cards.'],
    credit: 'Regicide was designed by Paul Abrahams, Luke Badger and Andy Richdale.',
  },

  baccarat: {
    tagline: 'Player, Banker or Tie?',
    goal: 'Double your bankroll of 1,000 chips.',
    glance: { deck: '8-deck shoe', time: 'Endless' },
    setup: ['Choose a side and a stake, then deal.'],
    steps: [
      'Player and Banker each get two cards. Count the last digit of the total.',
      '10s and court cards are 0, Aces 1.',
      'An 8 or 9 on two cards is a natural and stands.',
      'Otherwise Player draws on 0–5; Banker draws by the fixed third-card table.',
      'Closer to 9 wins.',
    ],
    keyCards: [
      { cards: ['9♥'], text: 'Natural nine' },
      { cards: ['K♣'], text: 'Counts zero' },
    ],
    winning:
      'Player pays 1:1, Banker 0.95:1 (5% commission), Tie 8:1 (other bets push). Reach 2,000 to win; run out and it is over.',
    tips: ['Banker has the smallest house edge.', 'The Tie bet is tempting and expensive.'],
  },

  'card-capture': {
    tagline: 'Capture the dungeon, grow your deck.',
    goal: 'Capture all twelve royals before your torches go out.',
    glance: { deck: '1 deck + 2 Jokers', time: '10 min' },
    setup: [
      'Your deck: the A–6 of every suit. You draw four each turn.',
      'The dungeon deck: 7–K and two Jokers; four enemies face up.',
      'Five torches.',
    ],
    steps: [
      'Capture an enemy with hand cards of its suit worth at least its rank (J 11, Q 12, K 13).',
      'A Joker enemy needs 14 in any suits.',
      'Captured enemies join your deck; a captured Joker is a wild 7.',
      'Sacrifice an A, 2 or 3 to banish an enemy to the bottom of the dungeon (the card leaves the game).',
      'End your turn: the dungeon refills and you draw four. Ending a turn having done nothing snuffs a torch.',
    ],
    winning: 'Capture all twelve royals to win. Lose when the last torch goes out. Capturing a Joker relights one.',
    tips: ['Capture 8s, 9s and 10s first: they make royals reachable.', 'Banishing thins your deck of weak cards too.'],
  },

  gridcannon: {
    tagline: 'Fire across the grid at armoured royals.',
    goal: 'Destroy all twelve royals around the grid.',
    glance: { deck: '1 deck + 2 Jokers', time: '10–15 min' },
    setup: [
      'Nine number cards form a 3×3 grid.',
      'Royals take places around it, beside the most similar card.',
      'Aces and Jokers go to your reserve.',
    ],
    steps: [
      'Draw a card and place it on an empty square or on a card of equal or lower value.',
      'A card placed on the edge fires the two cards between it and the royal on the far side.',
      'If they add up to the royal’s armour (J 11, Q 12, K 13), it falls. Kings only count cards of their suit, Queens of their colour.',
      'Royals you draw join the ring beside the most similar card.',
      'An Ace sweeps a stack back under the deck; a Joker sits on any stack.',
    ],
    winning: 'Destroy all twelve. You lose when a card cannot be placed and your reserve is empty.',
    tips: ['Keep low squares open for low cards.', 'Line up suits behind Kings.'],
    credit: 'Gridcannon was designed by Tom Francis.',
  },

  'the-emissary': {
    tagline: 'Win exactly what each ruler demands.',
    goal: 'Win the fealty of at least three of four rulers.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: [
      'The four Kings are the rulers, each with a demand of 2–6 tricks.',
      'Each fiefdom deals you and the Court 8 number cards; the ruler’s suit is trump.',
    ],
    steps: [
      'Play eight tricks against the Court. Follow suit if you can.',
      'The Court always tries to win.',
      'Win exactly the demanded number of tricks.',
      'Allies, once per fiefdom: Scout (J♠) redraws a card, Envoy (Q♥) swaps one with the Court, Edict (J♦) cancels trump for a trick, Herald (Q♣) takes the lead.',
    ],
    keyCards: [
      { cards: ['K♥'], text: 'A ruler: hearts are trump in this fiefdom' },
      { cards: ['J♦'], text: 'The Edict: no trump this trick' },
    ],
    winning: 'Earn three fiefdoms (or all four) to win.',
    tips: ['Losing tricks on purpose is as important as winning them.', 'Save the Edict for when the Court leads trump.'],
  },

  'red-dog': {
    tagline: 'In between, or out?',
    goal: 'Double your bankroll of 500 chips.',
    glance: { deck: '6-deck shoe', time: 'Endless' },
    setup: ['Bet, then two cards are dealt face up.'],
    steps: [
      'Consecutive cards: a push.',
      'A pair: a third card is drawn; three of a kind pays 11:1, else a push.',
      'Otherwise the gap between them is the spread. You may double your bet.',
      'The third card wins if it falls strictly between the two. Aces are high.',
    ],
    keyCards: [
      { cards: ['2♠', 'A♥'], text: 'Spread of 11: pays 1:1' },
      { cards: ['6♦', '8♣'], text: 'Spread of 1: pays 5:1' },
    ],
    winning: 'Spread 1 pays 5:1, 2 pays 4:1, 3 pays 2:1, 4+ pays 1:1. Reach 1,000 chips to win.',
    tips: ['Only raise on spreads of seven or more.'],
  },

  // ───────────── Expansion: vs CPU ─────────────

  'texas-holdem': {
    tagline: 'Read the table. Take every chip.',
    goal: 'Win all the chips at the table.',
    glance: { deck: '1 deck', time: '20+ min' },
    setup: ['Up to four players with 1,000 chips each; blinds 10/20.', 'Each player gets two private cards.'],
    steps: [
      'Betting rounds come before the flop (3 shared cards), the turn (1) and the river (1), and after the river.',
      'Fold, check, call, bet or raise; a raise is at least the size of the previous one. You can go all in any time.',
      'At the showdown the best five cards from your two plus the board win. Side pots cover all-ins.',
      'Each opponent has a hidden style — bold, cautious, suspicious or tricky — and their own timing.',
    ],
    keyCards: [
      { cards: ['A♠', 'A♥'], text: 'The best starting hand' },
      { cards: ['7♦', '2♣'], text: 'The worst' },
    ],
    winning: 'Bust everyone to win; lose your stack and you are out.',
    tips: [
      'Play fewer hands, but play them hard.',
      'Watch how long each opponent takes — on Easy and Normal it can give them away.',
    ],
    options: ['Four seats or heads-up', 'CPU strength'],
  },

  hearts: {
    tagline: 'Dodge the hearts and the Queen.',
    goal: 'Take as few penalty points as possible.',
    glance: { deck: '1 deck', time: '15–20 min' },
    setup: ['Thirteen cards each.', 'Pass three cards left, right, across, then hold — repeating.'],
    steps: [
      'The 2♣ leads the first trick; no points may be played on it.',
      'Follow suit if you can; otherwise play anything.',
      'Hearts cannot be led until one has been played.',
      'The highest card of the led suit wins the trick.',
    ],
    keyCards: [
      { cards: ['Q♠'], text: '13 penalty points' },
      { cards: ['A♥'], text: 'Each heart: 1 point' },
    ],
    winning:
      'Take all 26 points to shoot the moon: you score 0 and everyone else 26. When someone reaches the limit, the lowest score wins.',
    tips: ['Pass the Q♠, A♠ and K♠ unless you hold many spades.', 'Void a suit early so you can dump points.'],
    options: ['Game to 100 or 50', 'Passing on or off', 'CPU strength'],
  },

  spades: {
    tagline: 'Bid it, make it, with a partner.',
    goal: 'With your partner, reach 500 points first.',
    glance: { deck: '1 deck', time: '20 min' },
    setup: ['You and North play against West and East.', 'Thirteen cards each.'],
    steps: [
      'Everyone bids how many tricks they will take. Nil means none.',
      'Spades are always trump and cannot be led until one has been played.',
      'Follow suit if you can.',
    ],
    keyCards: [{ cards: ['A♠'], text: 'The top trump' }],
    winning:
      'Making your team’s bid scores 10 per bid trick plus 1 per extra trick (a bag). Failing loses 10 per bid trick. Nil is worth ±100. Ten bags cost 100.',
    tips: ['Bid low rather than high — bags are cheaper than failing.', 'Protect a partner who bid Nil.'],
    options: ['Game to 500 or 300', 'CPU strength'],
  },

  napoleon: {
    tagline: 'Bid for the face cards; find your secret ally.',
    goal: 'Score the most points over the deals.',
    glance: { deck: '1 deck', time: '20 min' },
    setup: ['Twelve cards each and a four-card kitty.'],
    steps: [
      'Bid how many of the 20 face cards (10, J, Q, K, A) your side will capture, with a trump suit. Minimum 13; ♠ > ♥ > ♦ > ♣ breaks ties.',
      'The winner is Napoleon: takes the kitty, discards four and names an adjutant card. Its holder is a secret partner.',
      'Follow suit if you can. Napoleon leads first.',
      'The Mighty (A♠) beats everything, then the trump Jack and the other Jack of the same colour.',
      'The ♥Q (Yoromeki) beats the Mighty when both fall in one trick.',
    ],
    keyCards: [
      { cards: ['A♠'], text: 'Mighty' },
      { cards: ['Q♥'], text: 'Yoromeki: catches the Mighty' },
    ],
    winning:
      'Napoleon’s side wins if it takes at least the bid; Napoleon scores 2, the adjutant 1, the others lose 1 — reversed if the bid fails.',
    tips: ['Name the strongest card you are missing as your adjutant.', 'Feed face cards to whoever is winning for your side.'],
    options: ['3 or 5 deals', 'CPU strength'],
  },

  'page-one': {
    tagline: 'Match, skip, reverse — and shout “Page One!”',
    goal: 'Be the first to play all your cards.',
    glance: { deck: '1 deck', time: '5 min' },
    setup: ['Seven cards each; one card starts the discard pile.'],
    steps: [
      'Play a card matching the top card by suit or rank.',
      'Eights are wild: play one any time and call a new suit.',
      'Cannot (or would rather not) play? Draw one card; play it if it fits, or pass.',
      'Before you play down to one card, press “Page One!” — forget and you draw two.',
    ],
    keyCards: [
      { cards: ['8♣'], text: 'Wild: choose the suit' },
      { cards: ['2♦'], text: 'Next player draws 2' },
      { cards: ['Q♠'], text: 'Next player draws 5' },
      { cards: ['J♥'], text: 'Skip' },
      { cards: ['A♣'], text: 'Reverse' },
    ],
    winning: 'First to empty their hand wins.',
    tips: ['Keep an 8 for the end.', 'Use skips and draws against whoever is about to go out.'],
    options: ['Special cards on or off', 'CPU strength'],
  },

  doubt: {
    tagline: 'Lie with a straight face.',
    goal: 'Be the first to get rid of all your cards.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: ['Thirteen cards each.'],
    steps: [
      'The rank to play climbs every turn: A, 2, 3 … K, then A again.',
      'Put 1–4 cards face down and claim they are that rank — true or not.',
      'Anyone may call “Doubt!”. The cards are turned over.',
      'A lie: the player takes the whole pile. The truth: the doubter does.',
    ],
    winning: 'Empty your hand — and survive any doubt on your last play — to win.',
    tips: [
      'Lie with cards you will not need for a while.',
      'If you hold three of a rank, a claim of two is a lie.',
      'On Easy and Normal, a liar hesitates.',
    ],
    options: ['CPU strength: memory, nerve and poker face'],
  },

  'gin-rummy': {
    tagline: 'Meld, knock, or go Gin.',
    goal: 'Reach 100 points first.',
    glance: { deck: '1 deck', time: '15–20 min' },
    setup: ['Ten cards each; one card starts the discard pile.'],
    steps: [
      'Draw the top discard or a stock card, then discard one.',
      'Melds are 3–4 of a rank, or runs of 3+ in a suit (Ace low). The rest is deadwood: court cards 10, Ace 1.',
      'Knock when your deadwood is 10 or less. Your opponent may lay cards off on your melds.',
      'Gin is no deadwood at all.',
    ],
    winning:
      'A knock scores the difference in deadwood; Gin adds 25. If the defender has as little deadwood as the knocker, it is an undercut: 25 plus the difference to the defender.',
    tips: ['Throw high deadwood early.', 'Watch what your opponent picks up from the discard.'],
    options: ['Game to 100 or 50', 'CPU strength'],
  },

  war: {
    tagline: 'Flip. Compare. War!',
    goal: 'Win the most cards.',
    glance: { deck: '1 deck', time: '2–5 min' },
    setup: ['Each player gets 26 cards face down.'],
    steps: [
      'Both flip their top card; the higher one (Aces high) takes both.',
      'On a tie it is War: each puts cards face down and flips another — the winner takes them all.',
    ],
    winning: 'Short game: first to 35 cards, or most cards after 20 battles. Classic: take every card.',
    tips: ['There are no decisions — just enjoy the drama.'],
    options: ['Short or classic length', 'Cards face down in a war: 1–3'],
  },

  cribbage: {
    tagline: 'Fifteen-two, fifteen-four, and a pair is six.',
    goal: 'Peg to 121 points first.',
    glance: { deck: '1 deck', time: '20–30 min' },
    setup: [
      'Six cards each; each puts two into the dealer’s crib.',
      'A starter card is cut; a Jack gives the dealer 2 (his heels).',
    ],
    steps: [
      'The play: take turns laying cards, keeping the count at 31 or less. 15 and 31 score 2; pairs 2, 6 or 12; runs 1 per card.',
      'Say “Go” when you cannot play; the last player to play scores 1.',
      'The show: count your four cards with the starter — fifteens, pairs, runs, flush and his nobs (the Jack of the starter’s suit).',
      'Then the dealer counts the crib.',
    ],
    keyCards: [
      { cards: ['5♥', '5♣', '5♦', 'J♠'], text: 'With the 5♠ starter: 29, the best hand' },
      { cards: ['J♣'], text: 'His nobs: 1 point with a club starter' },
    ],
    winning: 'First to 121 (or 61) wins — even in the middle of a hand.',
    tips: ['Keep 5s and cards that make 15 together.', 'Do not give your opponent a 5 or 10 to count to 15.'],
    options: ['Game to 121 or 61', 'CPU strength'],
  },

  euchre: {
    tagline: 'Ride the bowers.',
    goal: 'With your partner, reach 10 points first.',
    glance: { deck: '24 cards (9–A)', time: '10–15 min' },
    setup: ['Five cards each, you and North against West and East.', 'One card is turned up from the kitty.'],
    steps: [
      'First round: order the upturned card as trump (the dealer picks it up and discards) or pass.',
      'Second round: name another suit or pass; the dealer must choose if everyone passes.',
      'The makers may go alone, leaving the partner out.',
      'Follow suit if you can. The Left Bower counts as trump.',
    ],
    keyCards: [
      { cards: ['J♥'], text: 'Right Bower when hearts are trump' },
      { cards: ['J♦'], text: 'Left Bower when hearts are trump' },
    ],
    winning: 'Makers taking 3–4 tricks score 1, all five 2 (4 alone). If the makers fail, the defenders score 2.',
    tips: ['Two bowers and an Ace is a strong order.', 'Lead trump to pull your opponents’ trumps when you made it.'],
    options: ['Game to 10 or 5', 'CPU strength'],
  },

  schnapsen: {
    tagline: 'Sixty-six, and not a point less.',
    goal: 'Win seven game points first.',
    glance: { deck: '20 cards (10–A)', time: '10–15 min' },
    setup: ['Five cards each; the next card is turned as trump under the talon.'],
    steps: [
      'Card points: A 11, 10 10, K 4, Q 3, J 2. Reach 66 to win the deal.',
      'While the talon is open you need not follow suit; the trick winner draws first.',
      'Once the talon is closed or empty: follow suit, beat the lead if you can, else trump.',
      'On your lead you may show a King and Queen of a suit (a marriage: 20, or 40 in trump), swap the trump Jack for the trump card, or close the talon.',
    ],
    keyCards: [
      { cards: ['K♥', 'Q♥'], text: 'A marriage: 20 (40 in trump)' },
      { cards: ['A♣'], text: '11 points' },
    ],
    winning: 'Win a deal for 1 game point, 2 if the loser has under 33, 3 if they took no trick. First to 7.',
    tips: ['Close the talon when you can count 66 in your hand.', 'Hold marriage partners together.'],
    options: ['CPU strength'],
  },

  'six-card-golf': {
    tagline: 'Low cards, matching columns.',
    goal: 'Have the lowest total after all the holes.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: ['A 2×3 grid of six face-down cards each; turn two up.'],
    steps: [
      'Draw from the stock or take the top discard.',
      'Swap it with any card in your grid, face up; the old card is discarded.',
      'Or throw a stock card away and turn up one of your face-down cards.',
      'When someone has every card face up, everyone else gets one last turn.',
    ],
    keyCards: [
      { cards: ['2♠'], text: 'Minus 2' },
      { cards: ['K♦'], text: 'Zero' },
      { cards: ['Q♣'], text: '10' },
    ],
    winning: 'A pair in a column scores 0. Otherwise A 1, 2 −2, J/Q 10, K 0, others face value. Lowest total wins.',
    tips: ['Pair up high cards in a column to erase them.', 'Do not turn your last card while you are behind.'],
    options: ['2–4 players', '1, 5 or 9 holes', 'CPU strength'],
  },

  cuttle: {
    tagline: 'The oldest card battler.',
    goal: 'Reach 21 points before your opponent.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: ['You get six cards and go first; your opponent gets five.'],
    steps: [
      'On your turn draw a card or play one.',
      'Play A–10 for points, or use a number card to scuttle a lower point card of your opponent.',
      'One-offs: A scraps all points, 2 scraps a permanent, 3 takes from the scrap, 4 makes them discard two, 5 draws two, 6 scraps all permanents, 7 plays the top card, 9 returns a permanent.',
      'Permanents: 8 Glasses reveal their hand, J steals a point card, Q protects your other cards, K lowers your goal.',
      'Any one-off can be countered with a 2, and that counter countered again.',
    ],
    keyCards: [
      { cards: ['K♠'], text: 'Goal 21 → 14 → 10 → 7 → 5' },
      { cards: ['2♥'], text: 'Counter, or scrap a permanent' },
      { cards: ['J♦'], text: 'Steal a point card' },
    ],
    winning: 'Reach your goal first. Three passes in a row with an empty deck is a draw.',
    tips: ['Kings win games: two Kings and you need only 10.', 'Keep a 2 to stop their big one-off.'],
    options: ['CPU strength'],
  },

  gops: {
    tagline: 'Pure strategy. No luck.',
    goal: 'Win the most prize points.',
    glance: { deck: '39 cards', time: '3 min' },
    setup: ['You hold the 13 spades, your opponent the 13 hearts.', 'The diamonds are the prizes (A 1 … K 13).'],
    steps: [
      'A prize is turned up.',
      'You both choose a bid card at the same moment.',
      'The higher bid wins the prize. On a tie it stays, and the next prize joins it.',
    ],
    keyCards: [{ cards: ['K♦'], text: 'The biggest prize: 13' }],
    winning: 'Most prize points after thirteen rounds wins.',
    tips: ['Throw a low card when you expect to lose a big prize anyway.', 'Your opponent has a personality — find it.'],
    options: ['CPU strength'],
  },

  yaniv: {
    tagline: 'Call it low — but not too low.',
    goal: 'Keep your score lowest.',
    glance: { deck: '1 deck + 2 Jokers', time: '15 min' },
    setup: ['Five cards each; one card starts the discard.'],
    steps: [
      'Discard one card, a set of equal ranks, or a run of three or more in one suit.',
      'Then draw from the stock or take the first or last card of the previous discard.',
      'With 7 or less in hand you may call “Yaniv!” instead of discarding.',
      'If nobody holds less, everyone else scores their hand; if someone has as little or less, it is “Assaf!” and you take 30 plus your hand.',
    ],
    keyCards: [
      { cards: ['Joker'], text: '0 points' },
      { cards: ['A♦'], text: '1 point' },
    ],
    winning: 'Landing on a multiple of 50 knocks 50 off. When someone passes the limit, the lowest score wins.',
    tips: ['Watch what others pick up — they may be closer than they look.'],
    options: ['Limit 200 or 100', 'CPU strength'],
  },

  palace: {
    tagline: 'Play up, burn the pile, escape the palace.',
    goal: 'Get rid of every card before the others.',
    glance: { deck: '1 deck', time: '10 min' },
    setup: ['Three blind cards, three face-up cards on top, and three in hand.', 'Swap hand and face-up cards before play.'],
    steps: [
      'Play one or more cards of a rank equal to or higher than the pile, then draw back to three.',
      'Cannot play? Pick up the whole pile.',
      'A 2 resets the pile; a 10 or four of a kind burns it and you play again; after a 7 the next card must be 7 or lower.',
      'With hand and stock empty, play your face-up cards, then flip your blind cards one by one.',
    ],
    keyCards: [
      { cards: ['2♣'], text: 'Reset' },
      { cards: ['10♥'], text: 'Burn the pile' },
      { cards: ['7♠'], text: 'Next must be 7 or lower' },
    ],
    winning: 'Get out before all three opponents and you escape. The last player holding cards is the palace keeper.',
    tips: ['Put 2s, 10s and Aces face up for the endgame.'],
    options: ['CPU strength'],
  },

  durak: {
    tagline: 'Attack, defend — don’t be the fool.',
    goal: 'Don’t be the last player holding cards.',
    glance: { deck: '36 cards (6–A)', time: '10 min' },
    setup: ['Six cards each; the bottom card of the stock shows trump.', 'The lowest trump attacks first.'],
    steps: [
      'The attacker leads a card. The defender beats it with a higher card of the same suit or any trump.',
      'Attackers may throw in more cards of any rank on the table, up to six.',
      'Beat everything and you attack next. Give up and you take every card on the table.',
      'Everyone draws back up to six after each bout.',
    ],
    keyCards: [{ cards: ['6♠'], text: 'With spades trump, even a 6 beats any non-trump' }],
    winning: 'Players with no cards (once the stock is gone) are safe. The last one left is the Durak.',
    tips: ['Spend low non-trumps first.', 'Taking two small cards can be cheaper than wasting a high trump.'],
    options: ['2–4 players', '36 or 52 cards', 'CPU strength'],
  },

  'big-two': {
    tagline: 'Twos are top. Climb with poker hands.',
    goal: 'Be the first to play all your cards.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: ['Thirteen cards each. The holder of the 3♦ leads with it.'],
    steps: [
      'Cards rank 3 low up to A, then 2 highest. Suits break ties: ♦ < ♣ < ♥ < ♠.',
      'Play a single, pair, triple or five-card hand.',
      'Five-card hands rank straight < flush < full house < four of a kind (+1) < straight flush.',
      'Each play must have the same number of cards and beat the last, or pass.',
      'When everyone passes, the last player to play leads anything.',
    ],
    keyCards: [
      { cards: ['2♠'], text: 'The highest card' },
      { cards: ['3♦'], text: 'The lowest — leads the game' },
    ],
    winning: 'First to empty their hand wins.',
    tips: ['Shed awkward cards inside five-card hands.', 'Keep a 2 to take control near the end.'],
    options: ['CPU strength'],
  },

  'ninety-nine': {
    tagline: 'Push the count — don’t break it.',
    goal: 'Be the last player with lives left.',
    glance: { deck: '1 deck', time: '5–10 min' },
    setup: ['Three cards and three lives each.'],
    steps: [
      'Play a card, add its value to the count and draw a replacement.',
      'The count may never pass 99.',
      '4 reverses, 9 passes (+0), 10 is ±10, J and Q are +10, K sets the count to 99, A is +1 or +11.',
      'If nothing you hold keeps the count at 99 or under, you lose a life and a new round is dealt.',
    ],
    keyCards: [
      { cards: ['K♥'], text: 'Straight to 99' },
      { cards: ['9♠'], text: 'Pass' },
      { cards: ['4♦'], text: 'Reverse' },
    ],
    winning: 'Last player standing wins.',
    tips: ['Save Kings, 9s and 4s for when the count is high.'],
    options: ['CPU strength'],
  },

  'oh-hell': {
    tagline: 'Exactly right, or nothing.',
    goal: 'Score the most points over all the rounds.',
    glance: { deck: '1 deck', time: '20 min' },
    setup: ['Hand sizes go 1 up to 7 and back down (or 10 down to 1).', 'After the deal one card is turned up as trump.'],
    steps: [
      'Everyone bids exactly how many tricks they will take.',
      'The dealer bids last and may not make the bids add up to the number of tricks.',
      'Follow suit if you can; the highest trump, else the highest of the led suit, wins.',
    ],
    winning: 'Make your bid exactly for 10 plus the bid. Miss by any amount and score nothing.',
    tips: ['Bidding zero on a weak hand is often the best bid.', 'Ducking tricks is a skill too.'],
    options: ['Up and down, or down the river', 'CPU strength'],
  },
};
