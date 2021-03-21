
////////////////////////////////////////////////////////////////////////////

// Express
let express = require('express')

// Create app
let app = express()

//Set up server
let server = app.listen(process.env.PORT || 2000, listen);

// Callback function confirming server start
function listen(){
  let host = server.address().address;
  let port = server.address().port;
  console.log('Catchphrase Server Started at http://' + host + ':' + port);
}

// Files for client
app.use(express.static('public'))

// change timeout settings for development
serverSettings = {}
if (process.env.NODE_ENV === 'development')
  serverSettings = {
    pingInterval: 10000,
    pingTimeout: 300000
  }

// Websocket
let io = require('socket.io')(server, serverSettings)

// Catch wildcard socket events
var middleware = require('socketio-wildcard')()
io.use(middleware)

// Daily Server Restart time
// UTC 13:00:00 = 9AM EST
let restartHour = 11//13 original
let restartMinute = 0//0
let restartSecond = 5
// restart warning time
let restartWarningHour = 10//12 original
let restartWarningMinute = 50//50
let restartWarningSecond = 2

////////////////////////////////////////////////////////////////////////////

// Catchphrase Game
const Game = require('./server/game.js')

// Objects to keep track of sockets, rooms and players
let SOCKET_LIST = {}
let ROOM_LIST = {}
let PLAYER_LIST = {}

// string constant
let ROLE_GUESSER = 'guesser';
let ROLE_SPEAKER = 'speaker';
let TEAM_BLUE = 'blue';
let TEAM_RED = 'red';

// Room class
// Live rooms will have a name and password and keep track of game options / players in room
class Room {
  constructor(name, pass){
    this.room = '' + name
    this.password = '' + pass
    this.players = {}
    this.game = new Game()
    this.lastPlayers = []

    // Add room to room list
    ROOM_LIST[this.room] = this
  }
}

// Player class
// When players log in, they give a nickname, have a socket and a room they're trying to connect to
class Player {
  constructor(nickname, room, socket){
    this.id = socket.id

    // If someone in the room has the same name, append (1) to their nickname
    let nameAvailable = false
    let nameExists = false;
    let tempName = nickname
    let counter = 0
    while (!nameAvailable){
      if (ROOM_LIST[room]){
        nameExists = false;
        for (let i in ROOM_LIST[room].players){
          if (ROOM_LIST[room].players[i].nickname === tempName) nameExists = true
        }
        if (nameExists) tempName = nickname + "(" + ++counter + ")"
        else nameAvailable = true
      }
    }
    this.nickname = tempName
    this.room = room
    this.team = 'undecided'
    this.order = null
    this.role = ROLE_GUESSER
    this.timeout = 2100         // # of seconds until kicked for afk (35min)
    this.afktimer = this.timeout       

    // Add player to player list and add their socket to the socket list
    PLAYER_LIST[this.id] = this
  }

  // When a player joins a room, evenly distribute them to a team
  joinTeam(){
    let room = ROOM_LIST[this.room]
    let numInRoom = Object.keys(room.players).length

    if (numInRoom % 2 === 0) this.team = TEAM_BLUE
    else this.team = TEAM_RED
    this.order = Math.floor((numInRoom - 1) / 2)
  }
}


