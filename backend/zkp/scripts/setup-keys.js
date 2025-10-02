const fs = require('fs');
const path = require('path');
const https = require('https');
const snarkjs = require('snarkjs');

const BUILD_DIR = path.join(__dirname, '../build');
const KEYS_DIR = path.join(__dirname, '../keys');

// Download file from URL
function downloadFile(url, destinationPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destinationPath);
        
        console.log(`Downloading from ${url}...`);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                file.close();
                fs.unlinkSync(destinationPath);
                return downloadFile(response.headers.location, destinationPath)
                    .then(resolve)
                    .catch(reject);
            }
            
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destinationPath);
                return reject(new Error(`Failed to download: ${response.statusCode}`));
            }
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            let lastProgress = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const progress = Math.floor((downloadedSize / totalSize) * 100);
                
                // Only log every 10% to avoid spam
                if (progress >= lastProgress + 10) {
                    console.log(`   Progress: ${progress}%`);
                    lastProgress = progress;
                }
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log('   Download completed!');
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(destinationPath);
            reject(err);
        });
    });
}

async function setupKeys(circuitName) {
    console.log(`Setting up keys for circuit: ${circuitName}`);
    
    const circuitBuildDir = path.join(BUILD_DIR, circuitName);
    const r1csPath = path.join(circuitBuildDir, `${circuitName}.r1cs`);
    const wasmPath = path.join(circuitBuildDir, `${circuitName}_js`, `${circuitName}.wasm`);
    
    // Ensure keys directory exists
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }
    
    const circuitKeysDir = path.join(KEYS_DIR, circuitName);
    if (!fs.existsSync(circuitKeysDir)) {
        fs.mkdirSync(circuitKeysDir, { recursive: true });
    }
    
    try {
        // Check if circuit files exist
        if (!fs.existsSync(r1csPath)) {
            throw new Error(`R1CS file not found: ${r1csPath}. Run compile-circuits.js first.`);
        }
        
        if (!fs.existsSync(wasmPath)) {
            throw new Error(`WASM file not found: ${wasmPath}. Run compile-circuits.js first.`);
        }
        
        console.log('📋 Preparing trusted setup...');
        
        // Powers of tau file - using Hermez's trusted ceremony
        const ptauPath = path.join(circuitKeysDir, 'powersOfTau28_hez_final_12.ptau');
        
        // Download powers of tau if not exists
        if (!fs.existsSync(ptauPath)) {
            console.log('🌐 Downloading powers of tau file...');
            console.log('   This is a one-time download (~3-4 MB)...');
            
            // Try multiple sources
            const ptauUrls = [
                'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau',
                'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau',
                'https://hermez.s3.eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau'
            ];
            
            let downloadSuccess = false;
            
            for (let i = 0; i < ptauUrls.length; i++) {
                const url = ptauUrls[i];
                console.log(`   Trying source ${i + 1}/${ptauUrls.length}...`);
                
                try {
                    await downloadFile(url, ptauPath);
                    console.log('✅ Powers of tau file downloaded successfully');
                    downloadSuccess = true;
                    break;
                } catch (downloadError) {
                    console.log(`   ⚠️  Source ${i + 1} failed: ${downloadError.message}`);
                    if (fs.existsSync(ptauPath)) {
                        fs.unlinkSync(ptauPath);
                    }
                }
            }
            
            if (!downloadSuccess) {
                console.error('\n❌ All download sources failed.');
                console.log('\n📥 Please manually download the powers of tau file:');
                console.log('\n   Option 1: Download from GitHub');
                console.log('   URL: https://github.com/iden3/snarkjs#7-prepare-phase-2');
                console.log('   Look for powersOfTau28_hez_final_12.ptau');
                console.log('\n   Option 2: Generate it yourself (takes time)');
                console.log('   Run: npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v');
                console.log('   Then: npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First" -v');
                console.log('   Finally: npx snarkjs powersoftau prepare phase2 pot12_0001.ptau powersOfTau28_hez_final_12.ptau -v');
                console.log(`\n   Place the file at: ${ptauPath}`);
                console.log('\n   Then run this setup script again.');
                throw new Error('Powers of tau file download failed from all sources');
            }
        } else {
            console.log('✅ Powers of tau file already exists');
        }
        
        // Generate the zkey
        const zkeyPath = path.join(circuitKeysDir, `${circuitName}_0000.zkey`);
        
        if (!fs.existsSync(zkeyPath)) {
            console.log('🔑 Generating initial zkey...');
            await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkeyPath);
            console.log('✅ Generated initial zkey');
        } else {
            console.log('✅ Initial zkey already exists');
        }
        
        // Add a contribution to the zkey (Phase 2 contribution)
        const zkeyFinalPath = path.join(circuitKeysDir, `${circuitName}_final.zkey`);
        
        if (!fs.existsSync(zkeyFinalPath)) {
            console.log('🔐 Adding circuit-specific contribution...');
            await snarkjs.zKey.contribute(
                zkeyPath,
                zkeyFinalPath,
                'First contribution',
                Math.random().toString(36).substring(2, 15)
            );
            console.log('✅ Added contribution');
        } else {
            console.log('✅ Final zkey already exists');
        }
        
        // Export verification key
        const vkeyPath = path.join(circuitKeysDir, `${circuitName}_verification_key.json`);
        
        if (!fs.existsSync(vkeyPath)) {
            console.log('📤 Exporting verification key...');
            const vKey = await snarkjs.zKey.exportVerificationKey(zkeyFinalPath);
            fs.writeFileSync(vkeyPath, JSON.stringify(vKey, null, 2));
            console.log('✅ Exported verification key');
        } else {
            console.log('✅ Verification key already exists');
        }
        
        // Read the verification key
        const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
        
        console.log(`\n✅ Setup complete for ${circuitName}`);
        console.log(`   📁 Keys directory: ${circuitKeysDir}`);
        console.log(`   🔑 Proving key: ${circuitName}_final.zkey`);
        console.log(`   ✓ Verification key: ${circuitName}_verification_key.json`);
        
        return {
            zkeyPath: zkeyFinalPath,
            vkeyPath,
            vKey
        };
        
    } catch (error) {
        console.error(`❌ Failed to setup keys for ${circuitName}:`, error.message);
        throw error;
    }
}

async function setupAllKeys() {
    console.log('🔐 Starting ZKP key generation...\n');
    
    const circuits = ['auth']; // Add more circuits here as needed
    const results = {};
    
    for (const circuit of circuits) {
        try {
            console.log('─'.repeat(60));
            results[circuit] = await setupKeys(circuit);
            console.log('─'.repeat(60));
            console.log('');
        } catch (error) {
            console.error(`\n❌ Failed to setup keys for ${circuit}`);
            console.error('Error details:', error.message);
            process.exit(1);
        }
    }
    
    console.log('🎉 All keys generated successfully!\n');
    console.log('You can now generate and verify proofs using these keys.');
    
    return results;
}

// Run if called directly
if (require.main === module) {
    setupAllKeys().catch(error => {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = { setupKeys, setupAllKeys };