import { Queue } from "bullmq";
import IORedis from "ioredis";
import { EMAILJOB } from "@akshar/email";

const redisUrl =  process.env.QUEUE_REDIS_URL?? "redis://localhost:6379";

const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
})

export const authEmailQueue = new Queue<EMAILJOB>("auth-email",
    {
    connection,
    defaultJobOptions:{
        attempts: 5,
        backoff:{
            type: "exponential",
            delay: 1_000,
        },
        removeOnComplete: {
            age: 60 * 60,
            count: 500,
        },
        removeOnFail: {
            age: 60 * 60,
            count: 500
        },
    },
});

export const notificationEmailQueue = new Queue<EMAILJOB>("notify-email",
    {
        connection,
        defaultJobOptions:{
            attempts: 5,
            backoff:{
                type: "exponential",
                delay: 2_000,
            },
            removeOnComplete:{
                age: 24 * 60 * 60, 
                count: 1_000,
            },
            removeOnFail:{
                age: 24 * 60 * 60,
                count: 1_000,
            },
        },
    },
);
