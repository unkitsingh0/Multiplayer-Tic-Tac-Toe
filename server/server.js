import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {};

function createEmptyBoard() {
  return Array(9).fill("");
}

function checkWinner(board) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(x => x)) return "draw";
  return null;
}

io.on("connection", (socket) => {
  console.log("New connection", socket.id);

  socket.on("createRoom", () => {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[code] = {
      board: createEmptyBoard(),
      turn: "X",
      players: { X: socket.id, O: null },
      status: "waiting",
      winner: null,
      winCounts: { X: 0, O: 0 }
    };
    socket.join(code);
    socket.emit("roomCreated", { code, role: "X" });
  });

  socket.on("joinRoom", (code) => {
    const room = rooms[code];
    if (!room) return socket.emit("errorMsg", "Room not found");
    if (room.players.O) return socket.emit("errorMsg", "Room full");

    room.players.O = socket.id;
    room.status = "playing";
    socket.join(code);

    socket.emit("roomJoined", { code, role: "O" });
    io.to(room.players.X).emit("roomJoined", { code, role: "X" });

    io.to(code).emit("gameUpdate", room);
  });

  socket.on("makeMove", ({ code, idx, role }) => {
    const room = rooms[code];
    if (!room || room.status !== "playing") return;
    if (room.turn !== role) return;
    if (room.board[idx]) return;

    room.board[idx] = role;
    const winner = checkWinner(room.board);
    if (winner) {
      room.status = "finished";
      room.winner = winner;
      if (winner !== "draw") {
        room.winCounts[winner]++;
      }
    } else {
      room.turn = role === "X" ? "O" : "X";
    }
    io.to(code).emit("gameUpdate", room);
  });

  socket.on("resetGame", (code) => {
    const room = rooms[code];
    if (!room) return;
    room.board = createEmptyBoard();
    room.turn = "X";
    room.status = "playing";
    room.winner = null;
    io.to(code).emit("gameUpdate", room);
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      let opponentId = null;

      if (room.players.X === socket.id) {
        room.players.X = null;
        opponentId = room.players.O;
      }
      if (room.players.O === socket.id) {
        room.players.O = null;
        opponentId = room.players.X;
      }

      if (opponentId) {
        io.to(opponentId).emit("playerDisconnected");
      }

      if (!room.players.X && !room.players.O) {
        delete rooms[code];
      }
    }
  });
});

server.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});