
let fs = require('fs')
let readline = require('readline')

// Load base words into an array
let basewords = []
var filename = './server/words.txt'
readline.createInterface({
    input: fs.createReadStream(filename),
    terminal: false
}).on('line', (line) => {basewords.push(line)})

// Load NLSS words into an array
let nlsswords = []
filename = './server/nlss-words.txt'
readline.createInterface({
    input: fs.createReadStream(filename),
    terminal: false
}).on('line', (line) => {nlsswords.push(line)})

// Load Duet words into an array
let duetwords = []
filename = './server/duet-words.txt'
readline.createInterface({
    input: fs.createReadStream(filename),
    terminal: false
}).on('line', (line) => {duetwords.push(line)})

// Load Undercover words into an array
let undercoverwords = []
filename = './server/undercover-words.txt'
readline.createInterface({
    input: fs.createReadStream(filename),
    terminal: false
}).on('line', (line) => {undercoverwords.push(line)})

// Load easy words into an array
let easywords = []
filename = './server/catchphrase-easy.txt'
readline.createInterface({
  input: fs.createReadStream(filename),
  terminal: false
}).on('line', (line) => {easywords.push(line)})

// Load medium words into an array
let mediumwords = []
filename = './server/catchphrase-medium.txt'
readline.createInterface({
  input: fs.createReadStream(filename),
  terminal: false
}).on('line', (line) => {mediumwords.push(line)})

// Load hard words into an array
let hardwords = []
filename = './server/catchphrase-hard.txt'
readline.createInterface({
  input: fs.createReadStream(filename),
  terminal: false
}).on('line', (line) => {hardwords.push(line)})

// Load really hard words into an array
let reallyhardwords = []
filename = './server/catchphrase-reallyhard.txt'
readline.createInterface({
  input: fs.createReadStream(filename),
  terminal: false
}).on('line', (line) => {reallyhardwords.push(line)})

// Codenames Game
class Game{
  constructor(){
    this.timerAmount = 61 // Default timer value
    this.winScore = 7 // default win score

    this.words = basewords  // Load default word pack
    this.usedWords = []
    this.base = true
    this.duet = false
    this.undercover = false
    this.nlss = false

    this.init();

    this.red = this.blue = 0;
  }

  init(){
    this.randomTurn()   // When game is created, select red or blue to start, randomly
    this.over = false   // Whether or not the game has been won / lost
    this.winner = ''    // Winning team
    this.timer = this.timerAmount // Set the timer
    this.timeRunning = false

    this.word = ''       // Init the board
    this.newWord()   // Populate the board
  }

  // Check the number of unflipped team tiles and determine if someone won
  checkWin(){
    this.red =
    this.blue = this.findType('blue') // unflipped blue tiles
    // Check team winner
    if (this.red === this.winScore) {
      this.over = true
      this.winner = 'red'
    }
    if (this.blue === this.winScore) {
      this.over = true
      this.winner = 'blue'
    }
  }

  // Reset the timer and swap the turn over to the other team
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
    // If the word is already on the board, pick another
    while (this.usedWords.includes(foundWord)){
      foundWord = this.words[Math.floor(Math.random() * this.words.length)]
    }
    this.usedWords.push(foundWord) // Add the word to the used list
    this.word = foundWord       // Add the tile object to the board
  }

  updateWordPool(){
    let pool = []
    if (this.base) pool = pool.concat(basewords)
    if (this.duet) pool = pool.concat(duetwords)
    if (this.undercover) pool = pool.concat(undercoverwords)
    if (this.nlss) pool = pool.concat(nlsswords)
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