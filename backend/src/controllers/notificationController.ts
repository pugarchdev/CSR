import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const listNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { recipientId: req.user!.id },
          { recipientId: null, userId: req.user!.id }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        OR: [
          { recipientId: req.user!.id },
          { recipientId: null, userId: req.user!.id }
        ]
      },
      data: { isRead: true }
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          { recipientId: req.user!.id },
          { recipientId: null, userId: req.user!.id }
        ]
      },
      data: { isRead: true }
    });

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: req.params.id,
        OR: [
          { recipientId: req.user!.id },
          { recipientId: null, userId: req.user!.id }
        ]
      }
    });

    return res.json({ message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
};

export const clearAllNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { recipientId: req.user!.id },
          { recipientId: null, userId: req.user!.id }
        ]
      }
    });

    return res.json({ message: "All notifications cleared" });
  } catch (error) {
    next(error);
  }
};
