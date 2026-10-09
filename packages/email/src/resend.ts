import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;

if(!key){
    throw new Error("key not found for sending mails");
}

export const resend = new Resend(key);