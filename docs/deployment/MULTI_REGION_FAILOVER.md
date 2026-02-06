# Multi-Region Failover Configuration

Complete guide for deploying Union Eyes in multiple AWS regions with automatic failover.

## Architecture Overview

```
                    ┌─────────────────┐
                    │  Route 53 DNS   │
                    │  Health Checks  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌────────▼────────┐
    │   US-EAST-1       │         │   US-WEST-2     │
    │   (Primary)       │         │   (Secondary)   │
    └───────────────────┘         └─────────────────┘
```

## Prerequisites

- AWS Account with appropriate IAM permissions
- AWS CLI configured
- Terraform or CloudFormation CLI
- SSL certificates in ACM (both regions)

## Infrastructure Components

### 1. Route 53 Configuration

**Health Checks:**
```json
{
  "Type": "HTTPS",
  "ResourcePath": "/api/health",
  "FullyQualifiedDomainName": "unioneyes.com",
  "Port": 443,
  "RequestInterval": 30,
  "FailureThreshold": 3
}
```

**DNS Record Sets:**
```json
[
  {
    "Name": "unioneyes.com",
    "Type": "A",
    "SetIdentifier": "us-east-1",
    "Failover": "PRIMARY",
    "AliasTarget": {
      "HostedZoneId": "Z1234567890ABC",
      "DNSName": "us-east-1.elb.amazonaws.com",
      "EvaluateTargetHealth": true
    },
    "HealthCheckId": "abc123-health-check"
  },
  {
    "Name": "unioneyes.com",
    "Type": "A",
    "SetIdentifier": "us-west-2",
    "Failover": "SECONDARY",
    "AliasTarget": {
      "HostedZoneId": "Z0987654321XYZ",
      "DNSName": "us-west-2.elb.amazonaws.com",
      "EvaluateTargetHealth": true
    }
  }
]
```

### 2. RDS Multi-Region Setup

**Primary Database (us-east-1):**
```bash
aws rds create-db-instance \
  --db-instance-identifier unioneyes-prod-primary \
  --db-instance-class db.r6g.xlarge \
  --engine postgres \
  --engine-version 16.1 \
  --master-username admin \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --backup-retention-period 7 \
  --region us-east-1
```

**Read Replica (us-west-2):**
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier unioneyes-prod-replica-west \
  --source-db-instance-identifier unioneyes-prod-primary \
  --db-instance-class db.r6g.xlarge \
  --region us-west-2
```

**Promote to Standalone (Failover):**
```bash
aws rds promote-read-replica \
  --db-instance-identifier unioneyes-prod-replica-west \
  --region us-west-2
```

### 3. S3 Cross-Region Replication

**Create buckets:**
```bash
# Primary bucket (us-east-1)
aws s3 mb s3://unioneyes-assets-east --region us-east-1

# Replica bucket (us-west-2)
aws s3 mb s3://unioneyes-assets-west --region us-west-2
```

**Enable versioning:**
```bash
aws s3api put-bucket-versioning \
  --bucket unioneyes-assets-east \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket unioneyes-assets-west \
  --versioning-configuration Status=Enabled
