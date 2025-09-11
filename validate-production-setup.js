/**
 * Production Setup Validation Script
 * Validates that all production-ready components are in place
 * without requiring external dependencies or running servers
 */

const fs = require('fs');
const path = require('path');

class ProductionValidator {
  constructor() {
    this.results = [];
    this.projectRoot = __dirname;
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status.toUpperCase()}: ${message}`);
    this.results.push({ timestamp, message, status });
  }

  fileExists(filePath) {
    return fs.existsSync(path.join(this.projectRoot, filePath));
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(this.projectRoot, filePath), 'utf8');
    } catch (error) {
      return null;
    }
  }

  validateFile(filePath, description) {
    if (this.fileExists(filePath)) {
      this.log(`✓ ${description} exists: ${filePath}`, 'pass');
      return true;
    } else {
      this.log(`✗ ${description} missing: ${filePath}`, 'fail');
      return false;
    }
  }

  validateFileContent(filePath, searchText, description) {
    const content = this.readFile(filePath);
    if (content && content.includes(searchText)) {
      this.log(`✓ ${description}`, 'pass');
      return true;
    } else {
      this.log(`✗ ${description}`, 'fail');
      return false;
    }
  }

  async runValidation() {
    this.log('Starting production setup validation');
    
    this.validateCoreFiles();
    this.validateErrorHandling();
    this.validateLogging();
    this.validateConfiguration();
    this.validateTypeDefinitions();
    this.validateDocumentation();
    
    this.generateReport();
  }

  validateCoreFiles() {
    this.log('Validating core project files');
    
    // Frontend core files
    this.validateFile('frontend/package.json', 'Frontend package.json');
    this.validateFile('frontend/next.config.js', 'Next.js configuration');
    this.validateFile('frontend/tsconfig.json', 'TypeScript configuration');
    
    // Backend core files
    this.validateFile('backend/src/polytrader/graph.py', 'Backend graph implementation');
    this.validateFile('backend/src/polytrader/state.py', 'Backend state definitions');
    this.validateFile('backend/langgraph.json', 'LangGraph configuration');
    
    // Root configuration
    this.validateFile('package.json', 'Root package.json');
  }

  validateErrorHandling() {
    this.log('Validating error handling implementation');
    
    // Frontend error handling
    this.validateFile('frontend/lib/utils/data-validation.ts', 'Data validation utilities');
    this.validateFile('frontend/components/error-boundary.tsx', 'Error boundary component');
    
    // Check for error handling patterns
    this.validateFileContent(
      'frontend/lib/utils/data-validation.ts',
      'DataValidationError',
      'DataValidationError class implemented'
    );
    
    this.validateFileContent(
      'frontend/components/error-boundary.tsx',
      'AgentStreamErrorBoundary',
      'Agent stream error boundary implemented'
    );
    
    // Backend error handling
    this.validateFile('backend/src/polytrader/logger.py', 'Backend logging system');
    
    this.validateFileContent(
      'backend/src/polytrader/logger.py',
      'log_agent_execution',
      'Agent execution logging decorator implemented'
    );
  }

  validateLogging() {
    this.log('Validating logging and monitoring setup');
    
    // Frontend logging
    this.validateFile('frontend/lib/utils/logger.ts', 'Frontend logging utilities');
    
    this.validateFileContent(
      'frontend/lib/utils/logger.ts',
      'LogLevel',
      'Log level enumeration defined'
    );
    
    this.validateFileContent(
      'frontend/lib/utils/logger.ts',
      'agentStart',
      'Agent-specific logging methods implemented'
    );
    
    // Backend logging integration
    this.validateFileContent(
      'backend/src/polytrader/graph.py',
      'log_agent_execution',
      'Backend logging decorators integrated'
    );
  }

  validateConfiguration() {
    this.log('Validating production configuration files');
    
    // Environment files
    this.validateFile('frontend/.env.production', 'Frontend production environment');
    this.validateFile('backend/.env.production', 'Backend production environment');
    this.validateFile('.env.example', 'Environment example file');
    
    // Check for required environment variables
    this.validateFileContent(
      'frontend/.env.production',
      'LANGGRAPH_DEPLOYMENT_URL',
      'Frontend has LangGraph deployment URL configured'
    );
    
    this.validateFileContent(
      'backend/.env.production',
      'LOG_LEVEL',
      'Backend has log level configured'
    );
    
    this.validateFileContent(
      'backend/.env.production',
      'NODE_ENV=production',
      'Backend production environment configured'
    );
  }

  validateTypeDefinitions() {
    this.log('Validating TypeScript type definitions');
    
    // Type definition files
    this.validateFile('frontend/types/agent-stream-types.ts', 'Agent stream type definitions');
    this.validateFile('frontend/types/agent-run-types.ts', 'Agent run type definitions');
    
    // Check for key type definitions
    this.validateFileContent(
      'frontend/types/agent-stream-types.ts',
      'TradeInfo',
      'TradeInfo interface defined'
    );
    
    this.validateFileContent(
      'frontend/types/agent-stream-types.ts',
      'AgentEvent',
      'AgentEvent interface defined'
    );
    
    // Backend type definitions
    this.validateFileContent(
      'backend/src/polytrader/state.py',
      'TradeDecision',
      'TradeDecision model defined'
    );
    
    this.validateFileContent(
      'backend/src/polytrader/state.py',
      'field_validator',
      'Field validation implemented'
    );
  }

  validateDocumentation() {
    this.log('Validating documentation and setup guides');
    
    // Documentation files
    this.validateFile('README.md', 'Main README file');
    this.validateFile('SETUP_GUIDE.md', 'Setup guide');
    this.validateFile('PRODUCTION_READY_SUMMARY.md', 'Production readiness summary');
    
    // Check for key documentation sections
    this.validateFileContent(
      'PRODUCTION_READY_SUMMARY.md',
      'Production Readiness Checklist',
      'Production readiness checklist documented'
    );
    
    this.validateFileContent(
      'PRODUCTION_READY_SUMMARY.md',
      'Error Handling',
      'Error handling documentation included'
    );
  }

  generateReport() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = passed + failed;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('PRODUCTION SETUP VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Checks: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('🎉 All validation checks passed! Production setup is complete.');
    } else if (failed <= 2) {
      console.log('⚠️  Minor issues detected. Review failed checks.');
    } else {
      console.log('❌ Multiple issues detected. Address failed checks before deployment.');
    }

    // List failed checks
    const failedChecks = this.results.filter(r => r.status === 'fail');
    if (failedChecks.length > 0) {
      console.log('\nFailed Checks:');
      failedChecks.forEach(check => {
        console.log(`  - ${check.message}`);
      });
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, successRate },
      details: this.results
    };

    fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed report saved to validation-report.json');
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.runValidation().catch(console.error);
}

module.exports = ProductionValidator;
