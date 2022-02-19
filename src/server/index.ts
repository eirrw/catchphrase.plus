////////////////////////////////////////////////////////////////////////////
import { appendFile } from 'fs';
import express from 'express';
import { Server, Socket } from 'socket.io';
import Room from './room'
import Player from './player';
import { Role, Team } from '../shared/enum';
import { AddressInfo } from 'node:net';
import { serialize } from 'node:v8';

type SocketStore = { socket: Socket, player?: Player, room?: Room }
type SocketList = Map<string, SocketStore>
type RoomList = Map<string, Room>

// Create server 
const app = express()
const server = app.listen(process.env.PORT || 2000, listen);

// Callback function confirming server start
function listen() {
    let address = server.address() as AddressInfo
    let host = address.address;
    let port = address.port;
    console.log('Catchphrase Server Started at http://' + host + ':' + port);
}

// Files for client
app.use(express.static('public'))

// change timeout settings for development
let serverSettings = {}
if (process.env.NODE_ENV === 'development')
    serverSettings = {
        pingInterval: 10000,
        pingTimeout: 300000
    }

// Websocket
const io: Server = new Server(server, serverSettings)

// Restart setting
const restartConfig = {
    hour: 11,
    minute: 5,
    second: 0,
    warningHour: 11,
    warningMinute: 0,
    warningSecond: 0
}

////////////////////////////////////////////////////////////////////////////

// Objects to keep track of sockets, rooms and players
let SOCKET_LIST: SocketList = new Map()
let ROOM_LIST: RoomList = new Map()

// Server logic
////////////////////////////////////////////////////////////////////////////
io.on('connection', (socket) => {

    // Alert server of the socket connection
    SOCKET_LIST.set(socket.id, { socket: socket })
    logStats('CONNECT: ' + socket.id)

    // Pass server stats to client
    socket.emit('serverStats', {
        players: Object.keys(SOCKET_LIST).length,
        rooms: Object.keys(ROOM_LIST).length
    })

    // LOBBY STUFF
    ////////////////////////////////////////////////////////////////////////////

    // Room Creation. Called when client attempts to create a rooom
    // Data: player nickname, room name, room password
    socket.on('createRoom', (data) => { createRoom(socket, data) })

    // Room Joining. Called when client attempts to join a room
    // Data: player nickname, room name, room password
    socket.on('joinRoom', (data) => { joinRoom(socket, data) })

    // Room Leaving. Called when client leaves a room
    socket.on('leaveRoom', () => { leaveRoom(socket) })

    // Client Disconnect
    socket.on('disconnect', () => { socketDisconnect(socket) })


    // GAME STUFF
    ////////////////////////////////////////////////////////////////////////////

    // Join Team. Called when client joins a team (red / blue)
    // Data: team color
    socket.on('joinTeam', (data) => { joinTeam(socket, data) })

    // Randomize Team. Called when client randomizes the teams
    socket.on('randomizeTeams', () => { randomizeTeams(socket) })

    // New Game. Called when client starts a new game
    socket.on('newGame', () => { newGame(socket) })

    // skip the current word
    socket.on('skipWord', () => { skipWord(socket) })

    // change word and pass to the next player
    socket.on('nextPlayer', () => { nextPlayer(socket) })

    // start or stop the current round
    socket.on('startStop', () => { startStop(socket) })

    // report the current word
    socket.on('report', () => { reportPhrase(socket) })

    // update score
    socket.on('updateScore', (data) => { updateScore(socket, data) })

    // Change card packs
    socket.on('changeCards', (data) => { switchPacks(socket, data) })

    // Change timer slider
    socket.on('timerSlider', (data) => { changeTimer(socket, data) })

    // Active. Called whenever client interacts with the game, resets afk timer
    socket.on('*', () => {
        // if (!SOCKET_LIST.get(socket.id)) return // Prevent Crash
        SOCKET_LIST.get(socket.id).player.afktimer = Player.timeout
    })

})

/**
 * Create room function
 * 
 * Gets a room name and password and attempts to make a new room if one doesn't exist
 * On creation, the client that created the room is created and added to the room
 * 
 * @param socket Socket the connection is coming from
 * @param data Data object included in socket
 */
