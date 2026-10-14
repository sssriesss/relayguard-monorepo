resource "aws_ssm_parameter" "this" {
  for_each = var.parameters
  name     = "${var.path_prefix}/${each.key}"
  type     = "String"
  value    = each.value
  tags     = var.common_tags
}
