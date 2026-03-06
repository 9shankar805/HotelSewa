const express = require("express");
const { v4: uuid } = require("uuid");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all conversations for the authenticated user
router.get("/", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    let conversations;
    if (req.user.role === "owner") {
      // For hotel owners, get conversations related to their hotel
      conversations = await prisma.chatConversation.findMany({
        where: {
          hotelId: req.user.hotelId,
          deletedAt: null,
        },
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      // For admins/support, get all conversations
      conversations = await prisma.chatConversation.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      hotelId: conv.hotelId,
      participantId: conv.participantId,
      participantName: conv.participantName,
      participantType: conv.participantType,
      participantAvatar: conv.participantAvatar,
      lastMessage: conv.messages[0] ? {
        id: conv.messages[0].id,
        conversationId: conv.messages[0].conversationId,
        senderId: conv.messages[0].senderId,
        senderName: conv.messages[0].senderName,
        senderType: conv.messages[0].senderType,
        content: conv.messages[0].content,
        type: conv.messages[0].messageType,
        isRead: conv.messages[0].isRead,
        createdAt: conv.messages[0].createdAt,
      } : null,
      unreadCount: conv.unreadCount,
      isArchived: conv.isArchived,
      isOnline: conv.isOnline,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    res.json({
      success: true,
      data: formattedConversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
});

// Get messages for a specific conversation
router.get("/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { conversationId } = req.params;

    // Check if user has access to this conversation
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        ...(req.user.role === "owner" && { hotelId: req.user.hotelId }),
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderType: msg.senderType,
      content: msg.content,
      type: msg.messageType,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      isRead: msg.isRead,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
    }));

    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
});

// Send a message
router.post("/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { conversationId } = req.params;
    const { content, type } = req.body;

    // Check if user has access to this conversation
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        ...(req.user.role === "owner" && { hotelId: req.user.hotelId }),
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const message = await prisma.chatMessage.create({
      data: {
        id: uuid(),
        conversationId,
        senderId: req.user.id,
        senderName: req.user.name || req.user.email,
        senderType: req.user.role,
        content,
        messageType: type || "text",
        isRead: false,
      },
    });

    // Update conversation's last message and unread count
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
        ...(req.user.role !== "owner" && { // Don't increment unread count for owner's own messages
          unreadCount: {
            increment: 1,
          },
        }),
      },
    });

    // Update online status
    await updateOnlineStatus(req.user.id, req.user.role, true);

    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderType: message.senderType,
        content: message.content,
        type: message.messageType,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

// Create a new conversation
router.post("/", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { participantId, participantName, participantType } = req.body;

    // For hotel owners, create conversation under their hotel
    const hotelId = req.user.role === "owner" ? req.user.hotelId : null;

    const conversation = await prisma.chatConversation.create({
      data: {
        id: uuid(),
        hotelId,
        participantId,
        participantName,
        participantType,
        isOnline: false,
      },
    });

    // Send initial system message
    await prisma.chatMessage.create({
      data: {
        id: uuid(),
        conversationId: conversation.id,
        senderId: "system",
        senderName: "System",
        senderType: "system",
        content: `Conversation started with ${participantName}`,
        messageType: "system",
        isRead: true,
      },
    });

    res.status(201).json({
      success: true,
      data: conversation,
      message: "Conversation created successfully",
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
});

// Mark messages as read
router.patch("/:conversationId/read", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { conversationId } = req.params;

    // Check if user has access to this conversation
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        ...(req.user.role === "owner" && { hotelId: req.user.hotelId }),
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Mark all unread messages as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        isRead: false,
        senderId: { not: req.user.id }, // Don't mark own messages as read
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Update conversation unread count
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        unreadCount: 0,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
});

// Get unread message count
router.get("/unread/count", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    let unreadCount;
    if (req.user.role === "owner") {
      unreadCount = await prisma.chatConversation.aggregate({
        where: {
          hotelId: req.user.hotelId,
          deletedAt: null,
        },
        _sum: {
          unreadCount: true,
        },
      });
    } else {
      unreadCount = await prisma.chatConversation.aggregate({
        where: {
          deletedAt: null,
        },
        _sum: {
          unreadCount: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        count: unreadCount._sum.unreadCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
    });
  }
});

