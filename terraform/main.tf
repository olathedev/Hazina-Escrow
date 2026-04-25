module "networking" {
  source       = "./modules/networking"
  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

module "storage" {
  source          = "./modules/storage"
  project_name    = var.project_name
  environment     = var.environment
  vpc_id          = module.networking.vpc_id
  private_subnets = module.networking.private_subnets
}

module "compute" {
  source              = "./modules/compute"
  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  public_subnets      = module.networking.public_subnets
  private_subnets     = module.networking.private_subnets
  file_system_id      = module.storage.file_system_id
  anthropic_api_key   = var.anthropic_api_key
  escrow_wallet       = var.escrow_wallet
  agent_wallet_secret = var.agent_wallet_secret
  escrow_contract_id  = var.escrow_contract_id
}

module "frontend" {
  source       = "./modules/frontend"
  project_name = var.project_name
  environment  = var.environment
}
