import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;

const ITERATIONS = 600_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;

export async function hashPassword(
    password: string, 
): Promise<string> {

    const salt = webcrypto.getRandomValues(
        new Uint8Array(SALT_LENGTH),
    );

    const passwordKey = await subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const derivedBits = await subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: ITERATIONS,
            hash: "SHA-256",
        },
        passwordKey,
        KEY_LENGTH,
    );

    const hash = new Uint8Array(derivedBits);

    return [
        "pbkdf2",
        "sha256",
        ITERATIONS,
        Buffer.from(salt).toString("base64"),
        Buffer.from(hash).toString("base64"),
    ].join("$");

}

export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean>{
    const parts = storedHash.split("$");

    if(parts.length !== 5){
        return false;
    }

    const [
        algorithm,
        hashAlgorithm,
        iterationsString,
        saltBase64,
        hashBase64,
    ] = parts;

    if(
        algorithm !== "pbkdf2" ||
        hashAlgorithm !== "sha256"
    ) {
        return false;
    }

    const iterations = Number(iterationsString);

    if(
        !Number.isInteger(iterations) || 
        iterations <= 0
    ) {
        return false;
    }

    const salt = Uint8Array.from(
        Buffer.from(saltBase64, "base64"),
    );

    const expectedHash = Uint8Array.from(
        Buffer.from(hashBase64, "base64"),
    )

    const passwordKey = await subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const deriveBits = await subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256",
        },
        passwordKey,
        expectedHash.length * 8,
    );

    const derivedHash = new Uint8Array(deriveBits);

    if (derivedHash.length !== expectedHash.length){
        return false;
    }

    let difference = 0;

    for (let i=0; i < derivedHash.length; i++){
        difference |= derivedHash[i] ^ expectedHash[i];
    }

    return difference === 0; 
}