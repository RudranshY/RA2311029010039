const axios = require('axios');
const Log = require('../logging_middleware/index'); // Mandatory logging requirement

const DEPOTS_API = 'http://20.207.122.201/evaluation-service/depots';
const VEHICLES_API = 'http://20.207.122.201/evaluation-service/vehicles';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyeTk5NDBAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNTc2MSwiaWF0IjoxNzc3NzA0ODYxLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNWU5NzkxN2MtNzFhMC00ZTZmLWIxNDEtYzk1OTU3YTUyNzk4IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicnVkcmFuc2ggeWFkYXYiLCJzdWIiOiIyM2Y5YjAzMS00YmE2LTQyZDEtYjg0Yi03YzUyNjhjMWZiNWQifSwiZW1haWwiOiJyeTk5NDBAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJydWRyYW5zaCB5YWRhdiIsInJvbGxObyI6InJhMjMxMTAyOTAxMDAzOSIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjIzZjliMDMxLTRiYTYtNDJkMS1iODRiLTdjNTI2OGMxZmI1ZCIsImNsaWVudFNlY3JldCI6ImRCdWpnZFB0RGtNeVp4aHYifQ.qLkx-wPO17eQxr33d4B0ijtLc69JXy4C3WH6sxhCh1Y'; // <-- PASTE YOUR LATEST TOKEN HERE

// Dynamic Programming approach to solve the 0/1 Knapsack Problem
function optimizeSchedule(vehicles, maxHours) {
    const n = vehicles.length;
    // Create a 2D DP array initialized to 0
    const dp = Array(n + 1).fill(null).map(() => Array(maxHours + 1).fill(0));

    // Build the DP table
    for (let i = 1; i <= n; i++) {
        const v = vehicles[i - 1];
        const time = v.Duration;
        const impact = v.Impact;

        for (let w = 0; w <= maxHours; w++) {
            if (time <= w) {
                // Max of (not including the vehicle) OR (including it + whatever fits in remaining time)
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - time] + impact);
            } else {
                // Vehicle doesn't fit, skip it
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    // Traceback to find exactly which TaskIDs were selected
    let res = dp[n][maxHours];
    let w = maxHours;
    const selectedTasks = [];

    for (let i = n; i > 0 && res > 0; i--) {
        if (res !== dp[i - 1][w]) {
            const v = vehicles[i - 1];
            selectedTasks.push(v.TaskID);
            res -= v.Impact;
            w -= v.Duration;
        }
    }

    return {
        maxImpact: dp[n][maxHours],
        timeUsed: maxHours - w,
        selectedTasks: selectedTasks
    };
}

async function runScheduler() {
    try {
        await Log('backend', 'info', 'service', 'Starting Vehicle Maintenance Scheduler');

        // Fetch Data from APIs
        const [depotsRes, vehiclesRes] = await Promise.all([
            axios.get(DEPOTS_API, { headers: { 'Authorization': `Bearer ${TOKEN}` } }),
            axios.get(VEHICLES_API, { headers: { 'Authorization': `Bearer ${TOKEN}` } })
        ]);

        const depots = depotsRes.data.depots || [];
        const vehicles = vehiclesRes.data.vehicles || [];

        await Log('backend', 'debug', 'service', `Fetched ${depots.length} depots and ${vehicles.length} vehicles`);

        console.log(`\n=== 🚛 VEHICLE MAINTENANCE SCHEDULER ===\n`);

        // Calculate the optimal schedule for each depot
        depots.forEach(depot => {
            const result = optimizeSchedule(vehicles, depot.MechanicHours);
            
            console.log(`📍 Depot ID: ${depot.ID} | Budget: ${depot.MechanicHours} hrs`);
            console.log(`   ✅ Max Impact Score : ${result.maxImpact}`);
            console.log(`   ⏱️  Total Time Used  : ${result.timeUsed} hrs`);
            console.log(`   📋 Tasks Scheduled  : ${result.selectedTasks.length} vehicles`);
            console.log('-'.repeat(40));
        });

        await Log('backend', 'info', 'service', 'Vehicle scheduling algorithm completed successfully');

    } catch (error) {
        await Log('backend', 'error', 'service', `Scheduler Error: ${error.message}`);
        console.error("❌ Error running scheduler:", error.message);
    }
}

runScheduler();