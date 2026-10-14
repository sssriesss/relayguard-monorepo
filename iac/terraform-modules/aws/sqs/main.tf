resource "aws_sqs_queue" "this" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  sqs_managed_sse_enabled    = true
  redrive_policy = var.dead_letter_target_arn == null ? null : jsonencode({
    deadLetterTargetArn = var.dead_letter_target_arn
    maxReceiveCount     = var.max_receive_count
  })
  tags = var.common_tags
}
