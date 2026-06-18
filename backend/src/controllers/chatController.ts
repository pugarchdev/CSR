import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const getOrCreateChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, companyId } = req.body;
    const ngoId = req.user?.ngoId;

    if (!ngoId) {
      return res.status(403).json({ error: "Only NGOs can initiate chats" });
    }

    // Check if chat room already exists
    let chat = await prisma.chat.findFirst({
      where: {
        ngoId,
        companyId,
        projectId: projectId || null
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          ngoId,
          companyId,
          projectId: projectId || null
        }
      });
    }

    return res.json(chat);
  } catch (error) {
    next(error);
  }
};

export const listChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let filter: any = {};
    if (req.user?.ngoId) {
      filter.ngoId = req.user.ngoId;
    } else if (req.user?.companyId) {
      filter.companyId = req.user.companyId;
    } else {
      return res.status(400).json({ error: "User is not associated with an organization" });
    }

    const chats = await prisma.chat.findMany({
      where: filter,
      include: {
        ngo: { select: { name: true } },
        company: { select: { name: true } },
        project: { select: { title: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return res.json(chats);
  } catch (error) {
    next(error);
  }
};

export const getChatMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    // Verify user is member of chat
    const chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat) return res.status(404).json({ error: "Chat room not found" });

    if (
      (req.user?.ngoId && chat.ngoId !== req.user.ngoId) ||
      (req.user?.companyId && chat.companyId !== req.user.companyId)
    ) {
      return res.status(403).json({ error: "Access denied to chat room" });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sender: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    // Mark as read in background
    if (messages.length > 0 && req.user?.id) {
      const unreadMessageIds = messages
        .filter(m => m.senderId !== req.user?.id && !m.readBy.includes(req.user!.id))
        .map(m => m.id);

      if (unreadMessageIds.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: unreadMessageIds } },
          data: {
            readBy: {
              push: req.user.id
            }
          }
        });
      }
    }

    return res.json(messages.reverse()); // return chronological
  } catch (error) {
    next(error);
  }
};
