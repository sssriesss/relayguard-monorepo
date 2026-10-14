resource "aws_sns_topic" "this" {
  name              = var.topic_name
  kms_master_key_id = var.kms_master_key_id
  tags              = var.common_tags
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.email_endpoint == null ? 0 : 1
  topic_arn = aws_sns_topic.this.arn
  protocol  = "email"
  endpoint  = var.email_endpoint
}
