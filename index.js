const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./db");

const authRoutes = require("./Routes/route");
const interestRoute = require("./Routes/interest");
const languageRoute = require("./Routes/language");
const postRoutes = require("./Routes/post");
const groupRoutes = require("./Routes/group");
const userRoutes = require("./Routes/user");
const middleRoutes = require("./Routes/middle");
const serviceRoute = require("./Routes/service");
const serviceReviewRoutes = require("./Routes/serviceReview");
const chatRoutes=require("./Routes/chat")
const searchRoutes=require("./Routes/search")
const reportRoutes=require("./Routes/report")
const profeesionRoutes=require("./Routes/professions")
const notificationRoutes=require("./Routes/notifications")
const agentRoutes=require("./Routes/agent")
const sudadminRoutes=require("./Routes/subadmin")
const adminRoutes=require("./Routes/admin")
const app = express();
connectDB();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Create HTTP server for socket
const server = http.createServer(app);
console.log("SERVER PID:", process.pid);

// Attach socket.io to HTTP server
const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

// Make io accessible inside controllers via req.app.get("io")
app.set("io", io);

// ----------------- SOCKET EVENTS -----------------
const onlineUsers = {}; 
// structure:
// {
//   userId: Set(socketId)
// }

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  /* ================= JOIN ================= */
  socket.on("join", (userId) => {
    if (!userId) return;

    socket.userId = userId;

    if (!onlineUsers[userId]) {
      onlineUsers[userId] = new Set();
    }

    onlineUsers[userId].add(socket.id);
    socket.join(userId);

    console.log("👤 User online:", userId, [...onlineUsers[userId]]);

    // 🔵 broadcast online users
    io.emit("onlineUsers", Object.keys(onlineUsers));
  });

  /* ================= JOIN GROUP ROOM ================= */
  socket.on("joinGroup", (groupId) => {
    if (!groupId) return;
    socket.join(String(groupId));
  });

  /* ================= LEAVE GROUP ROOM ================= */
  socket.on("leaveGroup", (groupId) => {
    if (!groupId) return;
    socket.leave(String(groupId));
  });

  /* ================= SEND MESSAGE ================= */
  socket.on("sendMessage", (data) => {
    const { receiverId, senderId } = data;

    console.log("📤 Message:", senderId, "->", receiverId);

    // send to receiver sockets
    if (onlineUsers[receiverId]) {
      onlineUsers[receiverId].forEach((sockId) => {
        io.to(sockId).emit("receiveMessage", data);
      });
    }

    // send back to sender sockets (sync multi-device)
    if (onlineUsers[senderId]) {
      onlineUsers[senderId].forEach((sockId) => {
        io.to(sockId).emit("receiveMessage", data);
      });
    }
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
    const userId = socket.userId;

    if (!userId) return;

    if (onlineUsers[userId]) {
      onlineUsers[userId].delete(socket.id);

      if (onlineUsers[userId].size === 0) {
        delete onlineUsers[userId];
      }
    }

    console.log("🔴 User disconnected:", userId);

    io.emit("onlineUsers", Object.keys(onlineUsers));
  });
});



// ----------------- ALL ROUTES -----------------
app.use("/", authRoutes);
app.use("/", serviceRoute);
app.use("/", serviceReviewRoutes);
app.use("/api", middleRoutes);
app.use("/user", userRoutes);
app.use("/user", reportRoutes);
app.use("/user", postRoutes);
app.use("/user", notificationRoutes);
app.use("/user", groupRoutes);
app.use("/interest", interestRoute);
app.use("/language", languageRoute);
app.use("/user",chatRoutes);
app.use("/profession", profeesionRoutes)
app.use("/", searchRoutes);
app.use("/agent",agentRoutes)
app.use("/subadmin",sudadminRoutes)
app.use("/admin",adminRoutes)




// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 3008;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
