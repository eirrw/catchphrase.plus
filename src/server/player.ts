import { Team, Role } from '../shared/enum'

// Player class
// When players log in, they give a nickname, have a socket and a room they're trying to connect to
export default class Player {
    id: string;
    nickname: string;
    room: string;
    team: Team;
    order: number | null;
    role: string;
    timeout: number;
    afktimer: number;

    constructor(nickname: string, roomName: string, socket: SocketIO.Socket) {
        this.id = socket.id

        // If someone in the room has the same name, append (1) to their nickname
        let nameAvailable = false
        let nameExists = false;
        let tempName = nickname
        let counter = 0
        while (!nameAvailable) {
            if (ROOM_LIST[roomName]) {
                nameExists = false;
                for (let i in ROOM_LIST[roomName].players) {
                    if (ROOM_LIST[roomName].players[i].nickname === tempName) nameExists = true
                }
                if (nameExists) tempName = nickname + "(" + ++counter + ")"
                else nameAvailable = true
            }
        }
        this.nickname = tempName
        this.room = roomName
        this.team = Team.Undecided
        this.order = null
        this.role = Role.Guesser
        this.timeout = 2100         // # of seconds until kicked for afk (35min)
        this.afktimer = this.timeout

        // Add player to player list and add their socket to the socket list
        PLAYER_LIST[this.id] = this
    }

    // When a player joins a room, evenly distribute them to a team
    joinTeam() {
        let room = ROOM_LIST[this.room]
        let numInRoom = Object.keys(room.players).length

        if (numInRoom % 2 === 0) this.team = TEAM_BLUE
        else this.team = TEAM_RED
        this.order = Math.floor((numInRoom - 1) / 2)
    }
}
