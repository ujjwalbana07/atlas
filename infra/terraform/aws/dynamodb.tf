resource "aws_dynamodb_table" "atlas_balances" {
  name           = "atlas_balances"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "account_id"

  attribute {
    name = "account_id"
    type = "S"
  }

  tags = {
    Environment = var.env
    Project     = "ATLAS"
  }
}

resource "aws_dynamodb_table" "atlas_orders" {
  name           = "atlas_orders"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }

  tags = {
    Environment = var.env
    Project     = "ATLAS"
  }
}

resource "aws_dynamodb_table" "atlas_idempotency" {
  name           = "atlas_idempotency"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "request_id"

  attribute {
    name = "request_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Environment = var.env
    Project     = "ATLAS"
  }
}
