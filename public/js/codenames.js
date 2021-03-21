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
let categories = document.getElementById('category-select')
// Buttons
let leaveRoom = document.getElementById('leave-room')
let joinRed = document.getElementById('join-red')
let joinBlue = document.getElementById('join-blue')
let randomizeTeams = document.getElementById('randomize-teams')
let newGame = document.getElementById('new-game')
let buttonSkipWord = document.getElementById('skip')
let buttonNextPlayer = document.getElementById('next')
let buttonStartStop = document.getElementById('start-stop')
let buttonAbout = document.getElementById('about-button')
let buttonMute = document.getElementById('mute-button')
let buttonAfk = document.getElementById('not-afk')
let buttonServerMessageOkay = document.getElementById('server-message-okay')
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
let scorePanel = document.getElementById('scoring-row')
// Audio Control
let audioTick = 'audio/tick.wav'
let audioRing = 'audio/ring.wav'
let audioControl = new Audio(audioTick)
let audioInterval = 1234;


// init
////////////////////////////////////////////////////////////////////////////
// Default game settings
let playerRole = 'guesser'
let timeRunning = false

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

// skip the current word
function skipWord(){
  socket.emit('skipWord', {})
}

// pass to the next player
function nextPlayer() {
  socket.emit('nextPlayer', {})
}

// start or stop the round/timer
function startStop() {
  socket.emit('startStop', {})
}

// update the score for the opposite team
function updateScore(score) {
  socket.emit('updateScore', {score: score})
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
categories.addEventListener('click', (e) => {
  if (!e.target.matches('button')) return
  socket.emit('changeCards', {pack:e.target.value})
})

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
  updateTimer(data.timer)
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

socket.on('gameState', (data) =>{       // Response to gamestate update
  updateInfo(data.game, data.team)      // Update the games turn information
  updateTimerSlider(data.game)          // Update the games timer slider
  updatePacks(data.game)                // Update the games pack information
  updateBoard(                          // Update the board display
      data.game,
      data.team
  )
  updatePlayerlist(data.players)        // Update the player list for the room
})

// Utility Functions
////////////////////////////////////////////////////////////////////////////

// Update the game info displayed to the client
function updateInfo(game){
  scoreBlue.innerHTML = game.blue                         // Update the blue tiles left
  scoreRed.innerHTML = game.red                           // Update the red tiles left
  turnMessage.innerHTML = game.turn + "'s turn"           // Update the turn msg
  turnMessage.className = game.turn                       // Change color of turn msg

  let disableButtons = playerRole !== 'speaker'           // set default control status
  buttonSkipWord.disabled = disableButtons
  buttonNextPlayer.disabled = disableButtons
  buttonStartStop.disabled = false

  if (!scorePanel.classList.contains('hidden')) scorePanel.classList.add('hidden')

  if (game.over){                                         // Display winner
    turnMessage.innerHTML = game.winner + " wins!"
    turnMessage.className = game.winner
    buttonSkipWord.disabled = true
    buttonNextPlayer.disabled = true
    buttonStartStop.disabled = true
    scorePanel.classList.add('hidden')
  } else if (game.roundOver && playerRole === 'speaker') { // display round end controls
    buttonSkipWord.disabled = true
    buttonNextPlayer.disabled = true
    buttonStartStop.disabled = true
    scorePanel.classList.remove('hidden')
  }
}

// Update the clients timer slider
function updateTimerSlider(game){
  timerSlider.value = (game.timerAmount - 1) / 60
  timerSliderLabel.innerHTML = "Timer Length : " + timerSlider.value + "min"
  timerSlider.style.display = 'block'
  timerSliderLabel.style.display = 'block'
}

// Update the pack toggle buttons
function updatePacks(game){
  categories.innerHTML = ''
  game.availLists.forEach(wordlist => {
    e = document.createElement('button')
    e.value = wordlist
    if (game.useLists.includes(wordlist)) e.className = 'enabled'

    t = document.createTextNode(wordlist)
    e.appendChild(t)

    categories.appendChild(e)
  });
  document.getElementById('word-pool').innerHTML = "Word Pool: " + game.words.length
}

// Update the board
function updateBoard(game, team){
  let preWord = ''
  if (game.usedWords.length > 1) {
    preWord = game.usedWords[game.usedWords.length - 2]
  }

  document.getElementById('word').innerHTML = game.word
  document.getElementById('pre-word').innerHTML = preWord

  let notTurn = 'blue'
  if (game.turn === notTurn) notTurn = 'red'

  let wordContainer = document.getElementById('word-container')
  let otherTeamContainer = document.getElementById('other-team-guessing')
  let yourTeamContainer = document.getElementById('your-team-guessing')
  wordContainer.classList.add(game.turn)
  wordContainer.classList.remove(notTurn)

  if (playerRole === 'speaker') {
    wordContainer.classList.remove('hidden')
    yourTeamContainer.classList.add('hidden')
    otherTeamContainer.classList.add('hidden')
  } else {
    wordContainer.classList.add('hidden')
    if (team === game.turn) {
      yourTeamContainer.classList.remove('hidden')
      otherTeamContainer.classList.add('hidden')
    } else {
      yourTeamContainer.classList.add('hidden')
      otherTeamContainer.classList.remove('hidden')
    }
  }

  // handle audio
  if (!timeRunning && game.timeRunning) {
    timeRunning = true
    audioControl.src = audioTick
    audioInterval = setInterval(() => {audioControl.play()}, 500)
  } else if (timeRunning && !game.timeRunning) {
    timeRunning = false
    clearInterval(audioInterval)
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
    if (players[i].role === 'speaker') li.innerText = "[" + players[i].nickname + "]"
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

function updateTimer(timerData) {
  timer.innerHTML = "[" + timerData + "]"

  if (timerData === 0)  {
    clearInterval(audioInterval)
    audioControl.src = audioRing
    audioControl.play()
  }
}

// Client Side UI Elements

function mute() {
  audioControl.muted = !audioControl.muted
  if (audioControl.muted) {
    buttonMute.classList.add('red')
  } else {
    buttonMute.classList.remove('red')
  }
}
