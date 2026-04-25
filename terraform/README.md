# Hazina Escrow Infrastructure

This directory contains Terraform scripts to deploy the Hazina Escrow project on AWS.

## Architecture

- **Networking**: VPC with public and private subnets across two AZs.
- **Storage**: AWS EFS for persistent JSON storage (datasets and transactions).
- **Compute**: ECS Fargate for the backend API.
- **Frontend**: S3 bucket for static hosting with CloudFront as CDN.
- **Security**: IAM roles, security groups, and encryption for EFS.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed.
- AWS CLI configured with appropriate credentials.
- An Anthropic API Key.
- Stellar wallets for escrow and agent.

## Deployment

1. **Initialize Terraform**:
   ```bash
   terraform init
   ```

2. **Create a `terraform.tfvars` file**:
   ```hcl
   aws_region          = "us-east-1"
   project_name        = "hazina-escrow"
   environment         = "dev"
   anthropic_api_key   = "your-api-key"
   escrow_wallet       = "G..."
   agent_wallet_secret = "S..."
   escrow_contract_id  = "C..."
   ```

3. **Plan the deployment**:
   ```bash
   terraform plan
   ```

4. **Apply the changes**:
   ```bash
   terraform apply
   ```

## Post-Deployment

1. **Push the Docker image**:
   - Get the ECR repository URL from the outputs.
   - Build and push your backend image:
     ```bash
     aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ECR_REPO_URL>
     docker build -t hazina-backend ./backend
     docker tag hazina-backend:latest <ECR_REPO_URL>:latest
     docker push <ECR_REPO_URL>:latest
     ```

2. **Deploy the Frontend**:
   - Build the frontend:
     ```bash
     cd frontend && npm run build
     ```
   - Sync with S3:
     ```bash
     aws s3 sync frontend/dist/ s3://<S3_BUCKET_NAME>
     ```
   - Invalidate CloudFront cache if needed.

## Clean Up

To destroy the infrastructure:
```bash
terraform destroy
```
