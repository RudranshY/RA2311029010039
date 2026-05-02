// logging_middleware/index.js
const axios = require('axios');

const LOG_URL = 'http://20.207.122.201/evaluation-service/logs';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyeTk5NDBAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNTc2MSwiaWF0IjoxNzc3NzA0ODYxLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNWU5NzkxN2MtNzFhMC00ZTZmLWIxNDEtYzk1OTU3YTUyNzk4IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicnVkcmFuc2ggeWFkYXYiLCJzdWIiOiIyM2Y5YjAzMS00YmE2LTQyZDEtYjg0Yi03YzUyNjhjMWZiNWQifSwiZW1haWwiOiJyeTk5NDBAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJydWRyYW5zaCB5YWRhdiIsInJvbGxObyI6InJhMjMxMTAyOTAxMDAzOSIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjIzZjliMDMxLTRiYTYtNDJkMS1iODRiLTdjNTI2OGMxZmI1ZCIsImNsaWVudFNlY3JldCI6ImRCdWpnZFB0RGtNeVp4aHYifQ.qLkx-wPO17eQxr33d4B0ijtLc69JXy4C3WH6sxhCh1Y'; 

const Log = async (stack, level, pkg, message) => {
    const validStacks = ['backend', 'frontend'];
    const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
    
    if (!validStacks.includes(stack) || !validLevels.includes(level)) {
        console.error("Invalid stack or level provided to logger.");
        return;
    }
    try {
        await axios.post(LOG_URL, 
            { 
                stack: stack, 
                level: level, 
                package: pkg, 
                message: message 
            },
            { 
                headers: { 'Authorization': `Bearer ${TOKEN}` } 
            }
        );
        
    } catch (error) {
        console.error("Logging API Failed:", error.message);
    }
};

module.exports = Log;