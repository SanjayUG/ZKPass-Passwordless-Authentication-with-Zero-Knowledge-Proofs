/**
 * ZKP Service - Integrated Proof Generation and Verification Service
 * 
 * This service provides a unified interface for ZKP operations, combining
 * proof generation and verification with performance optimization and error handling.
 * 
 * Requirements: 1.2, 1.3, 1.6, 1.7, 8.2, 8.3
 */

import { 
  ZKPProofGenerator, 
  ZKPError, 
  ZKPErrorCode,
  ProofGenerationOptions,
  ProofGenerationResult 
} from './proofGenerator';

import { 
  ZKPProofVerifier, 
  VerificationError, 
  VerificationErrorCode,
  VerificationResult,
  VerificationOptions 
} from './proofVerifier';

import { CircuitManager, ZKProof, PublicSignals } from './circuitManager';

export interface ZKPServiceConfig {
  circuitName?: string;
  enablePerformanceLogging?: boolean;
  enableBlockchainVerification?: boolean;
  proofGenerationTimeout?: number;
  verificationTimeout?: number;
  cacheEnabled?: boolean;
}

export interface AuthenticationRequest {
  uid: string;
  devicePrivateKey?: string;
  deviceSignature?: string;
  challenge?: string;
}

export interface AuthenticationResponse {
  success: boolean;
  proof?: ZKProof;
  publicSignals?: PublicSignals;
  verificationResult?: VerificationResult;
  generationTime?: number;
  verificationTime?: number;
  error?: string;
  errorCode?: string;
}

export interface ServiceMetrics {
  totalProofsGenerated: number;
  totalVerifications: number;
  averageGenerationTime: number;
  averageVerificationTime: number;
  successRate: number;
  errorRate: number;
  cacheHitRate: number;
}

/**
 * Integrated ZKP Service for proof generation and verification
 * Provides high-level interface for ZKP operations with performance optimization
 */
