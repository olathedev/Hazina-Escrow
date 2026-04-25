output "backend_alb_dns" {
  value = module.compute.alb_dns_name
}

output "frontend_url" {
  value = module.frontend.frontend_url
}

output "s3_bucket_name" {
  value = module.frontend.s3_bucket_name
}

output "ecr_repository_url" {
  value = module.compute.ecr_repository_url
}
