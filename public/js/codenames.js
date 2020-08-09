let socket = io() // Connect to server


// Sign In Page Elements
////////////////////////////////////////////////////////////////////////////
// Divs
let joinDiv = document.getElementById('join-game')
let joinErrorMessage = document.getElementById('error-message')
// Input Fields
let joinNickname = document.getElementById('join-nickname')
let joinRoom = document.getElementById('join-room')
let joinPassword = document.getElementById('join-password')
// Buttons
let joinEnter = document.getElementById('join-enter')
let joinCreate = document.getElementById('join-create')


// Game Page Elements
////////////////////////////////////////////////////////////////////////////
// Divs
let gameDiv = document.getElementById('game')
let boardDiv = document.getElementById('board')
let aboutWindow = document.getElementById('about-window')
let afkWindow = document.getElementById('afk-window')
let serverMessageWindow = document.getElementById('server-message')
let serverMessage = document.getElementById('message')
let overlay = document.getElementById('overlay')
// Buttons
let leaveRoom = document.getElementById('leave-room')
let joinRed = document.getElementById('join-red')
let joinBlue = document.getElementById('join-blue')
let randomizeTeams = document.getElementById('randomize-teams')
// let endTurn = document.getElementById('end-turn')
let newGame = document.getElementById('new-game')
let buttonSkipWord = document.getElementById('skip')
let buttonNextPlayer = document.getElementById('next')
let buttonStartStop = document.getElementById('start-stop')
let buttonAbout = document.getElementById('about-button')
let buttonAfk = document.getElementById('not-afk')
let buttonServerMessageOkay = document.getElementById('server-message-okay')
let buttonBasecards = document.getElementById('base-pack')
let buttonDuetcards = document.getElementById('duet-pack')
let buttonUndercovercards = document.getElementById('undercover-pack')
let buttonNLSScards = document.getElementById('nlss-pack')
// Slider
let timerSlider = document.getElementById('timer-slider')
let timerSliderLabel = document.getElementById('timer-slider-label')
// Player Lists
let undefinedList = document.getElementById('undefined-list')
let redTeam = document.getElementById('red-team')
let blueTeam = document.getElementById('blue-team')
// UI Elements
let scoreRed = document.getElementById('score-red')
let scoreBlue = document.getElementById('score-blue')
let turnMessage = document.getElementById('status')
let timer = document.getElementById('timer')


// init
////////////////////////////////////////////////////////////////////////////
// Default game settings
let playerRole = 'guesser'
let mode = 'casual'

// UI Interaction with server
////////////////////////////////////////////////////////////////////////////
// User Joins Room
joinEnter.onclick = () => {       
  socket.emit('joinRoom', {
    nickname:joinNickname.value,
    room:joinRoom.value,
    password:joinPassword.value
  })
}
// User Creates Room
joinCreate.onclick = () => {      
  socket.emit('createRoom', {
    nickname:joinNickname.value,
    room:joinRoom.value,
    password:joinPassword.value
  })
}
// User Leaves Room
leaveRoom.onclick = () => {       
  socket.emit('leaveRoom', {})
}
// User Joins Red Team
joinRed.onclick = () => {         
  socket.emit('joinTeam', {
    team:'red'
  })
}
// User Joins Blue Team
joinBlue.onclick = () => {        
  socket.emit('joinTeam', {
    team:'blue'
  })
}
// User Randomizes Team
randomizeTeams.onclick = () => {  
  socket.emit('randomizeTeams', {})
}
// User Starts New Game
newGame.onclick = () => {         
  socket.emit('newGame', {})
}

function skipWord(){
  socket.emit('skipWord', {})
}

function nextPlayer() {
  socket.emit('nextPlayer', {})
}

function startStop() {
  socket.emit('startStop', {})
}

