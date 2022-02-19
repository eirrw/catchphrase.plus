import { Socket } from 'socket.io';

/**
 * Player class
 * 
 * Holds nickname, socket id, and timeout information
 */
export default class Player {
    static readonly timeout: 1800; // 30 min

    id: string;
    nickname: string;
    afktimer: number;

    constructor(nickname: string, socket: Socket) {
        this.id = socket.id
        this.nickname = nickname
        this.afktimer = Player.timeout
    }
}
