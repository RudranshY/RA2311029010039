const axios = require('axios');
const Log = require('../logging_middleware/index'); 

const API_URL = 'http://20.207.122.201/evaluation-service/notifications';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyeTk5NDBAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNTc2MSwiaWF0IjoxNzc3NzA0ODYxLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNWU5NzkxN2MtNzFhMC00ZTZmLWIxNDEtYzk1OTU3YTUyNzk4IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicnVkcmFuc2ggeWFkYXYiLCJzdWIiOiIyM2Y5YjAzMS00YmE2LTQyZDEtYjg0Yi03YzUyNjhjMWZiNWQifSwiZW1haWwiOiJyeTk5NDBAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJydWRyYW5zaCB5YWRhdiIsInJvbGxObyI6InJhMjMxMTAyOTAxMDAzOSIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjIzZjliMDMxLTRiYTYtNDJkMS1iODRiLTdjNTI2OGMxZmI1ZCIsImNsaWVudFNlY3JldCI6ImRCdWpnZFB0RGtNeVp4aHYifQ.qLkx-wPO17eQxr33d4B0ijtLc69JXy4C3WH6sxhCh1Y';

const PRIORITY_WEIGHTS = {
    "Placement": 3,
    "Result": 2,
    "Event": 1
};

async function generatePriorityInbox(topN = 10) {
    try {
        await Log('backend', 'info', 'service', `Starting Priority Inbox fetch for top ${topN} items`);

        const response = await axios.get(API_URL, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        const notifications = response.data.notifications || [];
        await Log('backend', 'debug', 'service', `Successfully fetched ${notifications.length} notifications from server`);

  
        notifications.sort((a, b) => {
            const weightA = PRIORITY_WEIGHTS[a.Type] || 0;
            const weightB = PRIORITY_WEIGHTS[b.Type] || 0;
            
            // 1. Sort by Priority Weight (Descending)
            if (weightA !== weightB) {
                return weightB - weightA;
            }

            // 2. If weights are equal, sort by Recency/Timestamp (Descending)
            return new Date(b.Timestamp) - new Date(a.Timestamp);
        });

        // Slice the top 'n' notifications
        const priorityInbox = notifications.slice(0, topN);

        await Log('backend', 'info', 'service', 'Priority Inbox sorting completed successfully');

        // Output formatting for the screenshot
        console.log(`\n=== 🏆 TOP ${topN} PRIORITY INBOX ===\n`);
        console.table(priorityInbox.map(n => ({
            ID: n.ID.substring(0, 8) + '...', 
            Type: n.Type,
            Message: n.Message,
            Timestamp: n.Timestamp
        })));

    } catch (error) {
        await Log('backend', 'error', 'service', `Priority Inbox Error: ${error.message}`);
        console.error(" Error fetching notifications:", error.message);
    }
}
generatePriorityInbox(10);