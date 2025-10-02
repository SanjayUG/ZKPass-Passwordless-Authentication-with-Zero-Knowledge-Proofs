import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as snarkjs from 'snarkjs';

export interface CircuitKeys {
    provingKey: Uint8Array;
    verificationKey: {
        protocol: string;
        curve: string;
        nPublic: number;
        vk_alpha_1: string[];
        vk_beta_2: string[][];
        vk_gamma_2: string[][];
        vk_delta_2: string[][];
        vk_alphabeta_12: string[][][];
        IC: string[][];
    };
}

export interface CircuitInputs {
    // Private inputs
    devicePrivateKey: string;
    uid: string;
    timestamp: number;
    nonce: string;

    // Public inputs
    uidHash: string;
    devicePublicKeyHash: string;
    timestampRange: [number, number];
    challenge: string;

    // Index signature for snarkjs compatibility
    [key: string]: string | number | number[] | string[];
}

export interface ZKProof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
}

export interface PublicSignals {
    uidHash: string;
    devicePublicKeyHash: string;
    timestampRange: [number, number];
    challenge: string;
}

export class CircuitManager {
    private buildDir: string;
    private keysDir: string;
    private circuitName: string;
    private execAsync = promisify(exec);

    constructor(circuitName: string = 'auth') {
        this.circuitName = circuitName;
        // Use process.cwd() to get the project root, then navigate to zkp directory
        const zkpDir = path.join(process.cwd(), 'zkp');
        this.buildDir = path.join(zkpDir, 'build', circuitName);
        this.keysDir = path.join(zkpDir, 'keys', circuitName);
    }

    async compileCircuit(circuitPath: string): Promise<void> {
        // Ensure output directory exists
        if (!fs.existsSync(this.buildDir)) {
            fs.mkdirSync(this.buildDir, { recursive: true });
        }

        try {
            const compileCmd = `circom ${circuitPath} --r1cs --wasm --sym -o ${this.buildDir}`;
            await this.execAsync(compileCmd);
        } catch (error: any) {
            throw new Error(`Circuit compilation failed: ${error.message}`);
        }
    }

    async generateKeys(): Promise<CircuitKeys> {
        const r1csPath = path.join(this.buildDir, `${this.circuitName}.r1cs`);

        if (!fs.existsSync(r1csPath)) {
            throw new Error(`R1CS file not found: ${r1csPath}. Compile circuit first.`);
        }

        // Ensure keys directory exists
        if (!fs.existsSync(this.keysDir)) {
            fs.mkdirSync(this.keysDir, { recursive: true });
        }

        try {
            // Generate ceremony parameters (simplified for development)
            const ptauPath = path.join(this.keysDir, 'powersOfTau28_hez_final_10.ptau');

            if (!fs.existsSync(ptauPath)) {
                // For development, create a small powers of tau file
                // In production, use a trusted ceremony file
                await snarkjs.powersOfTau.newAccumulator('bn128', 10, ptauPath);
            }

            // Generate zkey file (proving key)
            const zkeyPath = path.join(this.keysDir, `${this.circuitName}.zkey`);
            await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkeyPath);

            // Export verification key
            const vKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
            const vkeyPath = path.join(this.keysDir, `${this.circuitName}_vkey.json`);
            fs.writeFileSync(vkeyPath, JSON.stringify(vKey, null, 2));

            // Load proving key
            const provingKey = fs.readFileSync(zkeyPath);

            return {
                provingKey,
                verificationKey: vKey
            };
        } catch (error: any) {
            throw new Error(`Key generation failed: ${error.message}`);
        }
    }

    async loadKeys(): Promise<CircuitKeys> {
        const zkeyPath = path.join(this.keysDir, `${this.circuitName}_final.zkey`);
        const vkeyPath = path.join(this.keysDir, `${this.circuitName}_verification_key.json`);

        if (!fs.existsSync(zkeyPath)) {
            throw new Error(`Proving key not found: ${zkeyPath}`);
        }

        if (!fs.existsSync(vkeyPath)) {
            throw new Error(`Verification key not found: ${vkeyPath}`);
        }

        try {
            const provingKey = fs.readFileSync(zkeyPath);
            const verificationKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

            return {
                provingKey,
                verificationKey
            };
        } catch (error: any) {
            throw new Error(`Failed to load keys: ${error.message}`);
        }
    }

    async generateProof(inputs: CircuitInputs): Promise<ZKProof> {
        const wasmPath = path.join(this.buildDir, `${this.circuitName}_js`, `${this.circuitName}.wasm`);
        const zkeyPath = path.join(this.keysDir, `${this.circuitName}_final.zkey`);

        if (!fs.existsSync(wasmPath)) {
            throw new Error(`WASM file not found: ${wasmPath}`);
        }

        if (!fs.existsSync(zkeyPath)) {
            throw new Error(`Proving key not found: ${zkeyPath}`);
        }

        try {
            const { proof } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
            return proof;
        } catch (error: any) {
            throw new Error(`Proof generation failed: ${error.message}`);
        }
    }

    async verifyProof(proof: ZKProof, publicSignals: PublicSignals): Promise<boolean> {
        const vkeyPath = path.join(this.keysDir, `${this.circuitName}_verification_key.json`);

        if (!fs.existsSync(vkeyPath)) {
            throw new Error(`Verification key not found: ${vkeyPath}`);
        }

        try {
            const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

            // Convert PublicSignals to array format expected by snarkjs
            const publicSignalsArray = [
                publicSignals.uidHash,
                publicSignals.devicePublicKeyHash,
                publicSignals.timestampRange[0].toString(),
                publicSignals.timestampRange[1].toString(),
                publicSignals.challenge
            ];

            return await snarkjs.groth16.verify(vKey, publicSignalsArray, proof);
        } catch (error: any) {
            throw new Error(`Proof verification failed: ${error.message}`);
        }
    }

    // Utility methods
    isSetupComplete(): boolean {
        const wasmPath = path.join(this.buildDir, `${this.circuitName}_js`, `${this.circuitName}.wasm`);
        const zkeyPath = path.join(this.keysDir, `${this.circuitName}_final.zkey`);
        const vkeyPath = path.join(this.keysDir, `${this.circuitName}_verification_key.json`);

        return fs.existsSync(wasmPath) && fs.existsSync(zkeyPath) && fs.existsSync(vkeyPath);
    }

    getCircuitInfo(): any {
        const r1csPath = path.join(this.buildDir, `${this.circuitName}.r1cs`);
        const wasmPath = path.join(this.buildDir, `${this.circuitName}_js`, `${this.circuitName}.wasm`);
        const zkeyPath = path.join(this.keysDir, `${this.circuitName}_final.zkey`);

        const info: any = {
            circuitName: this.circuitName,
            compiled: fs.existsSync(r1csPath) && fs.existsSync(wasmPath),
            keysGenerated: fs.existsSync(zkeyPath),
            setupComplete: this.isSetupComplete()
        };

        if (info.compiled) {
            try {
                const r1csStats = fs.statSync(r1csPath);
                info.r1csSize = r1csStats.size;
            } catch (error) {
                // Ignore error
            }
        }

        if (info.keysGenerated) {
            try {
                const zkeyStats = fs.statSync(zkeyPath);
                info.provingKeySize = zkeyStats.size;
            } catch (error) {
                // Ignore error
            }
        }

        return info;
    }
}