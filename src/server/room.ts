// Room class
// Live rooms will have a name and password and keep track of game options / players in room
import Game from './game'
import Player from './player'
import { Team } from '../shared/enum'

export default class Room {
    name: string;
    password: string;
    game: Game;
    lastPlayers: string[];
    players: [] = [];
    teamRed: string[] = [];
    teamBlue: string[] = [];

    constructor(name: string, pass: string) {
        this.name = '' + name
        this.password = '' + pass
        this.game = new Game()
        this.lastPlayers = []
    }

    addPlayer(player: Player, team: Team) {
        if (this.players.includes(nickname)) {
            throw Error
        }

        this.players.push(nickname)

        if (team = Team.Blue) {
            this.teamBlue.push(nickname)
        } else {
            this.teamRed.push(nickname)
        }
    }
}
