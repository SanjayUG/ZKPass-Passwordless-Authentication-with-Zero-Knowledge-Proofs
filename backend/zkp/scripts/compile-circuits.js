const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const CIRCUITS_DIR = path.join(__dirname, '../circuits');
const BUILD_DIR = path.join(__dirname, '../build');

async function compileCircuit(circuitName) {
    console.log(`Compiling circuit: ${circuitName}`);
    
    const circuitPath = path.join(CIRCUITS_DIR, `${circuitName}.circom`);
    const outputDir = path.join(BUILD_DIR, circuitName);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
        // Compile circuit with circom
        const nodeModulesPath = path.join(__dirname, '../../node_modules');
        const compileCmd = `circom ${circuitPath} --r1cs --wasm --sym -o ${outputDir} -l ${nodeModulesPath}`;
        console.log(`Running: ${compileCmd}`);
        
        const { stdout, stderr } = await execAsync(compileCmd);
        
        if (stderr) {
            console.warn('Compilation warnings:', stderr);
        }
        
        console.log('Compilation output:', stdout);
        console.log(` Circuit ${circuitName} compiled successfully`);
        
        // Verify output files exist
        const expectedFiles = [
            `${circuitName}.r1cs`,
            `${circuitName}_js/${circuitName}.wasm`,
            `${circuitName}.sym`
        ];
        
        for (const file of expectedFiles) {
            const filePath = path.join(outputDir, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Expected output file not found: ${filePath}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Failed to compile circuit ${circuitName}:`, error.message);
        return false;
    }
}

async function compileAllCircuits() {
    console.log('🔧 Starting circuit compilation...');
    
    // Ensure build directory exists
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }
    
    const circuits = ['auth']; // Add more circuits here as needed
    let allSuccess = true;
    
    for (const circuit of circuits) {
        const success = await compileCircuit(circuit);
        if (!success) {
            allSuccess = false;
        }
    }
    
    if (allSuccess) {
        console.log('🎉 All circuits compiled successfully!');
    } else {
        console.error('❌ Some circuits failed to compile');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    compileAllCircuits().catch(console.error);
}

module.exports = { compileCircuit, compileAllCircuits };
