resource "aws_secretsmanager_secret" "this" {
  name                    = var.secret_name
  description             = var.description
  recovery_window_in_days = var.recovery_window_in_days
  tags                    = var.common_tags
}

resource "aws_secretsmanager_secret_version" "this" {
  count = var.secret_string == null ? 0 : 1

  secret_id     = aws_secretsmanager_secret.this.id
  secret_string = var.secret_string
}
