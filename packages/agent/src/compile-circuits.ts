// * Usage: pnpm run zk:compile

import { existsSync, mkdirSync, writeFileSync, renameSync, rmSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// @ts-expect-error - snarkjs has no type declarations
import { zKey } from 'snarkjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import { createWriteStream } from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ================================
// Configuration
// ================================

const config = {
    circuits: ['circuit'],  // Circuit names (without .circom extension)
    paths: {
        circuits: join(__dirname, 'zk'),
        build: join(__dirname, 'zk/build'),
        contracts: join(__dirname, '../contracts'),
    },
    ptau: {
        // Powers of Tau file (pot14 supports up to 2^14 constraints)
        file: 'powersOfTau28_hez_final_14.ptau',
        url: 'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau',
    },
    solidity: {
        version: '0.8.20',
    },
};

// ================================
// Utilities
// ================================

/**
 * Download a file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`📥 Downloading: ${url}`);
        const file = createWriteStream(destPath);

        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                https.get(response.headers.location!, (redirectResponse) => {
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', reject);
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }
        }).on('error', (err) => {
            rmSync(destPath, { force: true });
            reject(err);
        });
    });
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Clean up directory recursively
 */
function cleanupDir(dirPath: string): void {
    if (existsSync(dirPath)) {
        rmSync(dirPath, { recursive: true, force: true });
    }
}

// ================================
// Main Compilation Function
// ================================

async function compileCircuit(circuitName: string): Promise<void> {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  Compiling: ${circuitName}`);
    console.log(`${'═'.repeat(50)}\n`);

    const circuitFile = join(config.paths.circuits, `${circuitName}.circom`);
    const buildPath = config.paths.build;
    const ptauPath = join(config.paths.circuits, config.ptau.file);

    // Check circuit file exists
    if (!existsSync(circuitFile)) {
        throw new Error(`Circuit file not found: ${circuitFile}`);
    }

    // Create build directory
    if (!existsSync(buildPath)) {
        mkdirSync(buildPath, { recursive: true });
    }

    // ================================
    // Step 1: Download Powers of Tau if needed
    // ================================
    if (!existsSync(ptauPath)) {
        console.log('📥 Downloading Powers of Tau...');
        await downloadFile(config.ptau.url, ptauPath);
        console.log('✅ Powers of Tau downloaded\n');
    } else {
        console.log('✅ Powers of Tau exists\n');
    }

    // ================================
    // Step 2: Compile Circuit
    // ================================
    console.log('🔧 Compiling circuit...');

    // Use circomlib from agent package's node_modules
    const circomlibPath = join(__dirname, '../node_modules/circomlib');

    if (!existsSync(circomlibPath)) {
        throw new Error('circomlib not found. Run: pnpm add -D circomlib');
    }

    await execAsync(
        `circom ${circuitFile} --r1cs --wasm -o ${buildPath} -l ${join(__dirname, '../node_modules')}`
    );
    console.log('✅ Circuit compiled\n');

    // ================================
    // Step 3: Generate Initial zkey
    // ================================
    console.log('🔐 Generating initial zkey...');

    const r1csPath = join(buildPath, `${circuitName}.r1cs`);
    const zkey0Path = join(buildPath, `${circuitName}_0000.zkey`);

    await zKey.newZKey(r1csPath, ptauPath, zkey0Path, console);
    console.log('✅ Initial zkey created\n');

    // ================================
    // Step 4: Apply Beacon (Final zkey)
    // ================================
    console.log('🎲 Applying beacon contribution...');

    const zkeyFinalPath = join(buildPath, `${circuitName}_final.zkey`);

    await zKey.beacon(
        zkey0Path,
        zkeyFinalPath,
        'Final Beacon',
        '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
        10,
        console
    );
    console.log('✅ Final zkey created\n');

    // ================================
    // Step 5: Export Solidity Verifier
    // ================================
    console.log('📜 Generating Solidity verifier...');

    // Create contracts directory if needed
    if (!existsSync(config.paths.contracts)) {
        mkdirSync(config.paths.contracts, { recursive: true });
    }

    // Read verifier template
    const templatePath = join(__dirname, '../node_modules/snarkjs/templates/verifier_groth16.sol.ejs');
    let template = '';
    if (existsSync(templatePath)) {
        template = readFileSync(templatePath, 'utf8');
    }

    let verifierCode = await zKey.exportSolidityVerifier(
        zkeyFinalPath,
        template ? { groth16: template } : undefined,
        console
    );

    // Update Solidity version
    verifierCode = verifierCode.replace(
        /pragma solidity \^\d+\.\d+\.\d+/,
        `pragma solidity ^${config.solidity.version}`
    );

    writeFileSync(
        join(config.paths.contracts, `Verifier${capitalize(circuitName)}.sol`),
        verifierCode,
        'utf-8'
    );
    console.log('✅ Solidity verifier generated\n');

    // ================================
    // Step 6: Export Verification Key
    // ================================
    console.log('🔑 Exporting verification key...');

    const verificationKey = await zKey.exportVerificationKey(zkeyFinalPath, console);

    writeFileSync(
        join(buildPath, `${circuitName}_verification_key.json`),
        JSON.stringify(verificationKey, null, 2),
        'utf-8'
    );

    // Also copy to zk directory for easy access
    writeFileSync(
        join(config.paths.circuits, 'verification_key.json'),
        JSON.stringify(verificationKey, null, 2),
        'utf-8'
    );
    console.log('✅ Verification key exported\n');

    // ================================
    // Step 7: Cleanup & Organize
    // ================================
    console.log('🧹 Cleaning up...');

    // Move WASM to build root
    const wasmSrcPath = join(buildPath, `${circuitName}_js/${circuitName}.wasm`);
    const wasmDestPath = join(buildPath, `${circuitName}.wasm`);

    if (existsSync(wasmSrcPath)) {
        renameSync(wasmSrcPath, wasmDestPath);
    }

    // Also copy to zk directory for prove.ts to find
    const wasmZkPath = join(config.paths.circuits, 'circuit_js');
    if (!existsSync(wasmZkPath)) {
        mkdirSync(wasmZkPath, { recursive: true });
    }
    if (existsSync(wasmDestPath)) {
        // Copy file
        writeFileSync(
            join(wasmZkPath, 'circuit.wasm'),
            readFileSync(wasmDestPath)
        );
    }

    // Copy final zkey to zk directory
    writeFileSync(
        join(config.paths.circuits, 'circuit_final.zkey'),
        readFileSync(zkeyFinalPath)
    );

    // Remove intermediate files
    rmSync(zkey0Path, { force: true });
    cleanupDir(join(buildPath, `${circuitName}_js`));
    rmSync(join(buildPath, `${circuitName}.r1cs`), { force: true });
    rmSync(join(buildPath, `${circuitName}.sym`), { force: true });

    console.log('✅ Cleanup complete\n');
}

// ================================
// Main Entry Point
// ================================

async function main(): Promise<void> {
    console.log('═'.repeat(50));
    console.log('  ZK Circuit Compilation');
    console.log('═'.repeat(50));
    console.log('');

    // Check circom is installed
    try {
        const { stdout } = await execAsync('circom --version');
        console.log(`✅ Circom: ${stdout.trim()}`);
    } catch {
        console.error('❌ Circom not found. Please install it:');
        console.error('   https://docs.circom.io/getting-started/installation/');
        process.exit(1);
    }

    // Compile all circuits
    for (const circuit of config.circuits) {
        try {
            await compileCircuit(circuit);
        } catch (err) {
            console.error(`❌ Error compiling ${circuit}:`, err);
            process.exit(1);
        }
    }

    console.log('═'.repeat(50));
    console.log('  ✅ All circuits compiled successfully!');
    console.log('═'.repeat(50));
    console.log('');
    console.log('Generated files:');
    console.log('  📁 src/zk/build/           - Build artifacts');
    console.log('  🔑 src/zk/circuit_final.zkey');
    console.log('  🔑 src/zk/verification_key.json');
    console.log('  📜 contracts/VerifierCircuit.sol');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