function createRoom(socket: Socket, data: any) {
    let roomName: string = data.room.trim()
    let password: string = data.password.trim()
    let username: string = data.nickname.trim()

    if (ROOM_LIST.has(roomName)) {
        // If the requested room name is taken
        // Tell the client the room arleady exists
        socket.emit('createResponse', { success: false, msg: 'Room Already Exists' })
        return
    }

    if (roomName === "") {
        // Tell the client they need a valid room name
        socket.emit('createResponse', { success: false, msg: 'Enter A Valid Room Name' })
        return
    }

    if (username === '') {
        // Tell the client they need a valid nickname
        socket.emit('createResponse', { success: false, msg: 'Enter A Valid Nickname' })
    } else {
        // If the room name and nickname are both valid, proceed
        let room = new Room(roomName, password)
        let player = new Player(username, socket)

        // store the room + add player to it
        ROOM_LIST.set(roomName, room)
        socket.join(roomName)
        room.addPlayer(player)

        // store player information
        SOCKET_LIST.get(socket.id).player = player
        SOCKET_LIST.get(socket.id).room = room

        // report success
        socket.emit('createResponse', { success: true, msg: "" })
        gameUpdate(room)
        logStats(socket.id + "(" + player.nickname + ") CREATED '" + room.name)
    }
}

/**
 * Join room function
 * Gets a room name and password and attempts to join said room
 * On joining, the client that joined the room is created and added to the room
 * 
 * @param socket 
 * @param data 
 */
function joinRoom(socket: Socket, data: any) {
    let roomName: string = data.room.trim()
    let password: string = data.password.trim()
    let username: string = data.nickname.trim()

    if (!ROOM_LIST.has(roomName)) {
        // Tell client the room doesnt exist
        socket.emit('joinResponse', { success: false, msg: "Room Not Found" })
        return
    }

    if (ROOM_LIST.get(roomName).password !== password) {
        // Tell client the password is incorrect
        socket.emit('joinResponse', { success: false, msg: "Incorrect Password" })
        return
    }

    if (username === '') {
        // Tell client they need a valid nickname
        socket.emit('joinResponse', { success: false, msg: 'Enter A Valid Nickname' })
    } else {
        let player = new Player(username, socket)
        let room = ROOM_LIST.get(roomName)

        // add player to room
        room.addPlayer(player)
        socket.join(room.name)
        
        // store player information
        SOCKET_LIST.get(socket.id).player = player
        SOCKET_LIST.get(socket.id).room = room

        // Server Log
        socket.emit('joinResponse', { success: true, msg: "" })
        gameUpdate(room)
        logStats(socket.id + "(" + player.nickname + ") JOINED '" + room.name + "'(" + room.getPlayerCount() + ")")
    }
}

/**
 * Leave room function
 * Gets the client that left the room and removes them from the room's player list
 * 
 * @param socket Socket of the incoming connection
 */
function leaveRoom(socket: Socket) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    // Get the player that made the request
    let player = SOCKET_LIST.get(socket.id).player
    let room = SOCKET_LIST.get(socket.id).room

    room.removePlayer(player)
    delete SOCKET_LIST.get(socket.id).player
    delete SOCKET_LIST.get(socket.id).room

    // Update everyone in the room
    gameUpdate(room)
    // Server Log
    logStats(socket.id + "(" + player.nickname + ") LEFT '" + room.name + "'(" + room.getPlayerCount() + ")")

    // If the number of players in the room is 0 at this point, delete the room entirely
    if (room.getPlayerCount() === 0) {
        ROOM_LIST.delete(room.name)
        logStats("DELETE ROOM: '" + room.name + "'")
    }

    // Tell the client the action was successful
    socket.emit('leaveResponse', { success: true })
}

/**
 * Disconnect function    
 * Called when a client closes the browser tab
 * 
 * @param socket Socket of the incoming connection
 */
function socketDisconnect(socket: Socket) {
    let player = SOCKET_LIST.get(socket.id).player
    let room = SOCKET_LIST.get(socket.id).room

    // Delete the client from the socket list
    SOCKET_LIST.delete(socket.id)

    // If the player was in a room
    if (player) {
        room.removePlayer(player)           // Remove the player from their room
        gameUpdate(room)                    // Update everyone in the room

        // Server Log
        logStats(socket.id + "(" + player.nickname + ") LEFT '" + room.name + "'(" + room.getPlayerCount() + ")")

        // If the number of players in the room is 0 at this point, delete the room entirely
        if (room.getPlayerCount() === 0) {
            ROOM_LIST.delete(room.name)
            logStats("DELETE ROOM: '" + room.name + "'")
        }
    }
    // Server Log
    logStats('DISCONNECT: ' + socket.id)
}