// Server logic
////////////////////////////////////////////////////////////////////////////
io.sockets.on('connection', function(socket){

  // Alert server of the socket connection
  SOCKET_LIST[socket.id] = socket
  logStats('CONNECT: ' + socket.id)

  // Pass server stats to client
  socket.emit('serverStats', {
    players: Object.keys(PLAYER_LIST).length,
    rooms: Object.keys(ROOM_LIST).length
  })

  // LOBBY STUFF
  ////////////////////////////////////////////////////////////////////////////

  // Room Creation. Called when client attempts to create a rooom
  // Data: player nickname, room name, room password
  socket.on('createRoom', (data) => {createRoom(socket, data)})

  // Room Joining. Called when client attempts to join a room
  // Data: player nickname, room name, room password
  socket.on('joinRoom', (data) => {joinRoom(socket, data)})
  
  // Room Leaving. Called when client leaves a room
  socket.on('leaveRoom', () =>{leaveRoom(socket)})

  // Client Disconnect
  socket.on('disconnect', () => {socketDisconnect(socket)})


  // GAME STUFF
  ////////////////////////////////////////////////////////////////////////////

  // Join Team. Called when client joins a team (red / blue)
  // Data: team color
  socket.on('joinTeam', (data) => {
    if (!PLAYER_LIST[socket.id]) return   // Prevent Crash
    let player = PLAYER_LIST[socket.id];  // Get player who made request
    player.team = data.team               // Update their team
    gameUpdate(player.room)               // Update the game for everyone in their room
  })

  // Randomize Team. Called when client randomizes the teams
  socket.on('randomizeTeams', () => {randomizeTeams(socket)})

  // New Game. Called when client starts a new game
  socket.on('newGame', () =>{newGame(socket)})

  // skip the current word
  socket.on('skipWord', () => {skipWord(socket)})

  // change word and pass to the next player
  socket.on('nextPlayer', () => {nextPlayer(socket)})

  // start or stop the current round
  socket.on('startStop', () => {startStop(socket)})

  // update score
  socket.on('updateScore', (data) => {updateScore(socket, data)})

  // Active. Called whenever client interacts with the game, resets afk timer
  socket.on('*', () => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    PLAYER_LIST[socket.id].afktimer = PLAYER_LIST[socket.id].timeout
  })

  // Change card packs
  socket.on('changeCards', (data) => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    let room = PLAYER_LIST[socket.id].room  // Get the room the client was in
    let game = ROOM_LIST[room].game
    let list = data.pack

    if (game.useLists.includes(list)) {
      game.useLists.splice(game.useLists.indexOf(list), 1)
    } else {
      game.useLists.push(data.pack)
    }

    game.updateWordPool()
    gameUpdate(room)
  })

  // Change timer slider
  socket.on('timerSlider', (data) => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    let room = PLAYER_LIST[socket.id].room  // Get the room the client was in
    let game = ROOM_LIST[room].game
    let currentAmount = game.timerAmount - 1  // Current timer amount
    let seconds = (data.value * 60) + 1       // the new amount of the slider
    if (currentAmount !== seconds){           // if they dont line up, update clients
      game.timerAmount = seconds
      game.timer = game.timerAmount
      gameUpdate(room)
    }
  })
})

// Create room function
// Gets a room name and password and attempts to make a new room if one doesn't exist
// On creation, the client that created the room is created and added to the room
function createRoom(socket, data){
  let roomName = data.room.trim()     // Trim whitespace from room name
  let passName = data.password.trim() // Trim whitespace from password
  let userName = data.nickname.trim() // Trim whitespace from nickname

  if (ROOM_LIST[roomName]) {   // If the requested room name is taken
    // Tell the client the room arleady exists
    socket.emit('createResponse', {success:false, msg:'Room Already Exists'})
  } else {
    if (roomName === "") {    
      // Tell the client they need a valid room name
      socket.emit('createResponse', {success:false, msg:'Enter A Valid Room Name'})
    } else {
      if (userName === ''){
        // Tell the client they need a valid nickname
        socket.emit('createResponse', {success:false, msg:'Enter A Valid Nickname'})
      } else {    // If the room name and nickname are both valid, proceed
        new Room(roomName, passName)                          // Create a new room
        let player = new Player(userName, roomName, socket)   // Create a new player
        ROOM_LIST[roomName].players[socket.id] = player       // Add player to room
        player.joinTeam()                                     // Distribute player to team
        socket.emit('createResponse', {success:true, msg: ""})// Tell client creation was successful
        gameUpdate(roomName)                                  // Update the game for everyone in this room
        logStats(socket.id + "(" + player.nickname + ") CREATED '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")
      }
    }
  }
}

