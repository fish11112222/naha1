import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

type Message = {
  id: number;
  content: string;
  username: string;
  userId: number;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

// Global storage for Vercel deployment
const SHARED_STORAGE_KEY = 'VERCEL_SHARED_MESSAGES_SIMPLE';
const DEFAULT_MESSAGES: Message[] = [
  {
    id: 1,
    content: "สวัสดีครับ ยินดีต้อนรับสู่ห้องแชท! 🎉",
    username: "Panida ใสใจ",
    userId: 2,
    createdAt: "2025-07-22T12:00:00.000Z",
    updatedAt: null,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null
  },
  {
    id: 2,
    content: "หวัดดีครับ ขอบคุณสำหรับการต้อนรับนะครับ 😊",
    username: "Kuy Kuy",
    userId: 1,
    createdAt: "2025-07-22T12:05:00.000Z",
    updatedAt: null,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null
  },
  {
    id: 3,
    content: "แอปแชทนี้ทำได้ดีมากเลย รองรับภาษาไทยได้เต็มที่ 👍",
    username: "แอดมิน ระบบ",
    userId: 4,
    createdAt: "2025-07-22T12:10:00.000Z",
    updatedAt: null,
    attachmentUrl: null,
    attachmentType: null,
    attachmentName: null
  }
];

function getMessages(): Message[] {
  if (!(global as any)[SHARED_STORAGE_KEY]) {
    (global as any)[SHARED_STORAGE_KEY] = [...DEFAULT_MESSAGES];
  }
  return (global as any)[SHARED_STORAGE_KEY];
}

function saveMessages(messageList: Message[]): void {
  (global as any)[SHARED_STORAGE_KEY] = messageList;
}

function generateMessageId(): number {
  const messageList = getMessages();
  const existingIds = messageList.map((m: Message) => m.id);
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const timestamp = Date.now();
  const randomComponent = Math.floor(Math.random() * 1000);
  const candidateId = Math.max(maxId + 1, timestamp % 1000000 + randomComponent);
  
  if (existingIds.includes(candidateId)) {
    return Math.max(...existingIds) + 1;
  }
  return candidateId;
}

function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

const messageSchema = z.object({
  content: z.string().min(0, "").optional().default(""),
  username: z.string().min(1),
  userId: z.number(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(['image', 'file', 'gif']).optional(),
  attachmentName: z.string().optional(),
}).refine((data) => {
  return (data.content && data.content.trim().length > 0) || (data.attachmentUrl && data.attachmentType);
}, {
  message: "กรุณาระบุข้อความหรือแนบไฟล์",
});

const updateMessageSchema = z.object({
  content: z.string().min(1, "ข้อความไม่สามารถว่างได้").max(500, "ข้อความยาวเกินไป"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Handle different endpoints based on URL pattern
    const url = req.url || '';
    const pathParts = url.split('/');
    const messageId = pathParts[pathParts.length - 1];
    const isSpecificMessage = messageId && !isNaN(parseInt(messageId));

    if (req.method === 'GET') {
      if (isSpecificMessage) {
        // GET specific message
        const id = parseInt(messageId);
        const messageList = getMessages();
        const message = messageList.find(m => m.id === id);
        if (!message) {
          return res.status(404).json({ message: 'ไม่พบข้อความ' });
        }
        return res.status(200).json(message);
      } else {
        // GET all messages
        const limit = parseInt(req.query.limit as string) || 50;
        const messageList = getMessages();
        const paginatedMessages = messageList.slice(-limit);
        console.log(`Retrieved ${paginatedMessages.length} messages from Vercel storage`);
        return res.status(200).json(paginatedMessages);
      }
    }
    
    if (req.method === 'POST') {
      let requestBody = req.body;
      if (typeof req.body === 'string') {
        try {
          requestBody = JSON.parse(req.body);
        } catch (e) {
          return res.status(400).json({ message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
        }
      }
      
      if (!requestBody || typeof requestBody !== 'object') {
        return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
      }
      
      const validatedData = messageSchema.parse(requestBody);
      const newId = generateMessageId();
      const newMessage: Message = {
        id: newId,
        content: validatedData.content || "",
        username: validatedData.username,
        userId: validatedData.userId,
        attachmentUrl: validatedData.attachmentUrl || null,
        attachmentType: validatedData.attachmentType || null,
        attachmentName: validatedData.attachmentName || null,
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      
      const currentMessages = getMessages();
      currentMessages.push(newMessage);
      saveMessages(currentMessages);
      
      console.log(`Created message ${newId} in Vercel storage`);
      return res.status(201).json(newMessage);
    }

    if (req.method === 'PUT' && isSpecificMessage) {
      let requestBody = req.body;
      if (typeof req.body === 'string') {
        try {
          requestBody = JSON.parse(req.body);
        } catch (e) {
          return res.status(400).json({ message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
        }
      }

      if (!requestBody || typeof requestBody !== 'object') {
        return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
      }

      const validatedData = updateMessageSchema.parse(requestBody);
      const userId = requestBody.userId || parseInt(req.query.userId as string);
      const id = parseInt(messageId);

      if (!userId) {
        return res.status(400).json({ message: 'กรุณาระบุ ID ผู้ใช้' });
      }

      const messageList = getMessages();
      const messageIndex = messageList.findIndex(m => m.id === id);
      
      if (messageIndex === -1 || messageList[messageIndex].userId !== userId) {
        return res.status(404).json({ message: 'ไม่พบข้อความหรือคุณไม่มีสิทธิ์แก้ไข' });
      }

      messageList[messageIndex] = {
        ...messageList[messageIndex],
        content: validatedData.content,
        updatedAt: new Date().toISOString()
      };

      saveMessages(messageList);
      console.log(`Updated message ${id} in Vercel storage`);
      return res.status(200).json(messageList[messageIndex]);
    }

    if (req.method === 'DELETE' && isSpecificMessage) {
      const userId = parseInt(req.query.userId as string);
      const id = parseInt(messageId);

      if (!userId) {
        return res.status(400).json({ message: 'กรุณาระบุ ID ผู้ใช้' });
      }

      const messageList = getMessages();
      const messageIndex = messageList.findIndex(m => m.id === id);
      
      if (messageIndex === -1 || messageList[messageIndex].userId !== userId) {
        console.log(`Delete failed: Message ${id} not found or not owned by user ${userId}`);
        return res.status(404).json({ message: 'ไม่พบข้อความหรือคุณไม่มีสิทธิ์ลบ' });
      }

      messageList.splice(messageIndex, 1);
      saveMessages(messageList);
      console.log(`Deleted message ${id} from Vercel storage`);
      return res.status(204).end();
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "ข้อมูลไม่ถูกต้อง", 
        errors: error.errors 
      });
    }
    
    console.error('Messages error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
}