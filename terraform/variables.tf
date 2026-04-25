variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "hazina-escrow"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Backend Environment Variables
variable "anthropic_api_key" {
  description = "Anthropic API Key"
  type        = string
  sensitive   = true
}

variable "escrow_wallet" {
  description = "Stellar Escrow Wallet address"
  type        = string
}

variable "agent_wallet_secret" {
  description = "Stellar Agent Wallet secret"
  type        = string
  sensitive   = true
}

variable "escrow_contract_id" {
  description = "Soroban Escrow Contract ID"
  type        = string
}