// Join room function
// Gets a room name and poassword and attempts to join said room
// On joining, the client that joined the room is created and added to the room
function joinRoom(socket, data){
  let roomName = data.room.trim()     // Trim whitespace from room name
  let pass = data.password.trim()     // Trim whitespace from password
  let userName = data.nickname.trim() // Trim whitespace from nickname

  if (!ROOM_LIST[roomName]){
    // Tell client the room doesnt exist
    socket.emit('joinResponse', {success:false, msg:"Room Not Found"})
  } else {
    if (ROOM_LIST[roomName].password !== pass){ 
      // Tell client the password is incorrect
      socket.emit('joinResponse', {success:false, msg:"Incorrect Password"})
    } else {
      if (userName === ''){
        // Tell client they need a valid nickname
        socket.emit('joinResponse', {success:false, msg:'Enter A Valid Nickname'})
      } else {  // If the room exists and the password / nickname are valid, proceed
        let player = new Player(userName, roomName, socket)   // Create a new player
        ROOM_LIST[roomName].players[socket.id] = player       // Add player to room
        player.joinTeam()                                     // Distribute player to team
        socket.emit('joinResponse', {success:true, msg:""})   // Tell client join was successful
        gameUpdate(roomName)                                  // Update the game for everyone in this room
        // Server Log
        logStats(socket.id + "(" + player.nickname + ") JOINED '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")
      }
    }
  }
}

// Leave room function
// Gets the client that left the room and removes them from the room's player list
function leaveRoom(socket){
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let player = PLAYER_LIST[socket.id]              // Get the player that made the request
  delete PLAYER_LIST[player.id]                    // Delete the player from the player list
  delete ROOM_LIST[player.room].players[player.id] // Remove the player from their room
  gameUpdate(player.room)                          // Update everyone in the room
  // Server Log
  logStats(socket.id + "(" + player.nickname + ") LEFT '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")
  
  // If the number of players in the room is 0 at this point, delete the room entirely
  if (Object.keys(ROOM_LIST[player.room].players).length === 0) {
    delete ROOM_LIST[player.room]
    logStats("DELETE ROOM: '" + player.room + "'")
  }
  socket.emit('leaveResponse', {success:true})     // Tell the client the action was successful
}

// Disconnect function
// Called when a client closes the browser tab
function socketDisconnect(socket){
  let player = PLAYER_LIST[socket.id] // Get the player that made the request
  delete SOCKET_LIST[socket.id]       // Delete the client from the socket list
  delete PLAYER_LIST[socket.id]       // Delete the player from the player list

  if(player){   // If the player was in a room
    delete ROOM_LIST[player.room].players[socket.id] // Remove the player from their room
    gameUpdate(player.room)                          // Update everyone in the room
    // Server Log
    logStats(socket.id + "(" + player.nickname + ") LEFT '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")
    
    // If the number of players in the room is 0 at this point, delete the room entirely
    if (Object.keys(ROOM_LIST[player.room].players).length === 0) {
      delete ROOM_LIST[player.room]
      logStats("DELETE ROOM: '" + player.room + "'")
    }
  }
  // Server Log
  logStats('DISCONNECT: ' + socket.id)
}


// Randomize Teams function
// Will mix up the teams in the room that the client is in
function randomizeTeams(socket){
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let room = PLAYER_LIST[socket.id].room   // Get the room that the client called from
  let players = ROOM_LIST[room].players    // Get the players in the room

  let color = 0;    // Get a starting color
  if (Math.random() < 0.5) color = 1

  let keys = Object.keys(players) // Get a list of players in the room from the dictionary
  let placed = []                 // Init a temp array to keep track of who has already moved
  
  while (placed.length < keys.length){
    let selection = keys[Math.floor(Math.random() * keys.length)] // Select random player index
    if (!placed.includes(selection)) placed.push(selection) // If index hasn't moved, move them
  }

  // Place the players in alternating teams from the new random order
  for (let i = 0; i < placed.length; i++){
    let player = players[placed[i]]
    if (color === 0){
      player.team = 'red'
      color = 1
    } else {
      player.team = 'blue'
      color = 0
    }
    player.order = Math.floor(i / 2)
  }
  gameUpdate(room) // Update everyone in the room
}

