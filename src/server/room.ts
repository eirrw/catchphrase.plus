// Room class
// Live rooms will have a name and password and keep track of game options / players in room
import Game from './game'
import Player from './player'
import { Team } from '../shared/enum'

type PlayerMap = Map<string, Player>

export default class Room {
    name: string
    password: string
    game: Game
    teamRed: PlayerMap
    teamBlue: PlayerMap

    constructor(name: string, pass: string) {
        this.name = name
        this.password = pass
        this.game = new Game()
        this.teamBlue = new Map()
        this.teamRed = new Map()
    }

    addPlayer(player: Player) {
        if (this.hasPlayer(player)) {
            throw Error
        }

        if (Object.keys(this.teamRed).length <= Object.keys(this.teamRed).length) {
            this.teamRed.set(player.id, player)
        } else {
            this.teamBlue.set(player.id, player)
        }
    }

    hasPlayer(player: Player, team?: Team) {
        if (team === Team.Red) {
            return this.teamRed.has(player.id)
        } else if (team === Team.Blue) {
            return this.teamBlue.has(player.id)
        } else {
            return this.teamBlue.has(player.id) || this.teamRed.has(player.id)
        }
    }

    removePlayer(player: Player) {
        this.teamRed.delete(player.id)
        this.teamBlue.delete(player.id)
    }

    /**
     * Gets the total count of player in the room
     * 
     * @returns Number of player in the room
     */
    getPlayerCount(): number {
        return this.teamRed.size + this.teamBlue.size
    }

    /**
     * Returns the next player on the team, in order
     */
    getNextPlayer(player: Player): Player {
        let team: PlayerMap
        if (this.teamBlue.has(player.id)) {
            team = this.teamBlue
        } else {
            team = this.teamRed
        }

        let vals = [...team.keys()]
        let idx = vals.indexOf(player.id)
        let next = vals[idx + 1]
        if (next === undefined) {
            next = vals[0]
        }

        if (next === undefined) {
            return player
        }
        
        return team.get(next)
    }

    /**
     * Returns which team the given player is on
     * 
     * @param player The player to check for
     * @returns the team that the player is on
     */
    getTeamForPlayer(player: Player): Team {
        if (this.hasPlayer(player, Team.Blue)) {
            return Team.Blue
        } else if (this.hasPlayer(player, Team.Red)) {
            return Team.Red
        } else {
            return Team.Undecided
        }
    }

    /**
     * Assign player to the specified team
     * 
     * @param player 
     * @param team 
     */
    joinTeam(player: Player, team: Team) {
        this.removePlayer(player)
        if (team = Team.Blue) {
            this.teamBlue.set(player.id, player)
        } else {
            this.teamRed.set(player.id, player)
        }
    }

    randomizeTeams() {
        let allPlayers = [...this.teamBlue, ...this.teamRed]
        this.teamBlue.clear()
        this.teamRed.clear()

        let placed = [];
        while (placed.length < allPlayers.length) {
            let selection = allPlayers[Math.floor(Math.random() * allPlayers.length)]
            if (!placed.includes(selection)) placed.push(selection)
        }

        placed.forEach((key: number, val) => {
            if (key % 2 === 0) {
                this.teamRed.set(val[0], val[1])
            } else {
                this.teamBlue.set(val[0], val[1])
            }
        })
    }
}
