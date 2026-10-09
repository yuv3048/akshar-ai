import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;

export function generateOtp(): string{
    const random = webcrypto.getRandomValues(
        new Uint32Array(1),
    )[0];

    return String(random % 1_000_000).padStart(6, "0");

}

export async function hashOtp(otp: string): Promise<string>{
    const data = new TextEncoder().encode(otp);

    const hashBuffer = await subtle.digest(
        "SHA-256",
        data,
    );

    return Buffer.from(hashBuffer).toString("base64");
}