// New game function
// Gets client that requested the new game and instantiates a new game board for the room
function newGame(socket){
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let room = PLAYER_LIST[socket.id].room  // Get the room that the client called from
  ROOM_LIST[room].game.init();      // Make a new game for that room

  // Make everyone in the room a guesser and tell their client the game is new
  for(let player in ROOM_LIST[room].players){
    PLAYER_LIST[player].role = ROLE_GUESSER;
    SOCKET_LIST[player].emit('switchRole', {role: ROLE_GUESSER})
    SOCKET_LIST[player].emit('newGameResponse', {success:true})
  }
  gameUpdate(room) // Update everyone in the room
}

// skips the current word
function skipWord(socket){
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let room = PLAYER_LIST[socket.id].room  // Get the room that the client called from

  if (PLAYER_LIST[socket.id].team === ROOM_LIST[room].game.turn){ // If it was this players turn
    if (!ROOM_LIST[room].game.over){  // If the game is not over
      if (PLAYER_LIST[socket.id].role !== ROLE_GUESSER) { // If the client isnt a guesser
        ROOM_LIST[room].game.newWord()
        gameUpdate(room)  // Update everyone in the room
      }
    }
  }
}

// pass to the next player
function nextPlayer(socket) {
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let room = PLAYER_LIST[socket.id].room

  if (PLAYER_LIST[socket.id].team === ROOM_LIST[room].game.turn) {
    if (!ROOM_LIST[room].game.over) {
      if (PLAYER_LIST[socket.id].role !== ROLE_GUESSER) {
        ROOM_LIST[room].game.newWord()

        let nextTeam = TEAM_BLUE
        if (PLAYER_LIST[socket.id].team === nextTeam) nextTeam = TEAM_RED

        let players = getPlayers(room, nextTeam)

        let next = players[(ROOM_LIST[room].lastPlayers.shift() || 0) + 1]
        if (next === undefined) next = players[0]
        if (next === undefined) {
          gameUpdate(room)
          return
        }

        ROOM_LIST[room].lastPlayers.push(PLAYER_LIST[socket.id].order)

        PLAYER_LIST[next].role = ROLE_SPEAKER
        switchRole(next)

        PLAYER_LIST[socket.id].role = ROLE_GUESSER
        switchRole(socket.id)

        ROOM_LIST[room].game.switchTurn()

        gameUpdate(room)
      }
    }
  }
}

// start or stop the round
function startStop(socket) {
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let room = PLAYER_LIST[socket.id].room  // Get the room that the client called from

  if (ROOM_LIST[room].game.timeRunning) {
    ROOM_LIST[room].game.timeRunning = false
    gameUpdate(room)
  } else {
    for (let player in ROOM_LIST[room].players) {
      PLAYER_LIST[player].role = ROLE_GUESSER
      switchRole(player)
    }

    PLAYER_LIST[socket.id].role = ROLE_SPEAKER
    switchRole(socket.id)

    ROOM_LIST[room].game.timer = ROOM_LIST[room].game.timerAmount
    ROOM_LIST[room].game.turn = PLAYER_LIST[socket.id].team
    ROOM_LIST[room].game.timeRunning = true
    ROOM_LIST[room].game.roundOver = false
    ROOM_LIST[room].game.newWord()

    gameUpdate(room)
  }
}

// update the score
function updateScore(socket, data) {
  if (!PLAYER_LIST[socket.id]) return
  let room = PLAYER_LIST[socket.id].room

  ROOM_LIST[room].game.roundOver = false
  if (ROOM_LIST[room].game.turn === TEAM_RED) ROOM_LIST[room].game.blue += data.score
  else ROOM_LIST[room].game.red += data.score

  ROOM_LIST[room].game.checkWin()

  gameUpdate(room)
}

