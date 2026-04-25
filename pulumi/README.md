# Hazina Escrow Infrastructure (Pulumi)

This directory contains Pulumi scripts to deploy the Hazina Escrow project on AWS using TypeScript.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) installed.
- Node.js and npm installed.
- AWS CLI configured with credentials.

## Deployment

1. **Install dependencies**:
   ```bash
   cd pulumi
   npm install
   ```

2. **Create a new stack** (e.g., dev):
   ```bash
   pulumi stack init dev
   ```

3. **Set required configuration**:
   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set anthropicApiKey your-key --secret
   pulumi config set escrowWallet G...
   pulumi config set agentWalletSecret S... --secret
   pulumi config set escrowContractId C...
   ```

4. **Deploy the infrastructure**:
   ```bash
   pulumi up
   ```

## Post-Deployment

Similar to the Terraform setup, you will need to:
1. Build and push the Docker image to the ECR repository provided in the outputs.
2. Build and sync the frontend assets to the S3 bucket provided in the outputs.

## Clean Up

To destroy the infrastructure:
```bash
pulumi destroy
```
