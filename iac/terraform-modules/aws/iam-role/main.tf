resource "aws_iam_role" "this" {
  name                 = var.role_name
  assume_role_policy   = var.assume_role_policy_json
  permissions_boundary = var.permissions_boundary_arn
  tags                 = var.common_tags
}

resource "aws_iam_role_policy" "inline" {
  count  = var.inline_policy_json == null ? 0 : 1
  name   = var.inline_policy_name
  role   = aws_iam_role.this.id
  policy = var.inline_policy_json
}
