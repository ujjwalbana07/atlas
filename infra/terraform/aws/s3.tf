resource "aws_s3_bucket" "audit_bucket" {
  bucket = "atlas-audit-${var.env}"

  tags = {
    Environment = var.env
    Project     = "ATLAS"
  }
}

resource "aws_s3_bucket_public_access_block" "audit_bucket_block" {
  bucket = aws_s3_bucket.audit_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
