variable "project_name" {}
variable "environment" {}
variable "vpc_id" {}
variable "private_subnets" {
  type = list(string)
}

resource "aws_efs_file_system" "main" {
  creation_token = "${var.project_name}-efs"
  encrypted      = true

  tags = {
    Name = "${var.project_name}-efs"
  }
}

resource "aws_efs_mount_target" "main" {
  count           = length(var.private_subnets)
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = var.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

resource "aws_security_group" "efs" {
  name        = "${var.project_name}-efs-sg"
  description = "Allow EFS traffic from ECS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Narrow this down in production to VPC CIDR or ECS SG
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "file_system_id" {
  value = aws_efs_file_system.main.id
}
