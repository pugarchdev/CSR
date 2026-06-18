import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/db";

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

export const registerChatSocket = (io: Server) => {
  // Authentication middleware for Socket.io
  io.use((socket: any, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }

    jwt.verify(token, process.env.JWT_SECRET || "mahacsr_super_secret_jwt_sign_key_2026", (err: any, decoded: any) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded as SocketUser;
      next();
    });
  });

  io.on("connection", (socket: Socket & { user?: SocketUser }) => {
    console.log(`User connected to Chat Socket: ${socket.user?.email} (${socket.id})`);

    // Join room
    socket.on("join_room", ({ chatId }) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined room ${chatId}`);
    });

    // Send Message
    socket.on("send_message", async ({ chatId, text, fileUrl, fileType }) => {
      try {
        if (!socket.user) return;

        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: socket.user.id,
            text,
            fileUrl,
            fileType,
            readBy: [socket.user.id]
          },
          include: {
            sender: {
              select: { id: true, email: true, role: true }
            }
          }
        });

        // Update Chat updatedTime
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() }
        });

        // Broadcast to other sockets in room
        io.to(chatId).emit("receive_message", message);
      } catch (err) {
        console.error("Socket send_message error:", err);
      }
    });

    // Typing Indicators
    socket.on("typing", ({ chatId }) => {
      socket.to(chatId).emit("user_typing", { email: socket.user?.email });
    });

    socket.on("stop_typing", ({ chatId }) => {
      socket.to(chatId).emit("user_stop_typing", { email: socket.user?.email });
    });

    // Read Receipt
    socket.on("message_read", async ({ chatId, messageId }) => {
      try {
        if (!socket.user) return;

        await prisma.message.update({
          where: { id: messageId },
          data: {
            readBy: {
              push: socket.user.id
            }
          }
        });

        socket.to(chatId).emit("message_read_receipt", { messageId, userId: socket.user.id });
      } catch (err) {
        console.error("Socket message_read error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from Chat Socket: ${socket.user?.email}`);
    });
  });
};