// User Clicks About
buttonAbout.onclick = () => {
  if (aboutWindow.classList.contains('hidden')) {
    aboutWindow.classList.remove('hidden')
    overlay.classList.remove('hidden')
    buttonAbout.classList.add('open')
  } else {
    aboutWindow.classList.add('hidden')
    overlay.classList.add('hidden')
    buttonAbout.classList.remove('open')
  }
}
// User Clicks card pack
buttonBasecards.onclick = () => {
  socket.emit('changeCards', {pack:'base'})
}
// User Clicks card pack
buttonDuetcards.onclick = () => {
  socket.emit('changeCards', {pack:'duet'})
}
// User Clicks card pack
buttonUndercovercards.onclick = () => {
  socket.emit('changeCards', {pack:'undercover'})
}
// User Clicks card pack
buttonNLSScards.onclick = () => {
  socket.emit('changeCards', {pack:'nlss'})
}

// When the slider is changed
timerSlider.addEventListener("input", () =>{
  socket.emit('timerSlider', {value:timerSlider.value})
})

// User confirms they're not afk
buttonAfk.onclick = () => {
  socket.emit('active')
  afkWindow.classList.add('hidden')
  overlay.classList.add('hidden')
}

// User confirms server message
buttonServerMessageOkay.onclick = () => {
  serverMessageWindow.classList.add('hidden')
  overlay.classList.add('hidden')
}

// Server Responses to this client
////////////////////////////////////////////////////////////////////////////
socket.on('serverStats', (data) => {        // Client gets server stats
  document.getElementById('server-stats').innerHTML = "Players: " + data.players + " | Rooms: " + data.rooms
})

socket.on('joinResponse', (data) =>{        // Response to joining room
  if(data.success){
    joinDiv.style.display = 'none'
    gameDiv.style.display = 'block'
    joinErrorMessage.innerText = ''
  } else joinErrorMessage.innerText = data.msg
})

socket.on('createResponse', (data) =>{      // Response to creating room
  if(data.success){
    joinDiv.style.display = 'none'
    gameDiv.style.display = 'block'
    joinErrorMessage.innerText = ''
  } else joinErrorMessage.innerText = data.msg
})

socket.on('leaveResponse', (data) =>{       // Response to leaving room
  if(data.success){
    joinDiv.style.display = 'block'
    gameDiv.style.display = 'none'
  }
})

socket.on('timerUpdate', (data) => {        // Server update client timer
  timer.innerHTML = "[" + data.timer + "]"
})

socket.on('newGameResponse', (data) => {    // Response to New Game
  if (data.success){
  }
})

socket.on('afkWarning', () => {    // Response to Afk Warning
  afkWindow.classList.remove('hidden')
  overlay.classList.remove('hidden')
})

socket.on('afkKicked', () => {    // Response to Afk Kick
  afkWindow.classList.add('hidden')
  serverMessageWindow.classList.remove('hidden')
  serverMessage.innerHTML = 'You were kicked for being AFK'
  overlay.classList.remove('hidden')
})

socket.on('serverMessage', (data) => {    // Response to Server message
  serverMessage.innerHTML = data.msg
  serverMessageWindow.classList.remove('hidden')
  overlay.classList.remove('hidden')
})

socket.on('switchRole', (data) =>{  // Response to Switching Role
  playerRole = data.role;
  if (playerRole === 'guesser') {
    buttonSkipWord.disabled = true;
    buttonNextPlayer.disabled = true;
  } else {
    buttonSkipWord.disabled = false;
    buttonNextPlayer.disabled = false;
  }
})

socket.on('gameState', (data) =>{           // Response to gamestate update
  console.log(data)
  updatePlayerlist(data.players)        // Update the player list for the room
  updateInfo(data.game, data.team)      // Update the games turn information
  updateTimerSlider(data.game, data.mode)          // Update the games timer slider
  updatePacks(data.game)                // Update the games pack information
  updateBoard(data.game.word, data.game.usedWords, data.team, data.game.turn) // Update the board display
})


// Utility Functions
////////////////////////////////////////////////////////////////////////////