export class ZKPService {
  private proofGenerator: ZKPProofGenerator;
  private proofVerifier: ZKPProofVerifier;
  private circuitManager: CircuitManager;
  private config: ZKPServiceConfig;
  private metrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalGenerationTime: number;
    totalVerificationTime: number;
  };

  constructor(config: ZKPServiceConfig = {}) {
    this.config = {
      circuitName: 'auth',
      enablePerformanceLogging: false,
      enableBlockchainVerification: false,
      proofGenerationTimeout: 5000, // 5 seconds per requirement 1.6
      verificationTimeout: 100, // 100ms per requirement 1.7
      cacheEnabled: true,
      ...config
    };

    this.proofGenerator = new ZKPProofGenerator(this.config.circuitName);
    this.proofVerifier = new ZKPProofVerifier(this.config.circuitName);
    this.circuitManager = new CircuitManager(this.config.circuitName);

    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalGenerationTime: 0,
      totalVerificationTime: 0
    };
  }

  /**
   * Complete authentication flow: generate and verify proof
   * Requirements: 1.2, 1.3, 2.1, 2.2, 2.5, 2.6, 2.7
   * 
   * @param request Authentication request with user credentials
   * @returns Authentication response with proof and verification result
   */
  async authenticate(request: AuthenticationRequest): Promise<AuthenticationResponse> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      // Validate request
      if (!request.uid) {
        throw new Error('UID is required for authentication');
      }

      if (!request.devicePrivateKey && !request.deviceSignature) {
        throw new Error('Either devicePrivateKey or deviceSignature is required');
      }

      // Generate proof
      let proofResult: ProofGenerationResult;
      
      if (request.devicePrivateKey) {
        proofResult = await this.proofGenerator.generateProof(
          request.uid,
          request.devicePrivateKey,
          {
            timeout: this.config.proofGenerationTimeout,
            enablePerformanceLogging: this.config.enablePerformanceLogging
          }
        );
      } else if (request.deviceSignature) {
        proofResult = await this.proofGenerator.generateProofWithDeviceKey(
          request.uid,
          request.deviceSignature,
          {
            timeout: this.config.proofGenerationTimeout,
            enablePerformanceLogging: this.config.enablePerformanceLogging
          }
        );
      } else {
        throw new Error('No valid authentication method provided');
      }

      // Verify proof
      const verificationResult = await this.proofVerifier.verifyZKProof(
        proofResult.proof,
        proofResult.publicSignals,
        request.uid,
        {
          timeout: this.config.verificationTimeout,
          enableBlockchainVerification: this.config.enableBlockchainVerification,
          enablePerformanceLogging: this.config.enablePerformanceLogging
        }
      );

      const totalTime = Date.now() - startTime;
      this.metrics.successfulOperations++;
      this.metrics.totalGenerationTime += proofResult.generationTime;
      this.metrics.totalVerificationTime += verificationResult.verificationTime;

      if (this.config.enablePerformanceLogging) {
        console.log(`Authentication completed in ${totalTime}ms (generation: ${proofResult.generationTime}ms, verification: ${verificationResult.verificationTime}ms)`);
      }

      return {
        success: verificationResult.isValid,
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
        verificationResult,
        generationTime: proofResult.generationTime,
        verificationTime: verificationResult.verificationTime
      };

    } catch (error) {
      this.metrics.failedOperations++;
      
      let errorCode = 'AUTHENTICATION_FAILED';
      if (error instanceof ZKPError) {
        errorCode = error.code;
      } else if (error instanceof VerificationError) {
        errorCode = error.code;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.config.enablePerformanceLogging) {
        console.error(`Authentication failed: ${errorMessage}`);
      }

      return {
        success: false,
        error: errorMessage,
        errorCode
      };
    }
  }

  /**
   * Batch authentication for multiple users
   * Requirements: 8.2, 8.3
   * 
   * @param requests Array of authentication requests
   * @returns Array of authentication responses
   */
  async batchAuthenticate(requests: AuthenticationRequest[]): Promise<AuthenticationResponse[]> {
    const batchStartTime = Date.now();
    
    try {
      // Process authentications in parallel
      const authPromises = requests.map(async (request, index) => {
        try {
          return await this.authenticate(request);
        } catch (error) {
          console.error(`Batch authentication failed for request ${index}:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            errorCode: 'BATCH_AUTHENTICATION_FAILED'
          };
        }
      });

      const results = await Promise.allSettled(authPromises);
      const responses: AuthenticationResponse[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          responses.push(result.value);
        } else {
          responses.push({
            success: false,
            error: `Batch item ${index} failed: ${result.reason}`,
            errorCode: 'BATCH_ITEM_FAILED'
          });
        }
      });

      const batchTime = Date.now() - batchStartTime;
      const successCount = responses.filter(r => r.success).length;

      if (this.config.enablePerformanceLogging) {
        console.log(`Batch authentication completed: ${successCount}/${requests.length} successful in ${batchTime}ms`);
      }

      return responses;
    } catch (error) {
      throw new Error(`Batch authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify an existing proof without generating a new one
   * Requirements: 1.7, 8.3
   * 
   * @param proof The zkSNARK proof to verify
   * @param publicSignals Public signals for the proof
   * @param uid User's unique identifier
   * @returns Verification result
   */
  async verifyExistingProof(
    proof: ZKProof,
    publicSignals: PublicSignals,
    uid: string
  ): Promise<VerificationResult> {
    try {
      return await this.proofVerifier.verifyZKProof(
        proof,
        publicSignals,
        uid,
        {
          timeout: this.config.verificationTimeout,
          enableBlockchainVerification: this.config.enableBlockchainVerification,
          enablePerformanceLogging: this.config.enablePerformanceLogging
        }
      );
    } catch (error) {
      throw new VerificationError(
        VerificationErrorCode.PROOF_VERIFICATION_FAILED,
        `Failed to verify existing proof: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if the ZKP system is properly set up and ready
   * Requirements: 1.4, 2.4
   * 
   * @returns Setup status information
   */
  isSystemReady(): {
    ready: boolean;
    circuitCompiled: boolean;
    keysGenerated: boolean;
    setupComplete: boolean;
    circuitInfo: any;
  } {
    const setupComplete = this.circuitManager.isSetupComplete();
    const circuitInfo = this.circuitManager.getCircuitInfo();

    return {
      ready: setupComplete,
      circuitCompiled: circuitInfo.compiled,
      keysGenerated: circuitInfo.keysGenerated,
      setupComplete: circuitInfo.setupComplete,
      circuitInfo
    };
  }

  /**
   * Get comprehensive service metrics
   * Requirements: 8.2, 8.3
   * 
   * @returns Service performance metrics
   */
  getServiceMetrics(): ServiceMetrics {
    const generatorMetrics = this.proofGenerator.getPerformanceMetrics();
    const verifierMetrics = this.proofVerifier.getPerformanceMetrics();

    const totalOperations = this.metrics.totalOperations;
    const successRate = totalOperations > 0 ? (this.metrics.successfulOperations / totalOperations) * 100 : 0;
    const errorRate = totalOperations > 0 ? (this.metrics.failedOperations / totalOperations) * 100 : 0;

    return {
      totalProofsGenerated: generatorMetrics.totalProofsGenerated,
      totalVerifications: verifierMetrics.totalVerifications,
      averageGenerationTime: generatorMetrics.averageGenerationTime,
      averageVerificationTime: verifierMetrics.averageVerificationTime,
      successRate,
      errorRate,
      cacheHitRate: verifierMetrics.cacheHitRate
    };
  }

  /**
   * Reset service metrics and caches
   */
  resetMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalGenerationTime: 0,
      totalVerificationTime: 0
    };

    if (this.config.cacheEnabled) {
      this.proofVerifier.clearCache();
    }
  }

  /**
   * Update service configuration
   * 
   * @param newConfig Updated configuration options
   */
  updateConfig(newConfig: Partial<ZKPServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Health check for the ZKP service
   * 
   * @returns Health status information
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      circuitSetup: boolean;
      proofGeneration: boolean;
      proofVerification: boolean;
    };
    metrics: ServiceMetrics;
  }> {
    const checks = {
      circuitSetup: false,
      proofGeneration: false,
      proofVerification: false
    };

    try {
      // Check circuit setup
      checks.circuitSetup = this.circuitManager.isSetupComplete();

      // Test proof generation (with dummy data)
      if (checks.circuitSetup) {
        try {
          const testResult = await this.proofGenerator.generateProof(
            'test-uid',
            'test-device-key',
            { timeout: 1000 }
          );
          checks.proofGeneration = true;

          // Test proof verification
          const verificationResult = await this.proofVerifier.verifyZKProof(
            testResult.proof,
            testResult.publicSignals,
            'test-uid',
            { timeout: 200 }
          );
          checks.proofVerification = verificationResult.isValid;
        } catch (error) {
          console.warn('Health check proof generation/verification failed:', error);
        }
      }

      const allHealthy = Object.values(checks).every(check => check);
      const someHealthy = Object.values(checks).some(check => check);

      const status = allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy';

      return {
        status,
        checks,
        metrics: this.getServiceMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        checks,
        metrics: this.getServiceMetrics()
      };
    }
  }
}

// Export default instance for convenience
export const zkpService = new ZKPService();