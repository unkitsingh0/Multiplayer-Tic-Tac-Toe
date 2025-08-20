import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3001");

export default function App() {
  const [roomCode, setRoomCode] = useState("");
  const [role, setRole] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(""));
  const [turn, setTurn] = useState("X");
  const [status, setStatus] = useState("idle");
  const [winner, setWinner] = useState(null);
  const [inputCode, setInputCode] = useState("");
  const [winCounts, setWinCounts] = useState({ X: 0, O: 0 });

  useEffect(() => {
    socket.on("roomCreated", ({ code, role }) => {
      setRoomCode(code);
      setRole(role);
      setStatus("waiting");
    });

    socket.on("roomJoined", ({ code, role }) => {
      setRoomCode(code);
      setRole(role);
      setStatus("playing");
    });

    socket.on("gameUpdate", (room) => {
      console.log("Game update:", room);
      setBoard(room.board);
      setTurn(room.turn);
      setStatus(room.status);
      setWinner(room.winner || null);
      setWinCounts(room.winCounts);
    });

    socket.on("playerDisconnected", () => {
      alert("Your opponent has disconnected. Returning to the main menu.");
      setRoomCode("");
      setRole(null);
      setBoard(Array(9).fill(""));
      setTurn("X");
      setStatus("idle");
      setWinner(null);
      setInputCode("");
      setWinCounts({ X: 0, O: 0 });
    });

    socket.on("errorMsg", (msg) => alert(msg));

    return () => {
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("gameUpdate");
      socket.off("errorMsg");
      socket.off("playerDisconnected");
    };
  }, []);

  const handleMove = (idx) => {
    if (status !== "playing" || turn !== role || board[idx]) return;
    socket.emit("makeMove", { code: roomCode, idx, role });
  };

  const resetGame = () => {
    socket.emit("resetGame", roomCode);
  };

  return (
    <div className="app-container">
      <h1>🎮 Tic Tac Toe</h1>

      {status === "idle" && (
        <div className="start-screen">
          <button onClick={() => socket.emit("createRoom")}>Create Room</button>
          <div className="join-container">
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Enter room code"
            />
            <button onClick={() => socket.emit("joinRoom", inputCode)}>Join</button>
          </div>
        </div>
      )}

      {status === "waiting" && (
        <div className="waiting-screen">
          <h2>Room Code: {roomCode}</h2>
          <p>Share this code with a friend to join.</p>
        </div>
      )}

      {(status === "playing" || status === "finished") && (
        <div className="game-container">
          <h2>Room: {roomCode}</h2>
          <h3>You are: {role}</h3>
          <h3>Turn: {turn}</h3>

          <div className="score-board">
            <h3>X Wins: {winCounts.X}</h3>
            <h3>O Wins: {winCounts.O}</h3>
          </div>

          {winner && (
            <h2 className={`finished-message ${winner === "draw" ? "draw" : ""}`}>
              {winner === "draw" ? "It's a Draw!" : `Winner: ${winner}`}
            </h2>
          )}

          <div className="board">
            {board.map((cell, idx) => (
              <div
                key={idx}
                onClick={() => handleMove(idx)}
                className={`cell ${cell ? cell.toLowerCase() : ""}`}
              >
                {cell}
              </div>
            ))}
          </div>

          {status === "finished" && (
            <button className="reset-button" onClick={resetGame}>
              🔄 Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}