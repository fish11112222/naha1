# Vercel Serverless Functions Stateless Issue

## ปัญหาที่พบ (July 24, 2025 - 2:30 PM)

### การทดสอบ https://nahajava.vercel.app/ และ https://nahaggwe.vercel.app/

1. **✅ การล็อกอิน**: สำเร็จ
   ```json
   {"email": "kuy@gmail.com", "password": "12345qazAZ"}
   → HTTP 200, User ID: 71157855
   ```

2. **✅ การส่งข้อความ**: สำเร็จ
   ```json
   POST /api/messages → HTTP 201
   Response: {"id":137945,"content":"ทดสอบส่งข้อความจาก API","userId":71157855}
   ```

3. **✅ การดึงข้อความ**: แสดงข้อความที่เพิ่งสร้าง
   ```json
   GET /api/messages → HTTP 200
   Messages: [1, 2, 3, 50697, 137945] // แสดง ID 137945 ได้
   ```

4. **❌ การลบข้อความ**: ล้มเหลว
   ```json
   DELETE /api/messages/137945?userId=71157855 → HTTP 404
   Response: {
     "message": "ไม่พบข้อความ",
     "debug": {
       "requestedId": 137945,
       "availableIds": [1,2,3],  // ไม่เห็น ID 137945
       "messageCount": 3,
       "globalCount": 3
     }
   }
   ```

## สาเหตุ: Serverless Functions Stateless

- **Function Instance A**: POST /api/messages → สร้าง ID 137945
- **Function Instance B**: GET /api/messages → เห็น ID 137945 
- **Function Instance C**: DELETE /api/messages/137945 → ไม่เห็น ID 137945

ข้อความที่สร้างใน Instance A ไม่ปรากฏใน Instance C เนื่องจาก global storage ไม่ persistent

## การแก้ไขที่ทำแล้ว

1. ใช้ shared storage key `'vercel-messages-shared'`
2. เพิ่ม `saveMessages()` function
3. ปรับปรุง PUT/DELETE operations

### การทดสอบเพิ่มเติม https://nahaggwe.vercel.app/chat

4. **✅ การล็อกอิน**: สำเร็จ (User ID: 71157855)
5. **✅ การส่งข้อความ**: POST /api/messages → สำเร็จ (ID: 588169, 606042)
6. **❌ การลบข้อความ**: DELETE /api/messages/606042 → HTTP 404 "ไม่พบข้อความ"
7. **🔍 Debug Info**: availableIds: [1,2,3] แต่ข้อความ ID 606042 มีอยู่จริง

### การทดสอบเพิ่มเติม https://nahasusus.vercel.app/chat

8. **✅ การล็อกอิน**: สำเร็จ (User ID: 71157855)
9. **✅ การส่งข้อความ**: POST /api/messages → สำเร็จ (ID: 949072)
10. **❌ การลบข้อความ**: DELETE /api/messages/949072 → HTTP 404 "ไม่พบข้อความ"
11. **🔍 Debug Info**: availableIds: [1,2,3] แต่ข้อความ ID 949072 มีอยู่จริง

**✅ ยืนยัน**: ปัญหาเดียวกันเกิดขึ้นในทุก Vercel deployments (3/3 domains tested)

## สถานะ

⚠️ **รอการ deploy**: การแก้ไขจะมีผลเมื่อ Vercel auto-deploy โค้ดใหม่

🔧 **ทางออก**: 
- ใช้ external database (PostgreSQL/Neon)  
- หรือรอให้ Vercel deploy โค้ดใหม่ที่มี shared storage system
- **ยืนยัน**: ปัญหาเกิดขึ้นทุก domain (nahajava, nahaggwe)