/**
 * 
 * @param socket 
 */
function joinTeam(socket: Socket, data: any) {
    // if (!PLAYER_LIST.get(socket.id)) return   // Prevent Crash

    let player = SOCKET_LIST.get(socket.id).player;
    let room = SOCKET_LIST.get(socket.id).room;

    room.joinTeam(player, data.team)

    gameUpdate(room)
}

/**
 * Randomize Teams function
 * Will mix up the teams in the room that the client is in
 * 
 * @param socket Socket of the incoming connection
 */
function randomizeTeams(socket: Socket) {
    // if (!PLAYER_LIST.get(socket.id)) return      // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room   // Get the room that the client called from

    room.randomizeTeams()

    gameUpdate(room) // Update everyone in the room
}

/**
 * New game function
 * Reset game state for the caller's room
 * 
 * @param socket Socket of the incoming connection
 */
function newGame(socket: Socket) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room
    room.game.init();

    switchRole(room, Role.Guesser)
    gameUpdate(room)
}

/**
 * Skips the current phrase 
 * 
 * @param socket Socket of the incoming connection
 */
function skipWord(socket: Socket) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room
    let player = SOCKET_LIST.get(socket.id).player

    // If it was this players turn & the game is not over
    if (player === room.game.currentSpeaker) {
        if (!room.game.over) {
            room.game.newWord()
            gameUpdate(room)
        }
    }
}

/**
 * Pass turn to the next player
 * 
 * @param socket Socket of the incoming connection
 */
function nextPlayer(socket: Socket) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room
    let player = SOCKET_LIST.get(socket.id).player

    if (
        room.hasPlayer(player, room.game.turn) 
        && player === room.game.currentSpeaker
        && !room.game.over
    ) {
        // get new word if in game
        if (room.game.timeRunning) room.game.newWord()

        // get next player from list
        let nextSpeaker = room.getNextPlayer(room.game.previousSpeaker)

        // set the next player as speaker
        room.game.previousSpeaker = room.game.currentSpeaker
        room.game.currentSpeaker = nextSpeaker

        // update players
        switchRole(room.game.currentSpeaker, Role.Speaker)
        switchRole(room.game.previousSpeaker, Role.Guesser)

        // switch turns
        room.game.switchTurn()

        gameUpdate(room)
    }
}

/**
 * Starts/stops the round
 * 
 * @param socket Socket of the incoming connection
 */
function startStop(socket: Socket) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room

    if (room.game.timeRunning) {
        room.game.timeRunning = false
        gameUpdate(room)
    } else {
        switchRole(room, Role.Guesser)

        let player = SOCKET_LIST.get(socket.id).player
        room.game.previousSpeaker = room.game.currentSpeaker
        room.game.currentSpeaker = player
        switchRole(player, Role.Speaker)

        room.game.timer = room.game.timerStart
        room.game.turn = room.getTeamForPlayer(player)
        room.game.timeRunning = true
        room.game.roundOver = false
        room.game.newWord()

        gameUpdate(room)
    }
}

/**
 * Logs reported phrase to file
 * 
 * @param socket Socket of the incoming connection
 */
function reportPhrase(socket: Socket) {
    let room = SOCKET_LIST.get(socket.id).room
    let phrase = room.game.currentPhrase
    appendFile('./reported-phrases', phrase + '\n', (err) => {
        if (err) throw err
        console.log('logged reported phrase: ' + phrase)
    })
}

/**
 * Update the current score and check for win
 * 
 * @param socket Socket of the incoming connection
 * @param data Data sent by caller
 */
function updateScore(socket: Socket, data: any) {
    // if (!PLAYER_LIST.get(socket.id)) return
    let room = SOCKET_LIST.get(socket.id).room

    room.game.roundOver = false
    if (room.game.turn === Team.Red) {
        room.game.scoreBlue += data.score
    } else {
        room.game.scoreRed += data.score
    }

    room.game.checkWin()

    gameUpdate(room)
}

/**
 * Updates the role of the specified client
 * 
 * @param client Client to update. Player to update that player, or Room to update entire room
 * @param role Role to set client to
 */