```

**Setup replication:**
```json
{
  "Role": "arn:aws:iam::123456789:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::unioneyes-assets-west",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

### 4. ElastiCache Redis (Global Datastore)

**Primary Cluster (us-east-1):**
```bash
aws elasticache create-replication-group \
  --replication-group-id unioneyes-redis-primary \
  --replication-group-description "Union Eyes Redis Primary" \
  --engine redis \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --region us-east-1
```

**Global Datastore:**
```bash
aws elasticache create-global-replication-group \
  --global-replication-group-id-suffix unioneyes-global \
  --primary-replication-group-id unioneyes-redis-primary \
  --region us-east-1

aws elasticache create-replication-group \
  --replication-group-id unioneyes-redis-west \
  --replication-group-description "Union Eyes Redis West" \
  --global-replication-group-id unioneyes-global \
  --region us-west-2
```

## Terraform Configuration

```hcl
# terraform/multi-region/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary Region Provider
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

# Secondary Region Provider
provider "aws" {
  alias  = "secondary"
  region = "us-west-2"
}

# Route 53 Hosted Zone
resource "aws_route53_zone" "main" {
  name = "unioneyes.com"
}

# Health Check for Primary Region
resource "aws_route53_health_check" "primary" {
  fqdn              = "us-east-1.unioneyes.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "primary-health-check"
  }
}

# Primary Region A Record
resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "unioneyes.com"
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

# Secondary Region A Record
resource "aws_route53_record" "secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "unioneyes.com"
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

# Application Load Balancer (Primary)
resource "aws_lb" "primary" {
  provider = aws.primary
  name     = "unioneyes-alb-primary"
  internal = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_primary.id]
  subnets            = aws_subnet.primary[*].id

  tags = {
    Environment = "production"
    Region      = "primary"
  }
}

# Application Load Balancer (Secondary)
resource "aws_lb" "secondary" {
  provider = aws.secondary
  name     = "unioneyes-alb-secondary"
  internal = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_secondary.id]
  subnets            = aws_subnet.secondary[*].id

  tags = {
    Environment = "production"
    Region      = "secondary"
  }
}

# RDS Primary Instance
resource "aws_db_instance" "primary" {
  provider               = aws.primary
  identifier             = "unioneyes-prod-primary"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.r6g.xlarge"
  allocated_storage      = 100
  storage_type           = "gp3"
  username               = var.db_username
  password               = var.db_password
  multi_az               = true
  backup_retention_period = 7
}

# RDS Read Replica (Secondary Region)
resource "aws_db_instance" "replica" {
  provider             = aws.secondary
  identifier           = "unioneyes-prod-replica"
  replicate_source_db  = aws_db_instance.primary.arn
  instance_class       = "db.r6g.xlarge"
}
```

## Deployment Commands

```bash
# Initialize Terraform
cd terraform/multi-region
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply configuration
terraform apply tfplan

# Verify deployment
terraform show
```

## Failover Procedures

### Automatic Failover (Route 53)
1. Route 53 health checks detect failure in primary region
2. DNS automatically routes traffic to secondary region
3. TTL ensures quick propagation (60 seconds)

### Manual Failover
```bash
# 1. Promote RDS replica to primary
aws rds promote-read-replica \
  --db-instance-identifier unioneyes-prod-replica \
  --region us-west-2

# 2. Update Route 53 to point to secondary
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://failover-dns.json

# 3. Update application config
export DATABASE_URL="postgresql://admin:$DB_PASSWORD@unioneyes-prod-replica.us-west-2.rds.amazonaws.com:5432/unioneyes"
export REDIS_URL="redis://unioneyes-redis-west.cache.amazonaws.com:6379"

# 4. Restart application
kubectl rollout restart deployment/unioneyes-app -n production
```

## Monitoring & Alerts

**CloudWatch Alarms:**
```bash
# Create alarm for primary region health
aws cloudwatch put-metric-alarm \
  --alarm-name unioneyes-primary-health \
  --alarm-description "Alert when primary region is unhealthy" \
  --metric-name HealthCheckStatus \
  --namespace AWS/Route53 \
  --statistic Minimum \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:critical-alerts
```

## Testing Failover

```bash
# Simulate primary region failure
aws route53 update-health-check \
  --health-check-id $HEALTH_CHECK_ID \
  --disabled

# Wait for failover (~2 minutes)
sleep 120

# Verify traffic is routing to secondary
dig unioneyes.com

# Re-enable primary
aws route53 update-health-check \
  --health-check-id $HEALTH_CHECK_ID \
  --no-disabled
```

## Cost Optimization

- Use reserved instances for predictable workloads
- Enable RDS snapshot sharing between regions
- Use S3 Intelligent-Tiering for cost-effective storage
- Implement CloudWatch dashboards for resource utilization

## Recovery Time Objectives (RTO)

- **Automatic Failover (Route 53):** < 2 minutes
- **RDS Replica Promotion:** 5-10 minutes
- **Manual Intervention:** 15-30 minutes
- **Full Region Recovery:** 1-2 hours

## Recovery Point Objectives (RPO)

- **Database Replication Lag:** < 5 seconds
- **S3 Replication:** < 15 minutes
- **Redis Global Datastore:** < 1 second
