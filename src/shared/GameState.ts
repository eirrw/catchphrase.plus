import Game from "../server/game";
import Room from "../server/room";

export type GameState = {
    room: Room,
    game: Game
}