resource "aws_cloudwatch_event_bus" "this" {
  name = var.bus_name
  tags = var.common_tags
}

resource "aws_cloudwatch_event_archive" "this" {
  count            = var.archive_retention_days == null ? 0 : 1
  name             = "${var.bus_name}-events"
  event_source_arn = aws_cloudwatch_event_bus.this.arn
  retention_days   = var.archive_retention_days
}
