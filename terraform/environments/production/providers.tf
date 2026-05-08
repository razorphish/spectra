provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      MainEnv     = "prod"
      Environment = var.environment
      ManagedBy   = "terraform"
      Workspace   = "production"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      MainEnv     = "prod"
      Environment = var.environment
      ManagedBy   = "terraform"
      Workspace   = "production"
    }
  }
}
