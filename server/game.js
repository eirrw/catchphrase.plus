
let fs = require('fs')
let path = require('path')
let readline = require('readline')

const WORDS_PATH = "./server/words/"
const DEFAULT_LISTS = [
  'entertainment',
  'everyday_life',
  'fun_and_games',
  'the_world',
]

// get wordlists
let wordfiles = fs.readdirSync(WORDS_PATH)
let wordlists = []

// load wordlists
wordfiles.forEach(wordfile => {
  let words = []

  readline.createInterface({
    input: fs.createReadStream(WORDS_PATH + wordfile),
    terminal: false
  }).on('line', (line) => {words.push(line)})

  wordlists[path.parse(wordfile).name] = words
});

// Codenames Game
class Game{
  constructor(){
    this.timerAmount = 61 // Default timer value
    this.winScore = 7 // default win score

    this.availLists = Object.keys(wordlists)
    this.useLists = DEFAULT_LISTS.slice()
    this.updateWordPool()
    this.usedWords = []

    this.init();
  }

  init(){
    this.randomTurn()   // When game is created, select red or blue to start, randomly
    this.over = false   // Whether or not the game has been won / lost
    this.roundOver = true // Whether or not the round is over
    this.winner = ''    // Winning team
    this.timer = this.timerAmount // Set the timer
    this.timeRunning = false // if the timer should be running
    this.red = this.blue = 0; // initial score

    this.word = ''       // Init the board
    this.newWord()   // get a new word
  }

  // Check the current score and determine if someone won
  checkWin(){
    // Check team winner
    if (this.red >= this.winScore) {
      this.over = true
      this.winner = 'red'
    }
    if (this.blue >= this.winScore) {
      this.over = true
      this.winner = 'blue'
    }
  }

  // swap the turn over to the other team
  switchTurn(){
    if (this.turn === 'blue') this.turn = 'red' // Switch turn
    else this.turn = 'blue'
  }

  // 50% red turn, 50% blue turn
  randomTurn(){
    this.turn = 'blue'
    if (Math.random() < 0.5) this.turn = 'red'
  }

  // Get a new word from the list
  newWord(){
    let foundWord      // Temp var for a word out of the list
    if (this.usedWords.length >= 1000) {
      this.usedWords = []
    }

    foundWord = this.words[Math.floor(Math.random() * this.words.length)] // Pick a random word from the pool
    // If the word has been used in the room already, pick another
    while (this.usedWords.includes(foundWord)){
      foundWord = this.words[Math.floor(Math.random() * this.words.length)]
    }
    this.usedWords.push(foundWord) // Add the word to the used list
    this.word = foundWord       // set the current word
  }

  // update the list of available words
  updateWordPool(){
    let pool = []
    if (this.useLists.length === 0) this.useLists = DEFAULT_LISTS.slice()
    this.useLists.forEach((list, index, lists) => {
      if (wordlists[list] === undefined) {
        lists.splice(index, 1)
      } else {
        pool = pool.concat(wordlists[list])
      }
    });
    this.words = pool
  }

  // Debugging purposes
  printBoard(){
    for (let i = 0; i < 5; i++){
      console.log(this.board[i][0].type + " | " +
                  this.board[i][1].type + " | " +
                  this.board[i][2].type + " | " +
                  this.board[i][3].type + " | " +
                  this.board[i][4].type)
    }
  }
}

// Let the main nodejs server know this file exists
module.exports = Game;
