resource "aws_cloudwatch_metric_alarm" "visible" {
  for_each = var.queue_alarms

  alarm_name          = "${each.value.queue_name}-not-empty"
  alarm_description   = each.value.description
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = each.value.queue_name }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alarm_topic_arn]
  tags                = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "oldest" {
  for_each = { for key, value in var.queue_alarms : key => value if value.max_age_seconds != null }

  alarm_name          = "${each.value.queue_name}-age"
  alarm_description   = "The oldest message exceeded ${each.value.max_age_seconds} seconds."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  dimensions          = { QueueName = each.value.queue_name }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  comparison_operator = "GreaterThanThreshold"
  threshold           = each.value.max_age_seconds
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alarm_topic_arn]
  tags                = var.common_tags
}