// Get a list of players on a team
function getPlayers(room, team) {
  let teamPlayers = []

  for (let player in ROOM_LIST[room].players) {
    if (PLAYER_LIST[player].team === team) teamPlayers[PLAYER_LIST[player].order] = PLAYER_LIST[player].id
  }
  return teamPlayers
}

// Switch role function
function switchRole(player){
  if (!SOCKET_LIST[player]) return
  SOCKET_LIST[player].emit('switchRole' , {role: PLAYER_LIST[player].role});
  gameUpdate(PLAYER_LIST[player].room)                   // Update everyone in the room
}

// Update the gamestate for every client in the room that is passed to this function
function gameUpdate(room){
  // Create data package to send to the client
  let gameState = {
    room: room,
    players: ROOM_LIST[room].players,
    game: ROOM_LIST[room].game,
  }
  for (let player in ROOM_LIST[room].players){ // For everyone in the passed room
    gameState.team = PLAYER_LIST[player].team  // Add specific clients team info
    SOCKET_LIST[player].emit('gameState', gameState)  // Pass data to the client
  }
}

function logStats(addition){
  let inLobby = Object.keys(SOCKET_LIST).length - Object.keys(PLAYER_LIST).length
  let stats = '[R:' + Object.keys(ROOM_LIST).length + " P:" + Object.keys(PLAYER_LIST).length + " L:" + inLobby + "] "
  console.log(stats + addition)
}

// Restart Server
function serverRestart(){
  // Let each socket know the server restarted and boot them to lobby
  for (let socket in SOCKET_LIST){
    SOCKET_LIST[socket].emit('serverMessage', {msg:"Server Successfully Restarted for Maintnence"})
    SOCKET_LIST[socket].emit('leaveResponse', {success:true})
  }
  console.log('Server going down for restart')
  process.exit(0)
}

// Warn users of restart
function serverRestartWarning(){
  for (let player in PLAYER_LIST){
    SOCKET_LIST[player].emit('serverMessage', {msg:"Scheduled Server Restart in 10 Minutes"})
  }
}

// Every second, update the timer in the rooms that are on timed mode
setInterval(()=>{
  // Server Daily Restart Logic
  let time = new Date()
  // Warn clients of restart 10min in advance
  if (time.getHours() === restartWarningHour &&
      time.getMinutes() === restartWarningMinute &&
      time.getSeconds() < restartWarningSecond) serverRestartWarning()
  // Restart server at specified time
  if (time.getHours() === restartHour &&
      time.getMinutes() === restartMinute &&
      time.getSeconds() < restartSecond) serverRestart()
  
  // AFK Logic
  for (let player in PLAYER_LIST){
    PLAYER_LIST[player].afktimer--      // Count down every players afk timer
    // Give them a warning 5min before they get kicked
    if (PLAYER_LIST[player].afktimer < 300) SOCKET_LIST[player].emit('afkWarning')
    if (PLAYER_LIST[player].afktimer < 0) {   // Kick player if their timer runs out
      SOCKET_LIST[player].emit('afkKicked')
      logStats(player + "(" + PLAYER_LIST[player].nickname + ") AFK KICKED FROM '" + ROOM_LIST[PLAYER_LIST[player].room].room + "'(" + Object.keys(ROOM_LIST[PLAYER_LIST[player].room].players).length + ")")
      leaveRoom(SOCKET_LIST[player])
    }
  }
  // Game Timer Logic
  for (let room in ROOM_LIST){
    if (ROOM_LIST[room].game.timeRunning){
      ROOM_LIST[room].game.timer--          // If the room is in timed mode, count timer down

      if (ROOM_LIST[room].game.timer < 0){  // If timer runs out, switch that rooms turn
        ROOM_LIST[room].game.timeRunning = false
        ROOM_LIST[room].game.roundOver = true
        gameUpdate(room)   // Update everyone in the room
      }
      
      // Update the timer value to every client in the room
      for (let player in ROOM_LIST[room].players){
        SOCKET_LIST[player].emit('timerUpdate', {timer:ROOM_LIST[room].game.timer})
      }
    }
  }
}, 1000)