function switchRole(client: Player|Room, role: Role) {
    // if (!SOCKET_LIST.get(player)) return
    if (client instanceof Player) {
        SOCKET_LIST.get(client.id).socket.emit('switchRole', { role: role })
    } else {
        io.to(client.name).emit('switchRole', { role: role })
    }
}

/**
 * Update which packs are currently selected
 * 
 * @param socket Socket of the incoming connection
 * @param data Information from the socket
 */
function switchPacks(socket: Socket, data: any) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room
    let game = room.game
    let list = data.pack

    if (game.selectedLists.includes(list)) {
        game.selectedLists.splice(game.selectedLists.indexOf(list), 1)
    } else {
        game.selectedLists.push(data.pack)
    }

    game.updateWordPool()
    gameUpdate(room)
}

/**
 * Update the timer length to a new value
 * 
 * @param socket Socket of the incoming connection
 * @param data Data passed from the caller
 */
function changeTimer(socket:Socket, data: any) {
    // if (!PLAYER_LIST.get(socket.id)) return // Prevent Crash
    let room = SOCKET_LIST.get(socket.id).room
    let currentAmount = room.game.timerStart - 1  // Current timer amount
    let seconds = (data.value * 60) + 1       // the new amount of the slider
    if (currentAmount !== seconds) {           // if they dont line up, update clients
        room.game.timerStart = seconds
        room.game.timer = room.game.timerStart
        gameUpdate(room)
    }
}

/**
 * Update the gamestate for every client in the room that is passed to this function
 * 
 * @param room Room to update
 */
function gameUpdate(room: Room) {
    // Create data package to send to the client
    let gameState = room 

    io.in(room.name).emit('gameState', gameState)
}

/**
 * Print line to log
 * 
 * @param extraInfo Extra info to be appended to the log line 
 */
function logStats(extraInfo: string) {
    let stats = '[R:' + Object.keys(ROOM_LIST).length + "  C:" + Object.keys(SOCKET_LIST).length + '] '
    console.log(stats + extraInfo)
}

// Restart Server
function serverRestart() {
    // Let each socket know the server restarted and boot them to lobby
    for (let roomName of ROOM_LIST.keys()) {
        io.to(roomName).emit('serverMessage', { msg: "Server Successfully Restarted for Maintnence" })
        io.to(roomName).emit('leaveResponse', { success: true })
    }
    console.log('Server going down for restart')
    process.exit(0)
}

// Warn users of restart
function serverRestartWarning() {
    for (let roomName in ROOM_LIST.keys()) {
        io.to(roomName).emit('serverMessage', { msg: "Scheduled Server Restart in 10 Minutes" })
    }
}

// Every second, update the timer in the rooms that are on timed mode
setInterval(() => {
    // Server Daily Restart Logic
    let time = new Date()
    if (time.getHours() === restartConfig.warningHour &&
        time.getMinutes() === restartConfig.warningMinute &&
        time.getSeconds() < restartConfig.warningSecond) serverRestartWarning()
    // Restart server at specified time
    if (time.getHours() === restartConfig.hour &&
        time.getMinutes() === restartConfig.minute &&
        time.getSeconds() < restartConfig.second) serverRestart()

    // AFK Logic
    for (let [id, store] of SOCKET_LIST) {
        if (store.player === undefined) continue 
        let player = store.player
        
        player.afktimer--      // Count down every players afk timer

        // Give them a warning 5min before they get kicked
        if (player.afktimer < 300) store.socket.emit('afkWarning')
        if (player.afktimer < 0) {   // Kick player if their timer runs out
            store.socket.emit('afkKicked')
            logStats(player + "(" + player.nickname + ") AFK KICKED FROM '" + store.room.name + "'(" + store.room.getPlayerCount + ")")
            leaveRoom(store.socket)
        }
    }

    // Game Timer Logic
    for (let room of ROOM_LIST.values()) {
        if (room.game.timeRunning) {
            room.game.timer--

            // If timer runs out, end the round
            if (room.game.timer <= 0) {
                room.game.timeRunning = false
                room.game.roundOver = true
                gameUpdate(room)   // Update everyone in the room
            }

            // Update the timer value to every client in the room
            io.to(room.name).emit('timerUpdate', { timer: room.game.timer })
        }
    }
}, 1000) // every second
