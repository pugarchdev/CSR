/**
 * Notification Socket
 *
 * Maharashtra CSR Portal - Convergence Framework
 *
 * Real-time delivery of in-app notifications. Each authenticated user joins a
 * private room keyed by their user id; the notification service pushes new
 * notifications into that room so status updates appear live without polling.
 *
 * This replaces the disabled legacy chat socket referenced by the old TODO in
 * app.ts. It is intentionally push-only (server -> client); clients still read
 * history and mark-as-read over REST.
 */

import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

/** Room name for a given user's private notification channel. */
const userRoom = (userId: string) => `user:${userId}`;

// Module-level reference so non-socket code (services) can emit.
let ioRef: Server | null = null;

export const registerNotificationSocket = (io: Server) => {
  ioRef = io;

  // Authenticate every socket connection with the same JWT used for REST.
  io.use((socket: any, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }

    jwt.verify(token, getJwtSecret(), (err: any, decoded: any) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded as SocketUser;
      next();
    });
  });

  io.on("connection", (socket: Socket & { user?: SocketUser }) => {
    if (!socket.user) {
      socket.disconnect(true);
      return;
    }

    // Each user listens on their own private room.
    socket.join(userRoom(socket.user.id));

    socket.on("disconnect", () => {
      // socket.io auto-leaves rooms on disconnect; nothing else to clean up.
    });
  });

  console.log("[Notification Socket] Registered - real-time notifications enabled");
};

/**
 * Push a single notification payload to a specific user's live sockets.
 * No-op if the socket server hasn't been initialised (e.g. certain test paths).
 */
export const emitNotificationToUser = (userId: string, payload: unknown) => {
  if (!ioRef) return;
  ioRef.to(userRoom(userId)).emit("notification:new", payload);
};

/**
 * Push the same payload to multiple users at once.
 */
export const emitNotificationToUsers = (userIds: string[], payload: unknown) => {
  if (!ioRef || userIds.length === 0) return;
  const rooms = userIds.map(userRoom);
  ioRef.to(rooms).emit("notification:new", payload);
};
