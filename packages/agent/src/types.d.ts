// Type declarations for modules without TypeScript support

declare module 'snarkjs' {
    export const groth16: {
        fullProve: (
            input: Record<string, bigint | string | number>,
            wasmFile: string,
            zkeyFile: string
        ) => Promise<{
            proof: {
                pi_a: string[];
                pi_b: string[][];
                pi_c: string[];
                protocol: string;
                curve: string;
            };
            publicSignals: string[];
        }>;

        verify: (
            vkey: Record<string, unknown>,
            publicSignals: string[],
            proof: Record<string, unknown>
        ) => Promise<boolean>;

        exportSolidityCallData: (
            proof: Record<string, unknown>,
            publicSignals: string[]
        ) => Promise<string>;
    };

    export function wtns(
        input: Record<string, unknown>,
        wasm: string | Uint8Array
    ): Promise<Uint8Array>;

    export function zKey(): {
        exportVerificationKey: (
            zkeyFile: string
        ) => Promise<Record<string, unknown>>;
    };
}

declare module 'circomlibjs' {
    export interface Poseidon {
        (inputs: bigint[]): bigint;
        F: {
            toString: (value: bigint) => string;
        };
    }

    export function buildPoseidon(): Promise<Poseidon>;
}
