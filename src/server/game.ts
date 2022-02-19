import { readdirSync, createReadStream } from 'fs'
import { parse } from 'path'
import { createInterface } from 'readline'
import { Team } from '../shared/enum'
import Player from './player'

const WORDS_PATH = "./server/words/"

// get wordlists
let phraseFiles = readdirSync(WORDS_PATH)
let phraseLists = []

// load wordlists
phraseFiles.forEach(wordfile => {
    let words = []

    createInterface({
        input: createReadStream(WORDS_PATH + wordfile),
        terminal: false
    }).on('line', (line) => { if (line.charAt(0) !== '#') words.push(line) })

    phraseLists[parse(wordfile).name] = words
})

// Codenames Game
export default class Game {
    private readonly DEFAULT_LISTS = [
        'entertainment',
        'everyday_life',
        'fun_and_games',
        'the_world',
        'variety',
    ]
    readonly DEFAULT_TIMER = 61
    readonly SCORE_TO_WIN = 7

    /** available word lists to choose from */
    availableLists: string[] = []

    /** currently selected word lists */
    selectedLists: string[] = this.DEFAULT_LISTS

    /** all phrase available to the game */
    availablePhrases: string[]

    /** words that have been used in this game */
    usedPhrases: string[] = []

    /** if the game has been won/lost */
    over: boolean

    /** if the current round is over */
    roundOver: boolean

    /** which team is the winner */
    winner: Team

    /** the team whose turn it is */
    turn: Team

    /** current value of the timer */
    timer: number

    /** Starting value of the time */
    timerStart: number

    /** if the timer is currently running */
    timeRunning: boolean

    /** current score for red */
    scoreRed: number

    /** current score for blue */
    scoreBlue: number

    /** current word being guessed */
    currentPhrase: string

    /** current speaker */
    currentSpeaker: Player

    /** previous speaker */
    previousSpeaker: Player

    constructor() {
        this.availableLists = Object.keys(phraseLists)
        this.timerStart = this.DEFAULT_TIMER
        
        this.updateWordPool()
        this.init()
    }

    /**
     * Initialize the game state
     */
    init() {
        this.over = false                   // Whether or not the game has been won / lost
        this.roundOver = true               // Whether or not the round is over
        this.winner = Team.Undecided        // Winning team
        this.timer = this.timerStart        // Set the timer
        this.timeRunning = false            // if the timer should be running
        this.scoreRed = this.scoreBlue = 0  // initial score
        this.turn = Team.Undecided
        this.currentSpeaker = null

        this.currentPhrase = ''       // Init the board
        this.newWord()   // get a new word
    }

    /**
     * Check the current score and determine if there is a winner
     */
    checkWin() {
        if (this.scoreRed >= this.SCORE_TO_WIN) {
            this.over = true
            this.winner = Team.Red
        } else if (this.scoreBlue >= this.SCORE_TO_WIN) {
            this.over = true
            this.winner = Team.Blue
        }
    }

    /**
     * swap the turn over to the other team
     */
    switchTurn() {
        if (this.turn === Team.Blue) {
            this.turn = Team.Red
        } else {
            this.turn = Team.Blue
        }
    }

    /**
     * Get a new word from the list
     */
    newWord() {
        let foundPhrase:string      // Temp var for a word out of the list
        if (this.usedPhrases.length >= 1000) {
            this.usedPhrases = []
        }
       
        // Pick a random word from the pool
        foundPhrase = this.availablePhrases[Math.floor(Math.random() * this.availablePhrases.length)]

        // If the word has been used in the room already, pick another
        while (this.usedPhrases.includes(foundPhrase)) {
            foundPhrase = this.availablePhrases[Math.floor(Math.random() * this.availablePhrases.length)]
        }

        this.usedPhrases.push(foundPhrase) // Add the word to the used list
        this.currentPhrase = foundPhrase       // set the current word
    }

    // update the list of available words
    updateWordPool() {
        let pool = []

        if (this.selectedLists.length === 0) {
            this.selectedLists = this.DEFAULT_LISTS
        }

        this.selectedLists.forEach((list, index, lists) => {
            if (phraseLists[list] === undefined) {
                lists.splice(index, 1)
            } else {
                pool = pool.concat(phraseLists[list])
            }
        })
        
        this.availablePhrases = pool
    }
}
