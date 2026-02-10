resource "aws_iam_role" "atlas_service_role" {
  name = "atlas-service-role-${var.env}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com" # Simplified for demo, really depends on where it runs
        }
      },
    ]
  })
}

resource "aws_iam_policy" "atlas_policy" {
  name        = "atlas-policy-${var.env}"
  description = "Permissions for ATLAS services to access DynamoDB and S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = "*" # Should be scoped in production
      },
      {
        Action = [
          "s3:PutObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.audit_bucket.arn}/*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "atlas_attach" {
  role       = aws_iam_role.atlas_service_role.name
  policy_arn = aws_iam_policy.atlas_policy.arn
}
