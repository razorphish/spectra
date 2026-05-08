terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }

  backend "s3" {
    # All other backend args (bucket, key, region, encrypt, dynamodb_table)
    # come from `terraform init -backend-config=...` so the same root can
    # serve every sandbox stage label. See scripts/ci/apply-terraform.sh.
  }
}
