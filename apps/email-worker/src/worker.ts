import dotenv from "dotenv";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { sendEmail } from "@akshar/email";
import type { EMAILJOB } from "@akshar/email";

dotenv.config();

const redisUrl = process.env.QUEUE_REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(redisUrl,{
    maxRetriesPerRequest: null,
});

function createEmailWorker(queueName: string){

    return new Worker<EMAILJOB>(
        queueName,
        async (job) =>{

            console.log(`Processing ${job.name} from ${queueName}`)

            await sendEmail(job.data);

            console.log(`Email job ${job.id} completed`)
        } ,
        {
            connection,
            concurrency: queueName === "auth-email" ? 5 : 2,
        },
    );
}

const authWorker = createEmailWorker("auth-email");
const notificationWorker = createEmailWorker("notification-email");

for(const worker of [authWorker, notificationWorker]){

    worker.on("failed", (job, error)=>{
        console.error("Email job failed",{
            queue: worker.name,
            jobId: job?.id,
            error: error.message,
        });
    });

    worker.on("error",(error)=>{
        console.error("Email worker error:", error.message);
    });
}

console.log("Akshar email workers started");

