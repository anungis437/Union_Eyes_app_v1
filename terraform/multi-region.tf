# Union Eyes Multi-Region Infrastructure

Terraform configuration for deploying Union Eyes across multiple AWS regions with automatic failover.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "unioneyes-terraform-state"
    key            = "multi-region/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

# Primary Region (us-east-1)
provider "aws" {
  alias  = "primary"
  region = var.primary_region

  default_tags {
    tags = {
      Project     = "UnionEyes"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = "primary"
    }
  }
}

# Secondary Region (us-west-2)
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region

  default_tags {
    tags = {
      Project     = "UnionEyes"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = "secondary"
    }
  }
}

# Variables
variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS region for failover"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "unioneyes.com"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# Route 53 Hosted Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "unioneyes-hosted-zone"
  }
}

# Health Check for Primary Region
resource "aws_route53_health_check" "primary" {
  fqdn              = "${var.primary_region}.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "primary-health-check"
  }
}

# Primary DNS Record
resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  set_identifier = "primary"
  
  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.primary.id
}

# Secondary DNS Record
resource "aws_route53_record" "secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  set_identifier = "secondary"
  
  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.secondary.dns_name
    zone_id                = aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}

# Application Load Balancer - Primary
resource "aws_lb" "primary" {
  provider           = aws.primary
  name               = "${var.environment}-alb-primary"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_primary.id]
  subnets            = aws_subnet.primary[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "unioneyes-alb-primary"
  }
}

# Application Load Balancer - Secondary
resource "aws_lb" "secondary" {
  provider           = aws.secondary
  name               = "${var.environment}-alb-secondary"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_secondary.id]
  subnets            = aws_subnet.secondary[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "unioneyes-alb-secondary"
  }
}

# RDS Primary Instance
resource "aws_db_instance" "primary" {
  provider               = aws.primary
  identifier             = "unioneyes-${var.environment}-primary"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.r6g.xlarge"
  allocated_storage      = 100
  storage_type           = "gp3"
  iops                   = 3000
  storage_encrypted      = true
  username               = var.db_username
  password               = var.db_password
  multi_az               = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  skip_final_snapshot    = false
  final_snapshot_identifier = "unioneyes-${var.environment}-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "unioneyes-db-primary"
  }
}

# RDS Read Replica (automatically promoted on failover)
resource "aws_db_instance" "replica" {
  provider            = aws.secondary
  identifier          = "unioneyes-${var.environment}-replica"
  replicate_source_db = aws_db_instance.primary.arn
  instance_class      = "db.r6g.xlarge"
  storage_encrypted   = true
  skip_final_snapshot = false
  final_snapshot_identifier = "unioneyes-${var.environment}-replica-final-snapshot"

  tags = {
    Name = "unioneyes-db-replica"
  }
}

# CloudWatch Alarm for failover
resource "aws_cloudwatch_metric_alarm" "primary_health" {
  alarm_name          = "unioneyes-primary-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Alert when primary region becomes unhealthy"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary.id
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "unioneyes-critical-alerts"

  tags = {
    Name = "critical-alerts"
  }
}

# Outputs
output "primary_alb_dns" {
  value       = aws_lb.primary.dns_name
  description = "Primary ALB DNS name"
}

output "secondary_alb_dns" {
  value       = aws_lb.secondary.dns_name
  description = "Secondary ALB DNS name"
}

output "primary_db_endpoint" {
  value       = aws_db_instance.primary.endpoint
  description = "Primary database endpoint"
  sensitive   = true
}

output "replica_db_endpoint" {
  value       = aws_db_instance.replica.endpoint
  description = "Replica database endpoint"
  sensitive   = true
}

output "route53_zone_id" {
  value       = aws_route53_zone.main.zone_id
  description = "Route 53 hosted zone ID"
}
