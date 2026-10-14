output "visible_alarm_arns" {
  value = { for key, alarm in aws_cloudwatch_metric_alarm.visible : key => alarm.arn }
}

output "oldest_message_alarm_arns" {
  value = { for key, alarm in aws_cloudwatch_metric_alarm.oldest : key => alarm.arn }
}
