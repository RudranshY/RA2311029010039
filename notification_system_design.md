# Campus Notifications Microservice - System Design

## Stage 1
### REST API Design
To support a notification platform, the REST API must be predictable and handle CRUD operations for notifications.

**1. Fetch User Notifications**
*   **Endpoint:** `GET /api/v1/notifications`
*   **Headers:** `Authorization: Bearer <token>`
*   **Response (200 OK):**
    ```json
    {
      "data": [
        { "id": "uuid", "type": "Result", "message": "mid-sem", "isRead": false, "timestamp": "2026-04-22T17:51:30Z" }
      ],
      "meta": { "unreadCount": 1, "page": 1 }
    }
    ```

**2. Mark Notification as Read**
*   **Endpoint:** `PUT /api/v1/notifications/:id/read`
*   **Headers:** `Authorization: Bearer <token>`
*   **Response (200 OK):** `{ "success": true, "message": "Marked as read" }`

### Real-Time Mechanism
For real-time delivery, I propose using **Server-Sent Events (SSE)**.
*   **Why SSE over WebSockets?** Notifications are heavily unidirectional (Server -> Client). SSE operates over standard HTTP, is easier to scale, requires less overhead than full duplex WebSockets, and features built-in reconnection mechanisms.
*   **Structure:** Client opens a connection to `GET /api/v1/notifications/stream`. The server pushes events (`data: {"type": "new_notification", "payload": {...}}\n\n`) as they occur.

---

## Stage 2
### Database Choice: PostgreSQL
I suggest **PostgreSQL** (Relational DB). Notifications have a highly structured schema (User, Type, Message, Timestamps) and require strict data integrity. While NoSQL (MongoDB) handles high-velocity writes well, PostgreSQL's advanced indexing, JSONB support for flexible metadata, and mature partitioning capabilities make it ideal for this structured data.

### DB Schema
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    notification_type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
## Stage 3
### Query Analysis
**The Query:** `SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;`
*   **Why is it slow?** With 5,000,000 rows, the DB is likely performing a full table scan because there is no composite index covering these specific columns. The computation cost is O(N).
*   **Optimization:** Create a composite index: `CREATE INDEX idx_student_unread ON notifications(student_id, is_read, created_at DESC);`

### Indexing Strategy
Adding indexes to every column is **ineffective**. It increases disk usage (disk bloat) and significantly slows down `INSERT` and `UPDATE` operations because every index must be updated for every write.

### Targeted Placement Query
To find students who received a placement notification in the last 7 days:
```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE notification_type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';

## Stage 4
### Performance Improvements & Tradeoffs
Fetching notifications directly from the database on every page load is an anti-pattern that overwhelms the DB connection pool. To improve performance, I suggest two strategies:

**1. Distributed Caching (Redis)**
*   **Strategy:** Cache the "unread count" and a small payload of the most recent notifications for each active student in an in-memory datastore like Redis. Page loads will fetch from RAM (Redis) in <1ms instead of hitting the PostgreSQL disk.
*   **Tradeoffs:** This introduces cache invalidation complexity. The system must ensure that when a notification is marked as read, or a new one arrives, the cache is instantly updated so the user doesn't see stale data.

**2. Real-Time Push Architecture (SSE)**
*   **Strategy:** Instead of the client pulling data on every route change, the client fetches the initial state once. From then on, the backend pushes any new notification deltas to the client over the Server-Sent Events (SSE) connection established in Stage 1.
*   **Tradeoffs:** This drastically reduces the number of read queries hitting the database. However, it increases memory overhead on the backend server, as it must maintain thousands of persistent, concurrent TCP connections.

## Stage 5
### Shortcomings of Current Implementation
The provided sequential `notify_all` function has critical flaws:
1.  **Blocking Operations:** If one email fails or is slow, the entire loop stalls.
2.  **No Retry Logic:** Partial failures (like the 200 failed emails) leave the system in an inconsistent state with no way to resume.

### Redesign: Async Queue Processing
We should decouple the process using a Message Queue (like RabbitMQ or BullMQ):

**Revised Pseudocode:**
```text
function notify_all(student_ids, message):
    # 1. Bulk insert to DB first for record keeping
    save_notifications_to_db(student_ids, message)
    
    # 2. Push tasks to worker queues
    for id in student_ids:
        EmailQueue.add({ id, message })
        AppPushQueue.add({ id, message })

# Background Workers handle the actual heavy lifting with automatic retries.