// Search conversations
router.get("/search", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    let conversations;
    if (req.user.role === "owner") {
      conversations = await prisma.chatConversation.findMany({
        where: {
          hotelId: req.user.hotelId,
          deletedAt: null,
          OR: [
            {
              participantName: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              participantType: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      conversations = await prisma.chatConversation.findMany({
        where: {
          deletedAt: null,
          OR: [
            {
              participantName: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              participantType: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      hotelId: conv.hotelId,
      participantId: conv.participantId,
      participantName: conv.participantName,
      participantType: conv.participantType,
      participantAvatar: conv.participantAvatar,
      lastMessage: conv.messages[0] ? {
        id: conv.messages[0].id,
        conversationId: conv.messages[0].conversationId,
        senderId: conv.messages[0].senderId,
        senderName: conv.messages[0].senderName,
        senderType: conv.messages[0].senderType,
        content: conv.messages[0].content,
        type: conv.messages[0].messageType,
        isRead: conv.messages[0].isRead,
        createdAt: conv.messages[0].createdAt,
      } : null,
      unreadCount: conv.unreadCount,
      isArchived: conv.isArchived,
      isOnline: conv.isOnline,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    res.json({
      success: true,
      data: formattedConversations,
    });
  } catch (error) {
    console.error("Error searching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search conversations",
    });
  }
});

// Get chat statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    let stats;
    if (req.user.role === "owner") {
      stats = await prisma.chatAnalytics.findFirst({
        where: {
          hotelId: req.user.hotelId,
        },
      });

      if (!stats) {
        // Create default stats if not found
        stats = await prisma.chatAnalytics.create({
          data: {
            id: uuid(),
            hotelId: req.user.hotelId,
            totalConversations: 0,
            unreadMessages: 0,
            activeConversations: 0,
            archivedConversations: 0,
            messagesToday: 0,
            messagesThisWeek: 0,
            averageResponseTime: 0,
            conversationsByType: {},
          },
        });
      }
    } else {
      // For admins/support, get global stats
      const totalConversations = await prisma.chatConversation.count({
        where: { deletedAt: null },
      });
      const unreadMessages = await prisma.chatConversation.aggregate({
        where: { deletedAt: null },
        _sum: { unreadCount: true },
      });
      const activeConversations = await prisma.chatConversation.count({
        where: { 
          deletedAt: null,
          isArchived: false,
        },
      });
      const archivedConversations = await prisma.chatConversation.count({
        where: { 
          deletedAt: null,
          isArchived: true,
        },
      });

      stats = {
        totalConversations,
        unreadMessages: unreadMessages._sum.unreadCount || 0,
        activeConversations,
        archivedConversations,
        messagesToday: 0,
        messagesThisWeek: 0,
        averageResponseTime: 0,
        conversationsByType: {},
      };
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching chat stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat statistics",
    });
  }
});

// Archive or unarchive conversation
router.patch("/:conversationId/archive", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { conversationId } = req.params;
    const { isArchived } = req.body;

    // Check if user has access to this conversation
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        ...(req.user.role === "owner" && { hotelId: req.user.hotelId }),
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        isArchived,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: isArchived ? "Conversation archived" : "Conversation unarchived",
    });
  } catch (error) {
    console.error("Error archiving conversation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update conversation",
    });
  }
});

// Delete conversation
router.delete("/:conversationId", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { conversationId } = req.params;

    // Check if user has access to this conversation
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        ...(req.user.role === "owner" && { hotelId: req.user.hotelId }),
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Soft delete
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
    });
  }
});

// Update online status
router.post("/online", requireAuth, async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    await updateOnlineStatus(req.user.id, req.user.role, isOnline);

    res.json({
      success: true,
      message: "Online status updated",
    });
  } catch (error) {
    console.error("Error updating online status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update online status",
    });
  }
});

// Helper function to update online status
async function updateOnlineStatus(userId, userType, isOnline) {
  const { prisma } = require("../lib/prisma");
  
  await prisma.chatOnlineStatus.upsert({
    where: {
      user_id_user_type: {
        userId,
        userType,
      },
    },
    update: {
      isOnline,
      lastSeen: isOnline ? new Date() : new Date(),
      updatedAt: new Date(),
    },
    create: {
      id: uuid(),
      userId,
      userType,
      isOnline,
      lastSeen: new Date(),
    },
  });
}

module.exports = router;
