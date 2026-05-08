provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      MainEnv     = var.main_env
      Environment = var.environment
      ManagedBy   = "terraform"
      Workspace   = "sandbox"
    }
  }
}

# us-east-1 alias is required for ACM certificates that front CloudFront.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      MainEnv     = var.main_env
      Environment = var.environment
      ManagedBy   = "terraform"
      Workspace   = "sandbox"
    }
  }
}