// Wipe all of the descriptor tile classes from each tile
function wipeBoard(){
  for (let x = 0; x < 5; x++){
    let row = document.getElementById('row-' + (x+1))
    for (let y = 0; y < 5; y++){
      let button = row.children[y]
      button.className = 'tile'
    }
  }
}

// Update the game info displayed to the client
function updateInfo(game){
  scoreBlue.innerHTML = game.blue                         // Update the blue tiles left
  scoreRed.innerHTML = game.red                           // Update the red tiles left
  turnMessage.innerHTML = game.turn + "'s turn"           // Update the turn msg
  turnMessage.className = game.turn                       // Change color of turn msg
  if (game.over){                                         // Display winner
    turnMessage.innerHTML = game.winner + " wins!"
    turnMessage.className = game.winner
  }
  debugger;
  let disableButtons = playerRole !== 'speaker'
  buttonSkipWord.disabled = disableButtons
  buttonNextPlayer.disabled = disableButtons
}

// Update the clients timer slider
function updateTimerSlider(game, mode){
  timerSlider.value = (game.timerAmount - 1) / 60
  timerSliderLabel.innerHTML = "Timer Length : " + timerSlider.value + "min"

  // If the mode is not timed, dont show the slider
  if (mode === 'casual'){
    timerSlider.style.display = 'none'
    timerSliderLabel.style.display = 'none'
  } else {
    timerSlider.style.display = 'block'
    timerSliderLabel.style.display = 'block'
  }
}

// Update the pack toggle buttons
function updatePacks(game){
  if (game.base) buttonBasecards.className = 'enabled'
  else buttonBasecards.className = ''
  if (game.duet) buttonDuetcards.className = 'enabled'
  else buttonDuetcards.className = ''
  if (game.undercover) buttonUndercovercards.className = 'enabled'
  else buttonUndercovercards.className = ''
  if (game.nlss) buttonNLSScards.className = 'enabled'
  else buttonNLSScards.className = ''
  document.getElementById('word-pool').innerHTML = "Word Pool: " + game.words.length
}

// Update the board
function updateBoard(word, usedWords, team, turn){
  let preWord = ''
  if (usedWords.length > 1) {
    preWord = usedWords[usedWords.length - 2]
  }

  document.getElementById('word').innerHTML = word
  document.getElementById('pre-word').innerHTML = preWord

  let notTurn = 'blue'
  if (turn === notTurn) notTurn = 'red'

  let wordContainer = document.getElementById('word-container')
  let otherTeamContainer = document.getElementById('other-team-guessing')
  let yourTeamContainer = document.getElementById('your-team-guessing')
  wordContainer.classList.add(turn)
  wordContainer.classList.remove(notTurn)

  if (playerRole === 'speaker') {
    wordContainer.classList.remove('hidden')
    yourTeamContainer.classList.add('hidden')
    otherTeamContainer.classList.add('hidden')
  } else {
    wordContainer.classList.add('hidden')
    if (team === turn) {
      yourTeamContainer.classList.remove('hidden')
      otherTeamContainer.classList.add('hidden')
    } else {
      yourTeamContainer.classList.add('hidden')
      otherTeamContainer.classList.remove('hidden')
    }
  }
}

// Update the player list
function updatePlayerlist(players){
  undefinedList.innerHTML = ''
  redTeam.innerHTML = ''
  blueTeam.innerHTML = ''

  for (let i in players){
    // Create a li element for each player
    let li = document.createElement('li');
    li.innerText = players[i].nickname
    // If the player is a spymaster, put brackets around their name
    if (players[i].role === 'spymaster') li.innerText = "[" + players[i].nickname + "]"
    // Add the player to their teams ul
    if (players[i].team === 'undecided'){
      undefinedList.appendChild(li)
    } else if (players[i].team === 'red'){
      redTeam.appendChild(li)
    } else if (players[i].team === 'blue'){
      blueTeam.appendChild(li)
    }
  }
}

// Client Side UI Elements

// Hide donate banner
document.getElementById('donate-hide').onclick = () => { 
  document.getElementById('donate').className = 'hide'
}