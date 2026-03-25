const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

console.log('[v0] Starting deployment to main branch...');

try {
  // Change to project directory
  process.chdir(projectRoot);
  
  // Check git status
  console.log('[v0] Checking git status...');
  const status = execSync('git status --short').toString();
  console.log('[v0] Git status:', status);
  
  // Add all changes
  console.log('[v0] Adding all changes...');
  execSync('git add -A');
  
  // Commit changes
  console.log('[v0] Committing changes...');
  const commitMsg = 'feat: Add forgot password functionality to login page\n\nChanges:\n- Added "Forgot Password?" link to login page\n- Created forgot password page with email input\n- Created reset password confirmation page\n- Added backend functions: sendPasswordResetEmail() and resetPassword()\n- Added CSS styles for error and success messages\n- Added UI functions for password reset flow';
  
  execSync(`git commit -m "${commitMsg.split('\n')[0]}"`);
  
  // Push to main branch
  console.log('[v0] Pushing to main branch...');
  execSync('git push origin main');
  
  console.log('[v0] ✅ Successfully deployed to main branch!');
  
} catch (error) {
  console.error('[v0] Deployment error:', error.message);
  process.exit(1);
}
