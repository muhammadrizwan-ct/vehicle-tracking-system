#!/bin/bash

# Deploy to main branch
cd /vercel/share/v0-project

# Configure git
git config user.email "v0-deploy@vercel.com"
git config user.name "v0 Deployer"

# Add changes
git add -A

# Commit with message
git commit -m "feat: Add forgot password functionality to login page

- Added 'Forgot Password?' link to login form
- Created forgot password page with email input
- Created reset password confirmation page
- Added password reset functions to auth.js (sendPasswordResetEmail, resetPassword)
- Added UI functions for password reset flow (showForgotPasswordPage, sendPasswordResetEmail, confirmPasswordReset, backToLogin)
- Added CSS styles for error and success messages
- Integrated with Supabase authentication for secure password reset"

# Push to main
git push origin main

echo "✅ Deployment to main branch completed successfully!"
